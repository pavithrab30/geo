"""
Geometry processing service.

Handles:
- Reading Shapefiles and KML files via GeoPandas
- Geometry validation, repair and quality classification
- Measurement calculation (area, perimeter, length) in projected CRS
- Storing results to the database
"""
import json
import logging
import zipfile
from pathlib import Path
from typing import Dict, Optional, Tuple

import geopandas as gpd
import shapely
from shapely.geometry import (
    GeometryCollection,
    LineString,
    MultiLineString,
    MultiPoint,
    MultiPolygon,
    Point,
    Polygon,
    mapping,
)
try:
    from shapely import make_valid  # Shapely 2.x
except ImportError:
    from shapely.ops import make_valid  # Shapely 1.x fallback
from sqlalchemy.orm import Session

from app.config import settings
from app.models import GeoFeature, GeoFile, GeometryQuality, GeometryType, Measurement, FileStatus
from app.services.crs_service import get_utm_crs_for_geodataframe, get_source_and_measurement_crs

logger = logging.getLogger(__name__)

# Supported geometry base types
SUPPORTED_TYPES = {
    "Point", "MultiPoint",
    "LineString", "MultiLineString",
    "Polygon", "MultiPolygon",
}

POLYGON_TYPES = {"Polygon", "MultiPolygon"}
LINE_TYPES = {"LineString", "MultiLineString"}
POINT_TYPES = {"Point", "MultiPoint"}


def classify_geometry_type(geom_type: str) -> GeometryType:
    mapping_table = {
        "Point": GeometryType.POINT,
        "MultiPoint": GeometryType.MULTIPOINT,
        "LineString": GeometryType.LINESTRING,
        "MultiLineString": GeometryType.MULTILINESTRING,
        "Polygon": GeometryType.POLYGON,
        "MultiPolygon": GeometryType.MULTIPOLYGON,
    }
    return mapping_table.get(geom_type, GeometryType.UNKNOWN)


def _read_kml(file_path: Path) -> gpd.GeoDataFrame:
    """
    Read a KML file into a GeoDataFrame.

    Strategy (in order):
    1. pyogrio engine  — ships with LIBKML GDAL driver on all platforms
    2. Fiona LIBKML    — available if GDAL was built with LIBKML
    3. Manual XML parse — pure-Python fallback, no GDAL required
    """
    path_str = str(file_path)

    # 1. pyogrio
    try:
        import pyogrio  # noqa: F401
        gdf = gpd.read_file(path_str, engine="pyogrio")
        logger.info("KML read via pyogrio: %d features", len(gdf))
        return gdf
    except Exception as e1:
        logger.warning("pyogrio KML read failed: %s", e1)

    # 2. Fiona LIBKML
    try:
        gdf = gpd.read_file(path_str, driver="LIBKML")
        logger.info("KML read via Fiona LIBKML: %d features", len(gdf))
        return gdf
    except Exception as e2:
        logger.warning("Fiona LIBKML read failed: %s", e2)

    # 3. Pure-Python XML fallback
    logger.info("Falling back to XML KML parser")
    return _parse_kml_xml(file_path)


def _parse_kml_xml(file_path: Path) -> gpd.GeoDataFrame:
    """
    Parse a KML file using stdlib xml.etree.ElementTree.
    Supports Point, LineString and Polygon placemarks.
    Returns a GeoDataFrame in EPSG:4326.
    """
    import xml.etree.ElementTree as ET

    NS = "{http://www.opengis.net/kml/2.2}"
    NS_ALT = "{http://earth.google.com/kml/2.2}"

    def _ns(tag: str, ns: str) -> str:
        return f"{ns}{tag}"

    tree = ET.parse(file_path)
    root = tree.getroot()

    # Try both common KML namespaces
    namespaces = [NS, NS_ALT, ""]

    def find_all(node, tag):
        for ns in namespaces:
            results = node.findall(f".//{ns}{tag}")
            if results:
                return results
        return []

    def get_text(node, tag) -> str:
        for ns in namespaces:
            el = node.find(f".//{ns}{tag}")
            if el is not None and el.text:
                return el.text.strip()
        return ""

    def parse_coords(coord_text: str):
        """Parse 'lon,lat,alt lon,lat,alt ...' into [(lon,lat), ...]"""
        pairs = []
        for token in coord_text.strip().split():
            parts = token.split(",")
            if len(parts) >= 2:
                try:
                    pairs.append((float(parts[0]), float(parts[1])))
                except ValueError:
                    pass
        return pairs

    records = []
    for pm in find_all(root, "Placemark"):
        name = get_text(pm, "name") or ""
        desc = get_text(pm, "description") or ""
        geom = None

        # Point
        pt_coord = get_text(pm, "coordinates")
        if pt_coord and not find_all(pm, "LineString") and not find_all(pm, "Polygon"):
            pts = parse_coords(pt_coord)
            if pts:
                geom = Point(pts[0])

        # LineString
        for ls in find_all(pm, "LineString"):
            coord_text = get_text(ls, "coordinates")
            pts = parse_coords(coord_text)
            if len(pts) >= 2:
                geom = LineString(pts)
                break

        # Polygon
        for poly in find_all(pm, "Polygon"):
            coord_text = get_text(poly, "coordinates")
            pts = parse_coords(coord_text)
            if len(pts) >= 3:
                geom = Polygon(pts)
                break

        if geom is not None:
            records.append({"Name": name, "description": desc, "geometry": geom})

    if not records:
        raise ValueError("No parseable features found in KML file.")

    gdf = gpd.GeoDataFrame(records, crs="EPSG:4326")
    logger.info("KML read via XML fallback: %d features", len(gdf))
    return gdf


