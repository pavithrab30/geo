"""Tests for geometry validation and measurement logic."""
import pytest
from shapely.geometry import (
    GeometryCollection, LineString, MultiPolygon, Point, Polygon
)

from app.models import GeometryQuality
from app.services.geometry_service import (
    classify_geometry_type,
    validate_and_repair_geometry,
)
from app.models import GeometryType


class TestValidateAndRepairGeometry:
    def test_valid_polygon(self):
        poly = Polygon([(0, 0), (1, 0), (1, 1), (0, 1)])
        geom, quality = validate_and_repair_geometry(poly)
        assert quality == GeometryQuality.VALID
        assert geom is not None

    def test_none_returns_empty(self):
        geom, quality = validate_and_repair_geometry(None)
        assert quality == GeometryQuality.EMPTY
        assert geom is None

    def test_empty_geometry_returns_empty(self):
        empty = Polygon()
        geom, quality = validate_and_repair_geometry(empty)
        assert quality == GeometryQuality.EMPTY

    def test_invalid_polygon_is_repaired(self):
        # Self-intersecting (bowtie) polygon – invalid
        bowtie = Polygon([(0, 0), (1, 1), (1, 0), (0, 1)])
        assert not bowtie.is_valid
        geom, quality = validate_and_repair_geometry(bowtie)
        assert quality == GeometryQuality.REPAIRED
        assert geom is not None

    def test_valid_point(self):
        pt = Point(1, 2)
        geom, quality = validate_and_repair_geometry(pt)
        assert quality == GeometryQuality.VALID

    def test_valid_linestring(self):
        ls = LineString([(0, 0), (1, 1)])
        geom, quality = validate_and_repair_geometry(ls)
        assert quality == GeometryQuality.VALID

    def test_unsupported_geometry_collection(self):
        # Build a GeometryCollection via WKT (Shapely 2.x compatible)
        import shapely
        gc = shapely.from_wkt("GEOMETRYCOLLECTION(POINT(0 0), LINESTRING(0 0, 1 1))")
        geom, quality = validate_and_repair_geometry(gc)
        assert quality == GeometryQuality.UNSUPPORTED


class TestClassifyGeometryType:
    def test_point(self):
        assert classify_geometry_type("Point") == GeometryType.POINT

    def test_multipolygon(self):
        assert classify_geometry_type("MultiPolygon") == GeometryType.MULTIPOLYGON

    def test_unknown(self):
        assert classify_geometry_type("TIN") == GeometryType.UNKNOWN

    def test_linestring(self):
        assert classify_geometry_type("LineString") == GeometryType.LINESTRING
