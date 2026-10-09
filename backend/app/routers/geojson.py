"""
GeoJSON export endpoint.
"""
import json
import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import GeoFeature, GeoFile, GeometryQuality
from app.schemas import GeoJSONResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/files", tags=["geojson"])


@router.get("/{file_id}/geojson/", response_model=GeoJSONResponse)
def get_geojson(file_id: int, db: Session = Depends(get_db)):
    """
    Return all processable features as a GeoJSON FeatureCollection.
    Failed/unsupported/empty features are excluded from the geometry
    but their properties are still included with null geometry.
    """
    geo_file = db.query(GeoFile).filter(GeoFile.id == file_id).first()
    if not geo_file:
        raise HTTPException(status_code=404, detail=f"File with id={file_id} not found.")

    features = (
        db.query(GeoFeature)
        .filter(GeoFeature.geo_file_id == file_id)
        .order_by(GeoFeature.feature_index)
        .all()
    )

    geojson_features = []
    for feat in features:
        # Parse geometry
        geometry = None
        if feat.geojson_geometry:
            try:
                geometry = json.loads(feat.geojson_geometry)
            except (json.JSONDecodeError, ValueError):
                geometry = None

        # Parse properties
        properties = {}
        if feat.properties:
            try:
                properties = json.loads(feat.properties)
            except (json.JSONDecodeError, ValueError):
                properties = {}

        # Add metadata properties
        properties["_feature_id"] = feat.id
        properties["_feature_index"] = feat.feature_index
        properties["_geometry_type"] = feat.geometry_type.value
        properties["_quality"] = feat.quality.value

        geojson_features.append(
            {
                "type": "Feature",
                "id": feat.id,
                "geometry": geometry,
                "properties": properties,
            }
        )

    return GeoJSONResponse(
        type="FeatureCollection",
        features=geojson_features,
        crs={
            "type": "name",
            "properties": {"name": "urn:ogc:def:crs:OGC:1.3:CRS84"},
        },
    )
