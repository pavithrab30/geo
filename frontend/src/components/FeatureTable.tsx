import { useState } from 'react'
import { useFeatures } from '../hooks/useProcessingData'
import type { GeometryType } from '../types'
import { TableSkeleton } from './Skeleton'

const GEOMETRY_TYPES: GeometryType[] = [
  'Point', 'MultiPoint', 'LineString', 'MultiLineString', 'Polygon', 'MultiPolygon',
]

const QUALITY_STYLE: Record<string, { color: string; bg: string; border: string }> = {
  VALID:       { color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0' },
  REPAIRED:    { color: '#b45309', bg: '#fffbeb', border: '#fde68a' },
  UNSUPPORTED: { color: '#6d28d9', bg: '#f5f3ff', border: '#ddd6fe' },
  EMPTY:       { color: '#475569', bg: '#f8fafc', border: '#e2e8f0' },
  FAILED:      { color: '#b91c1c', bg: '#fef2f2', border: '#fecaca' },
}

const GEOM_STYLE: Record<string, { color: string; bg: string }> = {
  Polygon:         { color: '#1d4ed8', bg: '#eff6ff' },
  MultiPolygon:    { color: '#1e40af', bg: '#dbeafe' },
  LineString:      { color: '#6d28d9', bg: '#f5f3ff' },
  MultiLineString: { color: '#5b21b6', bg: '#ede9fe' },
  Point:           { color: '#c2410c', bg: '#fff7ed' },
  MultiPoint:      { color: '#ea580c', bg: '#ffedd5' },
  Unknown:         { color: '#475569', bg: '#f8fafc' },
}

export function FeatureTable({ fileId }: { fileId: number }) {
  const [page, setPage] = useState(1)
  const [typeFilter, setTypeFilter] = useState<GeometryType | undefined>()
  const PAGE_SIZE = 15

  const { data, isLoading, isError } = useFeatures(fileId, page, PAGE_SIZE, typeFilter)
  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 1

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>

      {/* Filter row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
        <label style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#94a3b8' }}>
          Type
        </label>
        <select
          value={typeFilter ?? 'all'}
          onChange={(e) => { setPage(1); setTypeFilter(e.target.value === 'all' ? undefined : e.target.value as GeometryType) }}
          style={{
            fontSize: '0.8125rem', padding: '0.375rem 0.75rem',
            background: '#fff', border: '1px solid #e2e8f0',
            borderRadius: '0.5rem', color: '#0f172a',
            cursor: 'pointer', outline: 'none',
            fontFamily: 'var(--font-sans)',
          }}
        >
          <option value="all">All types</option>
          {GEOMETRY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        {data && (
          <span className="tabular" style={{ marginLeft: 'auto', fontSize: '0.75rem', color: '#94a3b8' }}>
            {data.total.toLocaleString()} feature{data.total !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {isLoading ? (
        <TableSkeleton cols={4} rows={5} />
      ) : isError || !data ? (
        <div style={{ padding: '0.875rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '0.625rem', fontSize: '0.8125rem', color: '#b91c1c' }}>
          Failed to load features.
        </div>
      ) : data.features.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8', fontSize: '0.875rem' }}>
          No features found.
        </div>
      ) : (
        <div style={{ overflowX: 'auto', borderRadius: '0.75rem', border: '1px solid #e2e8f0' }}>
          <table className="data-table">
            <thead><tr><th>#</th><th>Geometry</th><th>Quality</th><th>Properties</th></tr></thead>
            <tbody>
              {data.features.map((feat) => {
                const props: Record<string, unknown> = feat.properties
                  ? (() => { try { return JSON.parse(feat.properties) } catch { return {} } })()
                  : {}
                const propKeys = Object.keys(props).filter(k => !k.startsWith('_')).slice(0, 3)
                const gs = GEOM_STYLE[feat.geometry_type] ?? GEOM_STYLE['Unknown']
                const qs = QUALITY_STYLE[feat.quality] ?? QUALITY_STYLE['EMPTY']

                return (
                  <tr key={feat.id}>
                    <td>
                      <span className="tabular" style={{ color: '#94a3b8', fontSize: '0.75rem' }}>
                        {feat.feature_index}
                      </span>
                    </td>
                    <td>
                      <span className="badge" style={{ background: gs.bg, color: gs.color, fontSize: '0.6875rem' }}>
                        {feat.geometry_type}
                      </span>
                    </td>
                    <td>
                      <span className="badge" style={{ background: qs.bg, color: qs.color, border: `1px solid ${qs.border}`, fontSize: '0.6875rem' }}>
                        {feat.quality}
                      </span>
                    </td>
                    <td>
                      {propKeys.length === 0 ? (
                        <span style={{ color: '#cbd5e1', fontStyle: 'italic', fontSize: '0.75rem' }}>—</span>
                      ) : (
                        <div style={{ display: 'flex', gap: '0.625rem', flexWrap: 'wrap' }}>
                          {propKeys.map((k) => (
                            <span key={k} style={{ fontSize: '0.75rem' }}>
                              <span style={{ color: '#94a3b8' }}>{k}:</span>{' '}
                              <span style={{ color: '#334155', fontFamily: 'var(--font-mono)' }}>
                                {String(props[k]).slice(0, 28)}
                              </span>
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button className="btn btn-ghost" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>← Prev</button>
          <span className="tabular" style={{ fontSize: '0.8125rem', color: '#94a3b8' }}>{page} / {totalPages}</span>
          <button className="btn btn-ghost" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next →</button>
        </div>
      )}
    </div>
  )
}
