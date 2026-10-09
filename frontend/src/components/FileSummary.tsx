import { useSummary } from '../hooks/useProcessingData'
import { StatusBadge } from './StatusBadge'
import { CardSkeleton } from './Skeleton'

interface Props { fileId: number }

const fmtArea = (m2: number | null) => {
  if (m2 === null) return '—'
  if (m2 >= 1_000_000) return `${(m2 / 1_000_000).toFixed(3)} km²`
  return `${m2.toFixed(1)} m²`
}
const fmtLength = (m: number | null) => {
  if (m === null) return '—'
  if (m >= 1000) return `${(m / 1000).toFixed(3)} km`
  return `${m.toFixed(1)} m`
}

export function FileSummary({ fileId }: Props) {
  const { data, isLoading, isError } = useSummary(fileId)

  if (isLoading) return <CardSkeleton />
  if (isError || !data) return (
    <div style={{ padding: '0.875rem 1rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '0.625rem', fontSize: '0.8125rem', color: '#b91c1c' }}>
      Failed to load summary.
    </div>
  )

  const stats = [
    { label: 'Total features', value: data.feature_count,   color: '#2563eb' },
    { label: 'Polygons',       value: data.polygon_count,   color: '#16a34a' },
    { label: 'Lines',          value: data.line_count,       color: '#7c3aed' },
    { label: 'Points',         value: data.point_count,      color: '#ea580c' },
    { label: 'Total area',     value: fmtArea(data.total_area_m2),     color: '#0891b2',
      sub: data.total_area_m2 ? `${data.total_area_m2.toFixed(0)} m²` : undefined },
    { label: 'Total length',   value: fmtLength(data.total_length_m),  color: '#d97706',
      sub: data.total_length_m ? `${data.total_length_m.toFixed(0)} m` : undefined },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

      {/* File header row */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.875rem',
        padding: '0.875rem 1rem',
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: '0.75rem',
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: '0.5rem', flexShrink: 0,
          background: '#eff6ff', border: '1px solid #bfdbfe',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#2563eb" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
          </svg>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontWeight: 600, fontSize: '0.875rem', color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {data.filename}
          </p>
          <p style={{ fontSize: '0.6875rem', color: '#94a3b8', marginTop: 2 }}>
            {new Date(data.created_at).toLocaleString()}
          </p>
        </div>
        <StatusBadge status={data.status} />
      </div>

      {/* CRS row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem' }}>
        {[
          { label: 'Source CRS',      value: data.source_crs      || '—' },
          { label: 'Measurement CRS', value: data.measurement_crs || '—' },
        ].map(({ label, value }) => (
          <div key={label} style={{ padding: '0.75rem 1rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '0.625rem' }}>
            <p style={{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#94a3b8', marginBottom: 4 }}>
              {label}
            </p>
            <p style={{ fontSize: '0.8125rem', fontFamily: 'var(--font-mono)', fontWeight: 600, color: '#2563eb' }}>
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.625rem' }}>
        {stats.map(({ label, value, color, sub }, i) => (
          <div
            key={label}
            className="stat-card animate-fade-up"
            style={{ '--stat-color': color, animationDelay: `${i * 0.04}s` } as React.CSSProperties}
          >
            <p className="stat-label">{label}</p>
            <p className="stat-value tabular">{value}</p>
            {sub && <p className="stat-sub">{sub}</p>}
          </div>
        ))}
      </div>
    </div>
  )
}
