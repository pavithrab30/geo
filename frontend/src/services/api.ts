import axios from 'axios'
import type {
  FeatureListResponse,
  GeoFile,
  GeoFileListResponse,
  GeoJSONCollection,
  GeometryType,
  HealthResponse,
  MeasurementListResponse,
  QualityReport,
  Summary,
  UploadResponse,
} from '../types'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
})

// ── Health ────────────────────────────────────────────────────────────────────

export const fetchHealth = async (): Promise<HealthResponse> => {
  const { data } = await api.get<HealthResponse>('/health')
  return data
}

// ── Files ─────────────────────────────────────────────────────────────────────

export const uploadFile = async (
  file: File,
  onProgress?: (pct: number) => void,
): Promise<UploadResponse> => {
  const form = new FormData()
  form.append('file', file)

  const { data } = await api.post<UploadResponse>('/api/files/', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (evt) => {
      if (evt.total && onProgress) {
        onProgress(Math.round((evt.loaded * 100) / evt.total))
      }
    },
  })
  return data
}

export const fetchFiles = async (skip = 0, limit = 20): Promise<GeoFileListResponse> => {
  const { data } = await api.get<GeoFileListResponse>('/api/files/', {
    params: { skip, limit },
  })
  return data
}

export const fetchFile = async (id: number): Promise<GeoFile> => {
  const { data } = await api.get<GeoFile>(`/api/files/${id}`)
  return data
}

// ── Features ──────────────────────────────────────────────────────────────────

export const fetchFeatures = async (
  fileId: number,
  page = 1,
  pageSize = 20,
  geometryType?: GeometryType,
): Promise<FeatureListResponse> => {
  const { data } = await api.get<FeatureListResponse>(`/api/files/${fileId}/features/`, {
    params: {
      page,
      page_size: pageSize,
      ...(geometryType ? { geometry_type: geometryType } : {}),
    },
  })
  return data
}

// ── Measurements ──────────────────────────────────────────────────────────────

export const fetchMeasurements = async (
  fileId: number,
  page = 1,
  pageSize = 20,
): Promise<MeasurementListResponse> => {
  const { data } = await api.get<MeasurementListResponse>(`/api/files/${fileId}/measurements/`, {
    params: { page, page_size: pageSize },
  })
  return data
}

// ── Summary ───────────────────────────────────────────────────────────────────

export const fetchSummary = async (fileId: number): Promise<Summary> => {
  const { data } = await api.get<Summary>(`/api/files/${fileId}/summary/`)
  return data
}

// ── Quality ───────────────────────────────────────────────────────────────────

export const fetchQuality = async (fileId: number): Promise<QualityReport> => {
  const { data } = await api.get<QualityReport>(`/api/files/${fileId}/quality/`)
  return data
}

// ── GeoJSON ───────────────────────────────────────────────────────────────────

export const fetchGeoJSON = async (fileId: number): Promise<GeoJSONCollection> => {
  const { data } = await api.get<GeoJSONCollection>(`/api/files/${fileId}/geojson/`)
  return data
}
