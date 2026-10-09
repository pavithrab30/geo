"""Pydantic schemas for request/response validation."""
from __future__ import annotations
from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel
from app.models import FileStatus, GeometryType, GeometryQuality


# ── File schemas ────────────────────────────────────────────────────────────

class GeoFileBase(BaseModel):
    filename: str
    original_filename: str
    file_type: str
    status: FileStatus
    source_crs: Optional[str] = None
    measurement_crs: Optional[str] = None
    feature_count: int = 0
    point_count: int = 0
    line_count: int = 0
    polygon_count: int = 0
    total_area_m2: Optional[float] = None
    total_length_m: Optional[float] = None
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class GeoFileResponse(GeoFileBase):
    id: int

    class Config:
        from_attributes = True


class GeoFileListResponse(BaseModel):
    files: List[GeoFileResponse]
    total: int


# ── Feature schemas ──────────────────────────────────────────────────────────

class GeoFeatureResponse(BaseModel):
    id: int
    geo_file_id: int
    feature_index: int
    geometry_type: GeometryType
    quality: GeometryQuality
    geojson_geometry: Optional[str] = None
    properties: Optional[str] = None

    class Config:
        from_attributes = True


class FeatureListResponse(BaseModel):
    features: List[GeoFeatureResponse]
    total: int
    page: int
    page_size: int


# ── Measurement schemas ──────────────────────────────────────────────────────

class MeasurementResponse(BaseModel):
    id: int
    geo_file_id: int
    feature_id: int
    geometry_type: GeometryType
    area_m2: Optional[float] = None
    perimeter_m: Optional[float] = None
    length_m: Optional[float] = None

    class Config:
        from_attributes = True


class MeasurementListResponse(BaseModel):
    measurements: List[MeasurementResponse]
    total: int
    page: int
    page_size: int


# ── Summary schema ───────────────────────────────────────────────────────────

class SummaryResponse(BaseModel):
    file_id: int
    filename: str
    status: FileStatus
    source_crs: Optional[str]
    measurement_crs: Optional[str]
    feature_count: int
    point_count: int
    line_count: int
    polygon_count: int
    total_area_m2: Optional[float]
    total_length_m: Optional[float]
    created_at: datetime


# ── Quality report schema ────────────────────────────────────────────────────

class QualityReportResponse(BaseModel):
    file_id: int
    total_features: int
    valid_count: int
    repaired_count: int
    unsupported_count: int
    empty_count: int
    failed_count: int
    quality_breakdown: Dict[str, int]


# ── GeoJSON schema ───────────────────────────────────────────────────────────

class GeoJSONResponse(BaseModel):
    type: str = "FeatureCollection"
    features: List[Dict[str, Any]]
    crs: Optional[Dict[str, Any]] = None


# ── Health schema ────────────────────────────────────────────────────────────

class HealthResponse(BaseModel):
    status: str
    version: str
    database: str


# ── Upload response ──────────────────────────────────────────────────────────

class UploadResponse(BaseModel):
    message: str
    file_id: int
    filename: str
    status: FileStatus
