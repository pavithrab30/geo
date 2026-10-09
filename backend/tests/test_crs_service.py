"""Tests for CRS detection and UTM selection."""
import geopandas as gpd
import pytest
from pyproj import CRS
from shapely.geometry import Point, Polygon

from app.services.crs_service import (
    _lon_lat_to_utm_crs,
    crs_to_string,
    get_utm_crs_for_geodataframe,
)


class TestUtmSelection:
    def test_northern_hemisphere(self):
        crs = _lon_lat_to_utm_crs(lon=13.4, lat=52.5)  # Berlin
        assert crs.to_epsg() == 32633  # UTM zone 33N

    def test_southern_hemisphere(self):
        crs = _lon_lat_to_utm_crs(lon=151.2, lat=-33.9)  # Sydney
        assert crs.to_epsg() == 32756  # UTM zone 56S

    def test_new_york(self):
        crs = _lon_lat_to_utm_crs(lon=-74.0, lat=40.7)
        assert crs.to_epsg() == 32618  # UTM zone 18N

    def test_boundary_zone_1(self):
        crs = _lon_lat_to_utm_crs(lon=-179.9, lat=10.0)
        assert crs.to_epsg() == 32601  # Zone 1N


class TestGetUtmCrsForGeoDataFrame:
    def test_geographic_crs_returns_utm(self):
        gdf = gpd.GeoDataFrame(
            {"geometry": [Point(13.4, 52.5)]}, crs="EPSG:4326"
        )
        utm = get_utm_crs_for_geodataframe(gdf)
        assert not utm.is_geographic
        assert utm.to_epsg() == 32633

    def test_projected_crs_returned_as_is(self):
        # Already projected – should return as-is
        gdf = gpd.GeoDataFrame(
            {"geometry": [Point(400000, 5800000)]}, crs="EPSG:32633"
        )
        utm = get_utm_crs_for_geodataframe(gdf)
        assert utm.to_epsg() == 32633

    def test_no_crs_defaults_to_wgs84_path(self):
        gdf = gpd.GeoDataFrame({"geometry": [Point(13.4, 52.5)]})
        # Should not raise
        utm = get_utm_crs_for_geodataframe(gdf)
        assert utm is not None


class TestCrsToString:
    def test_epsg_4326(self):
        crs = CRS.from_epsg(4326)
        result = crs_to_string(crs)
        assert result == "EPSG:4326"

    def test_none_returns_none(self):
        assert crs_to_string(None) is None
