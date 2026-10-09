"""
Sample geospatial data generator.
Generates:
  - sample_shapefile.zip           (5 polygon features over Germany)
  - sample_points.kml              (5 German city points)
  - sample_invalid_geometries.zip  (bowtie polygon to test repair logic)

Run: python generate_sample_data.py
"""
import zipfile
from pathlib import Path

import fiona
import geopandas as gpd
import numpy as np
from shapely.geometry import Point, Polygon, mapping

OUTPUT_DIR = Path(__file__).parent / "sample_data"
OUTPUT_DIR.mkdir(exist_ok=True)


def _write_shapefile(shp_path: Path, schema: dict, crs: str, records: list) -> None:
    """
    Write a Shapefile directly via Fiona, bypassing GeoPandas schema
    inference entirely. This avoids the pandas 3.x StringDtype issue.
    """
    with fiona.open(
        str(shp_path),
        mode="w",
        driver="ESRI Shapefile",
        schema=schema,
        crs=crs,
    ) as dst:
        for rec in records:
            dst.write(rec)


def generate_shapefile_zip() -> Path:
    """5 valid polygon features roughly over Germany."""
    np.random.seed(42)

    schema = {
        "geometry": "Polygon",
        "properties": {"name": "str", "value": "float"},
    }

    records = []
    for i in range(5):
        cx, cy = 10.0 + i * 1.5, 51.0 + i * 0.5
        coords = [
            (cx - 0.1 + float(np.random.uniform(-0.02, 0.02)), cy - 0.1),
            (cx + 0.1 + float(np.random.uniform(-0.02, 0.02)), cy - 0.1),
            (cx + 0.1,  cy + 0.1 + float(np.random.uniform(-0.02, 0.02))),
            (cx - 0.1,  cy + 0.1),
        ]
        poly = Polygon(coords)
        records.append({
            "geometry": mapping(poly),
            "properties": {
                "name": f"Region {i + 1}",
                "value": round(float(np.random.rand() * 1000), 2),
            },
        })

    shp_dir = OUTPUT_DIR / "sample_mixed"
    shp_dir.mkdir(parents=True, exist_ok=True)
    out_shp = shp_dir / "sample_mixed.shp"

    _write_shapefile(out_shp, schema, "EPSG:4326", records)

    zip_path = OUTPUT_DIR / "sample_shapefile.zip"
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for f in shp_dir.glob("sample_mixed.*"):
            zf.write(f, f.name)

    print(f"Created: {zip_path}  ({len(records)} polygons)")
    return zip_path


def generate_kml() -> Path:
    """5 German city points as a KML file."""
    cities = [
        ("Berlin",    13.405,  52.520),
        ("Munich",    11.576,  48.137),
        ("Hamburg",    9.993,  53.550),
        ("Cologne",    6.960,  50.938),
        ("Frankfurt",  8.682,  50.110),
    ]

    lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<kml xmlns="http://www.opengis.net/kml/2.2">',
        "  <Document>",
        "    <name>German Cities</name>",
    ]
    for city, lon, lat in cities:
        lines += [
            "    <Placemark>",
            f"      <name>{city}</name>",
            "      <Point>",
            f"        <coordinates>{lon},{lat},0</coordinates>",
            "      </Point>",
            "    </Placemark>",
        ]
    lines += ["  </Document>", "</kml>"]

    kml_path = OUTPUT_DIR / "sample_points.kml"
    kml_path.write_text("\n".join(lines), encoding="utf-8")
    print(f"Created: {kml_path}  ({len(cities)} points)")
    return kml_path


def generate_invalid_geometries_zip() -> Path:
    """
    Shapefile containing:
      - A self-intersecting bowtie polygon  → backend will REPAIR it
      - A normal valid square               → stays VALID
    Upload this to see the quality repair flow in the dashboard.
    """
    # Bowtie: vertices cross → Shapely reports is_valid == False
    bowtie = Polygon([(0, 0), (1, 1), (1, 0), (0, 1)])
    square = Polygon([(5, 5), (6, 5), (6, 6), (5, 6)])

    schema = {
        "geometry": "Polygon",
        "properties": {"name": "str", "kind": "str"},
    }
    records = [
        {
            "geometry": mapping(bowtie),
            "properties": {"name": "bowtie_invalid", "kind": "invalid"},
        },
        {
            "geometry": mapping(square),
            "properties": {"name": "valid_square", "kind": "valid"},
        },
    ]

    shp_dir = OUTPUT_DIR / "sample_invalid"
    shp_dir.mkdir(parents=True, exist_ok=True)
    out_shp = shp_dir / "sample_invalid.shp"

    _write_shapefile(out_shp, schema, "EPSG:4326", records)

    zip_path = OUTPUT_DIR / "sample_invalid_geometries.zip"
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for f in shp_dir.glob("sample_invalid.*"):
            zf.write(f, f.name)

    print(f"Created: {zip_path}  (1 invalid bowtie + 1 valid square)")
    return zip_path


if __name__ == "__main__":
    print("Generating sample geospatial data...\n")
    generate_shapefile_zip()
    generate_kml()
    generate_invalid_geometries_zip()
    print(f"\nAll files saved to: {OUTPUT_DIR.resolve()}")
    print("\nUpload these to the dashboard at http://localhost:5173")
    print("  Polygons : sample_data/sample_shapefile.zip")
    print("  Points   : sample_data/sample_points.kml")
    print("  Repair   : sample_data/sample_invalid_geometries.zip")
