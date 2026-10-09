"""
Feature listing endpoint with pagination and geometry-type filtering.
"""
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import GeoFeature, GeoFile, GeometryType
from app.schemas import FeatureListResponse, GeoFeatureResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/files", tags=["features"])


@router.get("/{file_id}/features/", response_model=FeatureListResponse)
def get_features(
    file_id: int,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    geometry_type: Optional[GeometryType] = Query(None, description="Filter by geometry type"),
    db: Session = Depends(get_db),
):
    """
    Return paginated features for a file.
    Optionally filter by geometry type (Point, LineString, Polygon, etc.)
    """
    geo_file = db.query(GeoFile).filter(GeoFile.id == file_id).first()
    if not geo_file:
        raise HTTPException(status_code=404, detail=f"File with id={file_id} not found.")

    query = db.query(GeoFeature).filter(GeoFeature.geo_file_id == file_id)

    if geometry_type:
        query = query.filter(GeoFeature.geometry_type == geometry_type)

    total = query.count()
    offset = (page - 1) * page_size
    features = query.order_by(GeoFeature.feature_index).offset(offset).limit(page_size).all()

    return FeatureListResponse(
        features=features,
        total=total,
        page=page,
        page_size=page_size,
    )
