"""
Integration tests for the files API endpoints.
Uses mock/patch to skip actual GeoDataFrame processing.
"""
import io
import zipfile
from unittest.mock import patch

import pytest


def _make_zip(include_all=True):
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        zf.writestr("sample.shp", b"\x00" * 50)
        zf.writestr("sample.shx", b"\x00" * 50)
        if include_all:
            zf.writestr("sample.dbf", b"\x00" * 50)
    buf.seek(0)
    return buf.read()


def _make_kml():
    return b"""<?xml version="1.0"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Placemark><Point><coordinates>13.4,52.5,0</coordinates></Point></Placemark>
</kml>"""


class TestUploadEndpoint:
    def test_upload_valid_zip(self, client):
        data = _make_zip()
        with patch("app.routers.files.process_geo_file"):
            resp = client.post(
                "/api/files/",
                files={"file": ("test.zip", data, "application/zip")},
            )
        assert resp.status_code == 201
        body = resp.json()
        assert "file_id" in body
        assert body["status"] == "UPLOADED"

    def test_upload_valid_kml(self, client):
        with patch("app.routers.files.process_geo_file"):
            resp = client.post(
                "/api/files/",
                files={"file": ("test.kml", _make_kml(), "application/xml")},
            )
        assert resp.status_code == 201

    def test_upload_wrong_extension(self, client):
        resp = client.post(
            "/api/files/",
            files={"file": ("data.csv", b"a,b,c", "text/csv")},
        )
        assert resp.status_code == 400

    def test_upload_invalid_zip_missing_dbf(self, client):
        data = _make_zip(include_all=False)
        resp = client.post(
            "/api/files/",
            files={"file": ("test.zip", data, "application/zip")},
        )
        assert resp.status_code == 422

    def test_upload_not_a_zip(self, client):
        resp = client.post(
            "/api/files/",
            files={"file": ("test.zip", b"not a zip file", "application/zip")},
        )
        assert resp.status_code == 422


class TestGetFile:
    def test_get_nonexistent_file(self, client):
        resp = client.get("/api/files/99999")
        assert resp.status_code == 404

    def test_get_file_after_upload(self, client):
        with patch("app.routers.files.process_geo_file"):
            upload = client.post(
                "/api/files/",
                files={"file": ("s.zip", _make_zip(), "application/zip")},
            )
        file_id = upload.json()["file_id"]
        resp = client.get(f"/api/files/{file_id}")
        assert resp.status_code == 200
        assert resp.json()["id"] == file_id


class TestListFiles:
    def test_list_empty(self, client):
        resp = client.get("/api/files/")
        assert resp.status_code == 200
        body = resp.json()
        assert body["total"] == 0
        assert body["files"] == []

    def test_list_after_upload(self, client):
        with patch("app.routers.files.process_geo_file"):
            client.post(
                "/api/files/",
                files={"file": ("s.zip", _make_zip(), "application/zip")},
            )
        resp = client.get("/api/files/")
        assert resp.status_code == 200
        assert resp.json()["total"] >= 1