def extract_and_read(file_path: Path, file_type: str) -> gpd.GeoDataFrame:
    """
    Read a Shapefile ZIP or KML file into a GeoDataFrame.
    Shapefiles are extracted to a temp directory first.
    """
    if file_type == "shapefile":
        extract_dir = settings.UPLOAD_DIR / f"{file_path.stem}_extracted"
        extract_dir.mkdir(parents=True, exist_ok=True)

        with zipfile.ZipFile(file_path, "r") as zf:
            # Safe extract: only allow expected extensions
            for member in zf.infolist():
                ext = Path(member.filename).suffix.lower()
                dest = extract_dir / Path(member.filename).name  # flatten path
                if ext in {".shp", ".shx", ".dbf", ".prj", ".cpg"}:
                    with zf.open(member) as src, open(dest, "wb") as dst:
                        dst.write(src.read())

        shp_files = list(extract_dir.glob("*.shp"))
        if not shp_files:
            raise ValueError("No .shp file found in the extracted archive.")

        gdf = gpd.read_file(shp_files[0])
    else:  # kml
        gdf = _read_kml(file_path)

    return gdf


def validate_and_repair_geometry(geom) -> Tuple[Optional[object], GeometryQuality]:
    """
    Validate a single Shapely geometry.

    Returns (geometry, quality) where quality is one of:
    - VALID: original geometry is valid
    - REPAIRED: geometry was invalid but successfully repaired
    - EMPTY: geometry is None or empty
    - UNSUPPORTED: geometry type not in SUPPORTED_TYPES
    - FAILED: repair failed or error occurred
    """
    if geom is None or (hasattr(geom, "is_empty") and geom.is_empty):
        return None, GeometryQuality.EMPTY

    geom_type = geom.geom_type
    if geom_type not in SUPPORTED_TYPES:
        return geom, GeometryQuality.UNSUPPORTED

    try:
        if geom.is_valid:
            return geom, GeometryQuality.VALID

        # Attempt repair using make_valid (Shapely 1.8+)
        repaired = make_valid(geom)
        if repaired is None or repaired.is_empty:
            return None, GeometryQuality.FAILED

        # make_valid can return GeometryCollections; extract usable parts
        if isinstance(repaired, GeometryCollection) and repaired.geom_type == "GeometryCollection":
            parts = [g for g in repaired.geoms if g.geom_type in SUPPORTED_TYPES and not g.is_empty]
            if not parts:
                return None, GeometryQuality.FAILED
            # Return first useful part (common for simple polygons)
            repaired = parts[0] if len(parts) == 1 else type(repaired)(parts)

        return repaired, GeometryQuality.REPAIRED

    except Exception as exc:
        logger.warning("Geometry repair failed: %s", exc)
        return None, GeometryQuality.FAILED


def calculate_measurements(
    geom, geom_type: str, gdf_projected: gpd.GeoDataFrame, idx: int
) -> Dict:
    """
    Calculate area, perimeter, length for a projected geometry.
    Points have no measurements.
    """
    result = {"area_m2": None, "perimeter_m": None, "length_m": None}

    # Get the projected geometry at this index
    try:
        proj_geom = gdf_projected.iloc[idx].geometry
        if proj_geom is None or proj_geom.is_empty:
            return result
    except (IndexError, AttributeError):
        return result

    if geom_type in POLYGON_TYPES:
        result["area_m2"] = float(proj_geom.area)
        result["perimeter_m"] = float(proj_geom.length)  # length = perimeter for polygons

    elif geom_type in LINE_TYPES:
        result["length_m"] = float(proj_geom.length)

    # Points: no measurement
    return result


