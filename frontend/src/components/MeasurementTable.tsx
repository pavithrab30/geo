import { useState } from 'react'
import { useMeasurements } from '../hooks/useProcessingData'
import { TableSkeleton } from './Skeleton'

const fmtArea = (m2: number | null) => {
  if (m2 === null) return '—'
  if (m2 >= 1_000_000) return `${(m2 / 1_000_000).toFixed(4)} km²`
  return `${m2.toFixed(2)} m²`
}
const fmtLen = (m: number | null) => {
  if (m === null) return '—'
  if (m >= 1000) return `${(m / 1000).toFixed(4)} km`
  return `${m.toFixed(2)} m`
}

const GEOM_COLOR: Record<string, string> = {
  Polygon: '#60a5fa', MultiPolygon: '#93c5fd',
  LineString: '#c4b5fd', MultiLineString: '#a78bfa',
  Point: '#fb923c', MultiPoint: '#fdba74', Unknown: '#64748b',
}

export function MeasurementTable({ fileId }: { fileId: number }) {
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 15
  const { data, isLoading, isError } = useMeasurements(fileId, page, PAGE_SIZE)
  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 1

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
      {data && (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <span className="tabular" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {data.total.toLocaleString()} measurement{data.total !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {isLoading ? (
        <TableSkeleton cols={5} rows={5} />
      ) : isError || !data ? (
        <div style={{ padding: '0.875rem', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '0.625rem', fontSize: '0.8125rem', color: '#f87171' }}>
          Failed to load measurements.
        </div>
      ) : data.measurements.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          No measurements available.
        </div>
      ) : (
        <div style={{ overflowX: 'auto', borderRadius: '0.75rem', border: '1px solid var(--border)' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Feature</th>
                <th>Type</th>
                <th>Area</th>
                <th>Perimeter</th>
                <th>Length</th>
              </tr>
            </thead>
            <tbody>
              {data.measurements.map((m) => (
                <tr key={m.id}>
                  <td>
                    <span className="tabular" style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                      #{m.feature_id}
                    </span>
                  </td>
                  <td>
                    <span style={{
                      fontSize: '0.6875rem',
                      fontWeight: 600,
                      color: GEOM_COLOR[m.geometry_type] ?? '#64748b',
                      fontFamily: 'var(--font-mono)',
                    }}>
                      {m.geometry_type}
                    </span>
                  </td>
                  <td className="tabular" style={{ fontSize: '0.8125rem' }}>{fmtArea(m.area_m2)}</td>
                  <td className="tabular" style={{ fontSize: '0.8125rem' }}>{fmtLen(m.perimeter_m)}</td>
                  <td className="tabular" style={{ fontSize: '0.8125rem' }}>{fmtLen(m.length_m)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button className="btn btn-ghost" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
            ← Prev
          </button>
          <span className="tabular" style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            {page} / {totalPages}
          </span>
          <button className="btn btn-ghost" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
            Next →
          </button>
        </div>
      )}
    </div>
  )
}
