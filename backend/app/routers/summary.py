"""
Summary and quality report endpoints.
"""
import logging
from collections import Counter

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import GeoFeature, GeoFile, GeometryQuality
from app.schemas import QualityReportResponse, SummaryResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/files", tags=["summary"])


@router.get("/{file_id}/summary/", response_model=SummaryResponse)
def get_summary(file_id: int, db: Session = Depends(get_db)):
    """Return a high-level summary for the file."""
    geo_file = db.query(GeoFile).filter(GeoFile.id == file_id).first()
    if not geo_file:
        raise HTTPException(status_code=404, detail=f"File with id={file_id} not found.")

    return SummaryResponse(
        file_id=geo_file.id,
        filename=geo_file.original_filename,
        status=geo_file.status,
        source_crs=geo_file.source_crs,
        measurement_crs=geo_file.measurement_crs,
        feature_count=geo_file.feature_count,
        point_count=geo_file.point_count,
        line_count=geo_file.line_count,
        polygon_count=geo_file.polygon_count,
        total_area_m2=geo_file.total_area_m2,
        total_length_m=geo_file.total_length_m,
        created_at=geo_file.created_at,
    )


@router.get("/{file_id}/quality/", response_model=QualityReportResponse)
def get_quality_report(file_id: int, db: Session = Depends(get_db)):
    """Return geometry quality breakdown for the file."""
    geo_file = db.query(GeoFile).filter(GeoFile.id == file_id).first()
    if not geo_file:
        raise HTTPException(status_code=404, detail=f"File with id={file_id} not found.")

    features = db.query(GeoFeature).filter(GeoFeature.geo_file_id == file_id).all()
    quality_counts = Counter(f.quality.value for f in features)

    return QualityReportResponse(
        file_id=file_id,
        total_features=len(features),
        valid_count=quality_counts.get(GeometryQuality.VALID.value, 0),
        repaired_count=quality_counts.get(GeometryQuality.REPAIRED.value, 0),
        unsupported_count=quality_counts.get(GeometryQuality.UNSUPPORTED.value, 0),
        empty_count=quality_counts.get(GeometryQuality.EMPTY.value, 0),
        failed_count=quality_counts.get(GeometryQuality.FAILED.value, 0),
        quality_breakdown=dict(quality_counts),
    )
