import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { fetchFile, fetchFiles } from '../services/api'
import type { GeoFile } from '../types'

export const QUERY_KEYS = {
  files: ['files'] as const,
  file: (id: number) => ['file', id] as const,
  features: (id: number, page: number, type?: string) => ['features', id, page, type] as const,
  measurements: (id: number, page: number) => ['measurements', id, page] as const,
  summary: (id: number) => ['summary', id] as const,
  quality: (id: number) => ['quality', id] as const,
  geojson: (id: number) => ['geojson', id] as const,
}

/** Fetch a single file, polling every 2s while it is UPLOADED or PROCESSING. */
export function useGeoFile(id: number | null) {
  const qc = useQueryClient()

  const query = useQuery({
    queryKey: QUERY_KEYS.file(id!),
    queryFn: () => fetchFile(id!),
    enabled: id !== null,
    refetchInterval: (query) => {
      const data = query.state.data as GeoFile | undefined
      if (!data) return false
      return data.status === 'UPLOADED' || data.status === 'PROCESSING' ? 2000 : false
    },
  })

  // When status changes to a terminal state, invalidate related queries
  useEffect(() => {
    const status = query.data?.status
    if (status && status !== 'UPLOADED' && status !== 'PROCESSING') {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.summary(id!) })
      qc.invalidateQueries({ queryKey: QUERY_KEYS.quality(id!) })
      qc.invalidateQueries({ queryKey: QUERY_KEYS.geojson(id!) })
    }
  }, [query.data?.status, id, qc])

  return query
}

export function useFileList(skip = 0, limit = 20) {
  return useQuery({
    queryKey: [...QUERY_KEYS.files, skip, limit],
    queryFn: () => fetchFiles(skip, limit),
  })
}
