import { useQuery } from '@tanstack/react-query'
import {
  fetchFeatures,
  fetchGeoJSON,
  fetchMeasurements,
  fetchQuality,
  fetchSummary,
} from '../services/api'
import type { GeometryType } from '../types'
import { QUERY_KEYS } from './useGeoFile'

export function useSummary(fileId: number | null) {
  return useQuery({
    queryKey: QUERY_KEYS.summary(fileId!),
    queryFn: () => fetchSummary(fileId!),
    enabled: fileId !== null,
  })
}

export function useQuality(fileId: number | null) {
  return useQuery({
    queryKey: QUERY_KEYS.quality(fileId!),
    queryFn: () => fetchQuality(fileId!),
    enabled: fileId !== null,
  })
}

export function useGeoJSON(fileId: number | null) {
  return useQuery({
    queryKey: QUERY_KEYS.geojson(fileId!),
    queryFn: () => fetchGeoJSON(fileId!),
    enabled: fileId !== null,
  })
}

export function useFeatures(
  fileId: number | null,
  page: number,
  pageSize: number,
  geometryType?: GeometryType,
) {
  return useQuery({
    queryKey: QUERY_KEYS.features(fileId!, page, geometryType),
    queryFn: () => fetchFeatures(fileId!, page, pageSize, geometryType),
    enabled: fileId !== null,
  })
}

export function useMeasurements(fileId: number | null, page: number, pageSize: number) {
  return useQuery({
    queryKey: QUERY_KEYS.measurements(fileId!, page),
    queryFn: () => fetchMeasurements(fileId!, page, pageSize),
    enabled: fileId !== null,
  })
}
