"""
Measurements endpoint.
"""
import logging

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import GeoFile, Measurement
from app.schemas import MeasurementListResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/files", tags=["measurements"])


@router.get("/{file_id}/measurements/", response_model=MeasurementListResponse)
def get_measurements(
    file_id: int,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """Return paginated measurement records for a file."""
    geo_file = db.query(GeoFile).filter(GeoFile.id == file_id).first()
    if not geo_file:
        raise HTTPException(status_code=404, detail=f"File with id={file_id} not found.")

    query = db.query(Measurement).filter(Measurement.geo_file_id == file_id)
    total = query.count()
    offset = (page - 1) * page_size
    measurements = query.offset(offset).limit(page_size).all()

    return MeasurementListResponse(
        measurements=measurements,
        total=total,
        page=page,
        page_size=page_size,
    )