def process_geo_file(db: Session, geo_file: GeoFile) -> None:
    """
    Main processing pipeline:
    1. Read file into GeoDataFrame
    2. Detect CRS, select UTM measurement CRS
    3. Project to measurement CRS
    4. For each feature: validate, repair, extract geometry, calculate measurements
    5. Store everything to DB
    6. Update file status
    """
    file_path = settings.UPLOAD_DIR / geo_file.filename
    logger.info("Processing file: %s (id=%d)", geo_file.filename, geo_file.id)

    # Update status to PROCESSING
    geo_file.status = FileStatus.PROCESSING
    db.commit()

    try:
        gdf = extract_and_read(file_path, geo_file.file_type)
        logger.info("Read %d features from %s", len(gdf), geo_file.filename)

        if gdf.empty:
            geo_file.status = FileStatus.FAILED
            geo_file.error_message = "File contains no features."
            db.commit()
            return

        # CRS handling
        source_crs_str, measurement_crs_str = get_source_and_measurement_crs(gdf)
        geo_file.source_crs = source_crs_str
        geo_file.measurement_crs = measurement_crs_str

        # Reproject to measurement CRS
        measurement_crs = get_utm_crs_for_geodataframe(gdf)
        try:
            if gdf.crs is None:
                gdf = gdf.set_crs(epsg=4326)
            gdf_projected = gdf.to_crs(measurement_crs)
        except Exception as exc:
            logger.warning("CRS projection failed: %s – using original", exc)
            gdf_projected = gdf

        # Reproject to WGS84 for GeoJSON output
        try:
            gdf_wgs84 = gdf.to_crs(epsg=4326) if gdf.crs is not None else gdf
        except Exception:
            gdf_wgs84 = gdf

        # Counters
        point_count = line_count = polygon_count = 0
        total_area = 0.0
        total_length = 0.0
        failed_count = 0
        partial = False

        for idx, row in gdf_wgs84.iterrows():
            int_idx = int(idx)
            try:
                geom = row.geometry
                geom, quality = validate_and_repair_geometry(geom)

                if quality == GeometryQuality.FAILED:
                    failed_count += 1
                    partial = True

                geom_type_str = geom.geom_type if geom is not None else "Unknown"
                geo_type = classify_geometry_type(geom_type_str)

                # Serialize geometry to GeoJSON
                geojson_geom = None
                if geom is not None:
                    try:
                        geojson_geom = json.dumps(mapping(geom))
                    except Exception:
                        geojson_geom = None

                # Properties (exclude geometry column)
                props = {
                    k: v
                    for k, v in row.items()
                    if k != gdf_wgs84.geometry.name and v is not None
                }
                # Convert non-serializable types
                serializable_props = {}
                for k, v in props.items():
                    try:
                        json.dumps(v)
                        serializable_props[k] = v
                    except (TypeError, ValueError):
                        serializable_props[k] = str(v)

                feature = GeoFeature(
                    geo_file_id=geo_file.id,
                    feature_index=int_idx,
                    geometry_type=geo_type,
                    quality=quality,
                    geojson_geometry=geojson_geom,
                    properties=json.dumps(serializable_props),
                )
                db.add(feature)
                db.flush()  # get feature.id

                # Type counting
                if geom_type_str in POINT_TYPES:
                    point_count += 1
                elif geom_type_str in LINE_TYPES:
                    line_count += 1
                elif geom_type_str in POLYGON_TYPES:
                    polygon_count += 1

                # Measurements
                meas = calculate_measurements(geom, geom_type_str, gdf_projected, int_idx)

                measurement = Measurement(
                    geo_file_id=geo_file.id,
                    feature_id=feature.id,
                    geometry_type=geo_type,
                    area_m2=meas["area_m2"],
                    perimeter_m=meas["perimeter_m"],
                    length_m=meas["length_m"],
                )
                db.add(measurement)

                if meas["area_m2"]:
                    total_area += meas["area_m2"]
                if meas["length_m"]:
                    total_length += meas["length_m"]

            except Exception as exc:
                logger.error("Error processing feature at index %d: %s", int_idx, exc)
                failed_count += 1
                partial = True
                continue

        # Update file summary
        total_features = len(gdf)
        geo_file.feature_count = total_features
        geo_file.point_count = point_count
        geo_file.line_count = line_count
        geo_file.polygon_count = polygon_count
        geo_file.total_area_m2 = total_area if total_area > 0 else None
        geo_file.total_length_m = total_length if total_length > 0 else None

        if failed_count == total_features:
            geo_file.status = FileStatus.FAILED
            geo_file.error_message = "All features failed processing."
        elif partial:
            geo_file.status = FileStatus.PARTIALLY_COMPLETED
            geo_file.error_message = f"{failed_count} feature(s) failed processing."
        else:
            geo_file.status = FileStatus.COMPLETED

        db.commit()
        logger.info(
            "Processing complete for file id=%d: status=%s, features=%d",
            geo_file.id, geo_file.status, total_features,
        )

    except Exception as exc:
        logger.exception("Fatal error processing file id=%d: %s", geo_file.id, exc)
        db.rollback()
        geo_file.status = FileStatus.FAILED
        geo_file.error_message = str(exc)
        db.commit()
        raise
