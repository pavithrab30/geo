"""Tests for summary and quality report endpoints."""
from datetime import datetime
from unittest.mock import patch

import pytest

from app.models import GeoFeature, GeoFile, FileStatus, GeometryQuality, GeometryType


def _seed_file(db_session):
    """Create a completed GeoFile with features in the test DB."""
    geo_file = GeoFile(
        filename="test_abc.zip",
        original_filename="test.zip",
        file_type="shapefile",
        status=FileStatus.COMPLETED,
        source_crs="EPSG:4326",
        measurement_crs="EPSG:32633",
        feature_count=3,
        point_count=1,
        line_count=1,
        polygon_count=1,
        total_area_m2=1000.0,
        total_length_m=50.0,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db_session.add(geo_file)
    db_session.flush()

    features = [
        GeoFeature(
            geo_file_id=geo_file.id,
            feature_index=0,
            geometry_type=GeometryType.POLYGON,
            quality=GeometryQuality.VALID,
        ),
        GeoFeature(
            geo_file_id=geo_file.id,
            feature_index=1,
            geometry_type=GeometryType.LINESTRING,
            quality=GeometryQuality.REPAIRED,
        ),
        GeoFeature(
            geo_file_id=geo_file.id,
            feature_index=2,
            geometry_type=GeometryType.POINT,
            quality=GeometryQuality.FAILED,
        ),
    ]
    for f in features:
        db_session.add(f)
    db_session.commit()
    return geo_file


class TestSummaryEndpoint:
    def test_summary_returns_correct_data(self, client, db_session):
        geo_file = _seed_file(db_session)
        resp = client.get(f"/api/files/{geo_file.id}/summary/")
        assert resp.status_code == 200
        data = resp.json()
        assert data["feature_count"] == 3
        assert data["source_crs"] == "EPSG:4326"
        assert data["measurement_crs"] == "EPSG:32633"
        assert data["total_area_m2"] == 1000.0

    def test_summary_404(self, client):
        resp = client.get("/api/files/9999/summary/")
        assert resp.status_code == 404


class TestQualityEndpoint:
    def test_quality_report(self, client, db_session):
        geo_file = _seed_file(db_session)
        resp = client.get(f"/api/files/{geo_file.id}/quality/")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total_features"] == 3
        assert data["valid_count"] == 1
        assert data["repaired_count"] == 1
        assert data["failed_count"] == 1
        assert data["empty_count"] == 0

    def test_quality_404(self, client):
        resp = client.get("/api/files/9999/quality/")
        assert resp.status_code == 404
