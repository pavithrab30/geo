"""
File upload and management endpoints.
"""
import json
import logging
import shutil
import uuid
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import GeoFile, FileStatus
from app.schemas import GeoFileResponse, GeoFileListResponse, UploadResponse
from app.services.file_validator import validate_kml_file, validate_zip_shapefile
from app.services.geometry_service import process_geo_file

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/files", tags=["files"])

ALLOWED_CONTENT_TYPES = {
    "application/zip",
    "application/x-zip-compressed",
    "application/octet-stream",
    "application/vnd.google-earth.kml+xml",
    "text/xml",
    "application/xml",
}


@router.post("/", response_model=UploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_file(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """
    Upload a .zip Shapefile or .kml file.
    Validates the file, saves it, and starts background processing.
    """
    original_name = file.filename or "unknown"
    suffix = Path(original_name).suffix.lower()

    if suffix not in {".zip", ".kml"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only .zip (Shapefile) and .kml files are supported.",
        )

    # Check file size
    content = await file.read()
    if len(content) > settings.max_upload_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds maximum allowed size of {settings.MAX_UPLOAD_SIZE_MB} MB.",
        )

    # Generate safe filename
    safe_name = f"{uuid.uuid4().hex}{suffix}"
    save_path = settings.UPLOAD_DIR / safe_name

    # Write to disk
    with open(save_path, "wb") as f:
        f.write(content)

    # Validate contents
    if suffix == ".zip":
        file_type = "shapefile"
        is_valid, error = validate_zip_shapefile(save_path)
    else:
        file_type = "kml"
        is_valid, error = validate_kml_file(save_path)

    if not is_valid:
        save_path.unlink(missing_ok=True)
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=error)

    # Create DB record
    geo_file = GeoFile(
        filename=safe_name,
        original_filename=original_name,
        file_type=file_type,
        status=FileStatus.UPLOADED,
    )
    db.add(geo_file)
    db.commit()
    db.refresh(geo_file)

    logger.info("File uploaded: %s (id=%d)", original_name, geo_file.id)

    # Kick off background processing
    background_tasks.add_task(_process_in_background, geo_file.id)

    return UploadResponse(
        message="File uploaded successfully. Processing started.",
        file_id=geo_file.id,
        filename=original_name,
        status=FileStatus.UPLOADED,
    )


def _process_in_background(file_id: int) -> None:
    """Background task: open a new DB session and process the file."""
    from app.database import SessionLocal  # avoid circular import

    db = SessionLocal()
    try:
        geo_file = db.query(GeoFile).filter(GeoFile.id == file_id).first()
        if geo_file:
            process_geo_file(db, geo_file)
    except Exception as exc:
        logger.exception("Background processing failed for file_id=%d: %s", file_id, exc)
    finally:
        db.close()


@router.get("/", response_model=GeoFileListResponse)
def list_files(
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db),
):
    """List all uploaded files with pagination."""
    total = db.query(GeoFile).count()
    files = db.query(GeoFile).order_by(GeoFile.created_at.desc()).offset(skip).limit(limit).all()
    return GeoFileListResponse(files=files, total=total)


@router.get("/{file_id}", response_model=GeoFileResponse)
def get_file(file_id: int, db: Session = Depends(get_db)):
    """Get file metadata and processing status."""
    geo_file = db.query(GeoFile).filter(GeoFile.id == file_id).first()
    if not geo_file:
        raise HTTPException(status_code=404, detail=f"File with id={file_id} not found.")
    return geo_file
