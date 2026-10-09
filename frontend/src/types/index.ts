// ── File / Status ────────────────────────────────────────────────────────────

export type FileStatus =
  | 'UPLOADED'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'PARTIALLY_COMPLETED'
  | 'FAILED'

export type GeometryType =
  | 'Point'
  | 'MultiPoint'
  | 'LineString'
  | 'MultiLineString'
  | 'Polygon'
  | 'MultiPolygon'
  | 'Unknown'

export type GeometryQuality = 'VALID' | 'REPAIRED' | 'UNSUPPORTED' | 'EMPTY' | 'FAILED'

// ── API response types ───────────────────────────────────────────────────────

export interface GeoFile {
  id: number
  filename: string
  original_filename: string
  file_type: string
  status: FileStatus
  source_crs: string | null
  measurement_crs: string | null
  feature_count: number
  point_count: number
  line_count: number
  polygon_count: number
  total_area_m2: number | null
  total_length_m: number | null
  error_message: string | null
  created_at: string
  updated_at: string
}

export interface GeoFileListResponse {
  files: GeoFile[]
  total: number
}

export interface UploadResponse {
  message: string
  file_id: number
  filename: string
  status: FileStatus
}

export interface GeoFeature {
  id: number
  geo_file_id: number
  feature_index: number
  geometry_type: GeometryType
  quality: GeometryQuality
  geojson_geometry: string | null
  properties: string | null
}

export interface FeatureListResponse {
  features: GeoFeature[]
  total: number
  page: number
  page_size: number
}

export interface Measurement {
  id: number
  geo_file_id: number
  feature_id: number
  geometry_type: GeometryType
  area_m2: number | null
  perimeter_m: number | null
  length_m: number | null
}

export interface MeasurementListResponse {
  measurements: Measurement[]
  total: number
  page: number
  page_size: number
}

export interface Summary {
  file_id: number
  filename: string
  status: FileStatus
  source_crs: string | null
  measurement_crs: string | null
  feature_count: number
  point_count: number
  line_count: number
  polygon_count: number
  total_area_m2: number | null
  total_length_m: number | null
  created_at: string
}

export interface QualityReport {
  file_id: number
  total_features: number
  valid_count: number
  repaired_count: number
  unsupported_count: number
  empty_count: number
  failed_count: number
  quality_breakdown: Record<string, number>
}

export interface GeoJSONFeature {
  type: 'Feature'
  id: number
  geometry: object | null
  properties: Record<string, unknown>
}

export interface GeoJSONCollection {
  type: 'FeatureCollection'
  features: GeoJSONFeature[]
  crs?: object
}

export interface HealthResponse {
  status: string
  version: string
  database: string
}
