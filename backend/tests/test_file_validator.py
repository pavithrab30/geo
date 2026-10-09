"""Tests for file validation service."""
import io
import zipfile
from pathlib import Path

import pytest

from app.services.file_validator import validate_zip_shapefile, validate_kml_file


def make_zip(files: dict) -> Path:
    """Helper: create a temp ZIP and return its path."""
    import tempfile
    tmp = tempfile.NamedTemporaryFile(suffix=".zip", delete=False)
    with zipfile.ZipFile(tmp.name, "w") as zf:
        for name, content in files.items():
            zf.writestr(name, content)
    return Path(tmp.name)


class TestZipShapefileValidation:
    def test_valid_shapefile_zip(self, tmp_path):
        zp = make_zip({"a.shp": b"x", "a.shx": b"x", "a.dbf": b"x"})
        valid, msg = validate_zip_shapefile(zp)
        assert valid, msg
        zp.unlink()

    def test_missing_shp(self, tmp_path):
        zp = make_zip({"a.shx": b"x", "a.dbf": b"x"})
        valid, msg = validate_zip_shapefile(zp)
        assert not valid
        assert ".shp" in msg
        zp.unlink()

    def test_missing_shx(self, tmp_path):
        zp = make_zip({"a.shp": b"x", "a.dbf": b"x"})
        valid, msg = validate_zip_shapefile(zp)
        assert not valid
        assert ".shx" in msg
        zp.unlink()

    def test_zip_slip_attack(self, tmp_path):
        zp = make_zip({"../../etc/passwd": b"root:x:0:0", "a.shp": b"x", "a.shx": b"x", "a.dbf": b"x"})
        valid, msg = validate_zip_shapefile(zp)
        assert not valid
        assert "path traversal" in msg.lower() or "security" in msg.lower()
        zp.unlink()

    def test_dangerous_file_type(self, tmp_path):
        zp = make_zip({"a.shp": b"x", "a.shx": b"x", "a.dbf": b"x", "evil.exe": b"MZ"})
        valid, msg = validate_zip_shapefile(zp)
        assert not valid
        assert "dangerous" in msg.lower()
        zp.unlink()

    def test_not_a_zip(self, tmp_path):
        p = tmp_path / "fake.zip"
        p.write_bytes(b"not a zip")
        valid, msg = validate_zip_shapefile(p)
        assert not valid


class TestKmlValidation:
    def test_valid_kml(self, tmp_path):
        p = tmp_path / "test.kml"
        p.write_bytes(
            b"""<?xml version="1.0"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Placemark><Point><coordinates>0,0,0</coordinates></Point></Placemark>
</kml>"""
        )
        valid, msg = validate_kml_file(p)
        assert valid, msg

    def test_invalid_xml(self, tmp_path):
        p = tmp_path / "bad.kml"
        p.write_bytes(b"<kml><unclosed>")
        valid, msg = validate_kml_file(p)
        assert not valid

    def test_non_kml_xml(self, tmp_path):
        p = tmp_path / "other.kml"
        p.write_bytes(b"<?xml version='1.0'?><root><child/></root>")
        valid, msg = validate_kml_file(p)
        assert not valid
        assert "kml" in msg.lower()
