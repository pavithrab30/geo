"""Quick smoke-test that all sample files are readable by GeoPandas."""
import geopandas as gpd
import zipfile
import tempfile
import pathlib

BASE = pathlib.Path(__file__).parent / "sample_data"

# ── Shapefile ────────────────────────────────────────────────────────────────
with zipfile.ZipFile(BASE / "sample_shapefile.zip") as zf:
    tmp = pathlib.Path(tempfile.mkdtemp())
    zf.extractall(tmp)

gdf = gpd.read_file(list(tmp.glob("*.shp"))[0])
print(f"sample_shapefile.zip : {len(gdf)} features, CRS={gdf.crs}")
print(gdf[["name", "value"]].to_string(index=False))

# ── KML ──────────────────────────────────────────────────────────────────────
gdf2 = gpd.read_file(str(BASE / "sample_points.kml"), engine="pyogrio")
print(f"\nsample_points.kml    : {len(gdf2)} features")
print(gdf2[["Name"]].to_string(index=False))

# ── Invalid geometries ────────────────────────────────────────────────────────
with zipfile.ZipFile(BASE / "sample_invalid_geometries.zip") as zf:
    tmp2 = pathlib.Path(tempfile.mkdtemp())
    zf.extractall(tmp2)

gdf3 = gpd.read_file(list(tmp2.glob("*.shp"))[0])
print(f"\nsample_invalid_geometries.zip : {len(gdf3)} features")
for _, row in gdf3.iterrows():
    print(f"  name={row['name']}  is_valid={row.geometry.is_valid}")

print("\nAll sample files readable OK.")
