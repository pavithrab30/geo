"""SQLAlchemy ORM models."""
import enum
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Float, DateTime, Enum, ForeignKey, Text, Boolean
)
from sqlalchemy.orm import relationship
from app.database import Base


class FileStatus(str, enum.Enum):
    UPLOADED = "UPLOADED"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    PARTIALLY_COMPLETED = "PARTIALLY_COMPLETED"
    FAILED = "FAILED"


class GeometryType(str, enum.Enum):
    POINT = "Point"
    MULTIPOINT = "MultiPoint"
    LINESTRING = "LineString"
    MULTILINESTRING = "MultiLineString"
    POLYGON = "Polygon"
    MULTIPOLYGON = "MultiPolygon"
    UNKNOWN = "Unknown"


class GeometryQuality(str, enum.Enum):
    VALID = "VALID"
    REPAIRED = "REPAIRED"
    UNSUPPORTED = "UNSUPPORTED"
    EMPTY = "EMPTY"
    FAILED = "FAILED"


class GeoFile(Base):
    __tablename__ = "geo_files"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String(255), nullable=False)
    original_filename = Column(String(255), nullable=False)
    file_type = Column(String(20), nullable=False)  # "shapefile" | "kml"
    status = Column(Enum(FileStatus), default=FileStatus.UPLOADED, nullable=False)
    error_message = Column(Text, nullable=True)

    # CRS info
    source_crs = Column(String(100), nullable=True)
    measurement_crs = Column(String(100), nullable=True)

    # Summary counts
    feature_count = Column(Integer, default=0)
    point_count = Column(Integer, default=0)
    line_count = Column(Integer, default=0)
    polygon_count = Column(Integer, default=0)

    # Aggregate measurements
    total_area_m2 = Column(Float, nullable=True)
    total_length_m = Column(Float, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    features = relationship("GeoFeature", back_populates="geo_file", cascade="all, delete-orphan")
    measurements = relationship("Measurement", back_populates="geo_file", cascade="all, delete-orphan")


class GeoFeature(Base):
    __tablename__ = "geo_features"

    id = Column(Integer, primary_key=True, index=True)
    geo_file_id = Column(Integer, ForeignKey("geo_files.id"), nullable=False)
    feature_index = Column(Integer, nullable=False)  # original index in file

    geometry_type = Column(Enum(GeometryType), nullable=False)
    quality = Column(Enum(GeometryQuality), default=GeometryQuality.VALID)
    geojson_geometry = Column(Text, nullable=True)  # JSON string
    properties = Column(Text, nullable=True)  # JSON string

    geo_file = relationship("GeoFile", back_populates="features")
    measurement = relationship("Measurement", back_populates="feature", uselist=False)


class Measurement(Base):
    __tablename__ = "measurements"

    id = Column(Integer, primary_key=True, index=True)
    geo_file_id = Column(Integer, ForeignKey("geo_files.id"), nullable=False)
    feature_id = Column(Integer, ForeignKey("geo_features.id"), nullable=False, unique=True)

    geometry_type = Column(Enum(GeometryType), nullable=False)
    area_m2 = Column(Float, nullable=True)
    perimeter_m = Column(Float, nullable=True)
    length_m = Column(Float, nullable=True)

    geo_file = relationship("GeoFile", back_populates="measurements")
    feature = relationship("GeoFeature", back_populates="measurement")
