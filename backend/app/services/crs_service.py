"""
CRS (Coordinate Reference System) utilities.

Strategy:
- Never calculate measurements in EPSG:4326 (geographic degrees).
- Detect the dataset's centroid longitude/latitude.
- Choose the appropriate UTM zone for that centroid.
- Project geometries to that UTM CRS before measuring.
"""
import logging
from typing import Optional, Tuple

import geopandas as gpd
from pyproj import CRS

logger = logging.getLogger(__name__)


def get_utm_crs_for_geodataframe(gdf: gpd.GeoDataFrame) -> CRS:
    """
    Determine the best UTM CRS for a GeoDataFrame.

    If the GDF is already in a projected CRS, return it as-is (trust the source).
    If geographic (lat/lon), compute the centroid and pick the UTM zone.
    """
    source_crs = gdf.crs
    if source_crs is None:
        logger.warning("No CRS detected; assuming EPSG:4326.")
        source_crs = CRS.from_epsg(4326)

    # If already projected (not geographic), use as-is for measurements
    if not source_crs.is_geographic:
        return source_crs

    # Reproject to WGS84 for centroid calculation
    try:
        gdf_wgs84 = gdf.to_crs(epsg=4326)
        # union_all is GeoPandas 0.14+; fall back to unary_union for older versions
        union = gdf_wgs84.geometry.union_all() if hasattr(gdf_wgs84.geometry, "union_all") else gdf_wgs84.geometry.unary_union
        centroid = union.centroid
        lon, lat = centroid.x, centroid.y
    except Exception as exc:
        logger.warning("Could not compute centroid; defaulting UTM zone 33N. Error: %s", exc)
        lon, lat = 15.0, 48.0  # Central Europe fallback

    utm_crs = _lon_lat_to_utm_crs(lon, lat)
    logger.info("Selected measurement CRS: %s for centroid (%.4f, %.4f)", utm_crs, lon, lat)
    return utm_crs


def _lon_lat_to_utm_crs(lon: float, lat: float) -> CRS:
    """
    Return the UTM CRS for a given longitude/latitude point.
    Uses the standard zone calculation formula.
    """
    zone_number = int((lon + 180) / 6) % 60 + 1
    is_north = lat >= 0
    epsg = 32600 + zone_number if is_north else 32700 + zone_number
    return CRS.from_epsg(epsg)


def crs_to_string(crs: Optional[CRS]) -> Optional[str]:
    """Convert a CRS object to a human-readable EPSG or WKT string."""
    if crs is None:
        return None
    try:
        epsg = crs.to_epsg()
        if epsg:
            return f"EPSG:{epsg}"
        return crs.name or crs.to_wkt()
    except Exception:
        return str(crs)


def get_source_and_measurement_crs(gdf: gpd.GeoDataFrame) -> Tuple[str, str]:
    """
    Return (source_crs_string, measurement_crs_string) for a GeoDataFrame.
    """
    source_crs_str = crs_to_string(gdf.crs) or "Unknown"
    measurement_crs = get_utm_crs_for_geodataframe(gdf)
    measurement_crs_str = crs_to_string(measurement_crs) or "Unknown"
    return source_crs_str, measurement_crs_str
