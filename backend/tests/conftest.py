"""
Pytest fixtures.

Uses SQLAlchemy StaticPool so all sessions (including background tasks)
share the same in-memory SQLite connection.
"""
import io
import os
import shutil
import tempfile
import zipfile
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# ── Must happen before any app import ────────────────────────────────────────
os.environ["DATABASE_URL"] = "sqlite:///:memory:"

from app.database import Base, get_db  # noqa: E402
from app.main import app               # noqa: E402

TEST_UPLOAD_DIR = Path(tempfile.mkdtemp())


@pytest.fixture(scope="session", autouse=True)
def patch_upload_dir():
    from app import config
    config.settings.UPLOAD_DIR = TEST_UPLOAD_DIR
    TEST_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    yield
    shutil.rmtree(TEST_UPLOAD_DIR, ignore_errors=True)


@pytest.fixture(scope="function")
def db_session():
    """
    Per-test in-memory DB.

    StaticPool ensures every Session (including those opened by
    _process_in_background via SessionLocal) uses the SAME underlying
    SQLite connection, so they all see each other's data.
    """
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    # Patch SessionLocal so background tasks also use this engine
    import app.database as db_mod
    original_session_local = db_mod.SessionLocal
    db_mod.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    Base.metadata.create_all(bind=engine)
    TestSession = sessionmaker(bind=engine)
    session = TestSession()

    yield session

    session.close()
    Base.metadata.drop_all(bind=engine)
    engine.dispose()
    # Restore
    db_mod.SessionLocal = original_session_local


@pytest.fixture(scope="function")
def client(db_session):
    """TestClient with get_db overridden to use the per-test session."""
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app, raise_server_exceptions=True) as c:
        yield c
    app.dependency_overrides.clear()


# ── File factories ────────────────────────────────────────────────────────────

def make_minimal_shapefile_zip() -> bytes:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        zf.writestr("test.shp", b"\x00" * 100)
        zf.writestr("test.shx", b"\x00" * 100)
        zf.writestr("test.dbf", b"\x00" * 100)
    return buf.getvalue()


def make_kml_content() -> bytes:
    return b"""<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Placemark>
    <name>Test Point</name>
    <Point><coordinates>13.4,52.5,0</coordinates></Point>
  </Placemark>
</kml>"""
