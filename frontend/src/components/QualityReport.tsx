import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { useQuality } from '../hooks/useProcessingData'
import { Skeleton } from './Skeleton'

const Q_CONFIG = {
  VALID:       { color: '#16a34a', label: 'Valid',       bg: '#f0fdf4', border: '#bbf7d0', text: '#15803d' },
  REPAIRED:    { color: '#d97706', label: 'Repaired',    bg: '#fffbeb', border: '#fde68a', text: '#b45309' },
  UNSUPPORTED: { color: '#7c3aed', label: 'Unsupported', bg: '#f5f3ff', border: '#ddd6fe', text: '#6d28d9' },
  EMPTY:       { color: '#64748b', label: 'Empty',       bg: '#f8fafc', border: '#e2e8f0', text: '#475569' },
  FAILED:      { color: '#dc2626', label: 'Failed',      bg: '#fef2f2', border: '#fecaca', text: '#b91c1c' },
}

export function QualityReport({ fileId }: { fileId: number }) {
  const { data, isLoading, isError } = useQuality(fileId)

  if (isLoading) return <Skeleton rows={3} />
  if (isError || !data) return (
    <div style={{ padding: '0.875rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '0.625rem', fontSize: '0.8125rem', color: '#b91c1c' }}>
      Failed to load quality report.
    </div>
  )

  const total = data.total_features || 1
  const chartData = Object.entries(Q_CONFIG)
    .map(([key, cfg]) => ({ name: cfg.label, value: data.quality_breakdown[key] ?? 0, color: cfg.color }))
    .filter((d) => d.value > 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {/* Stat tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.5rem' }}>
        {Object.entries(Q_CONFIG).map(([key, cfg]) => {
          const count = data.quality_breakdown[key] ?? 0
          const pct = ((count / total) * 100).toFixed(0)
          return (
            <div key={key} style={{
              padding: '0.875rem 0.5rem',
              background: cfg.bg,
              border: `1px solid ${cfg.border}`,
              borderRadius: '0.75rem',
              textAlign: 'center',
            }}>
              <p className="tabular" style={{ fontSize: '1.5rem', fontWeight: 700, color: cfg.text, lineHeight: 1 }}>
                {count}
              </p>
              <p style={{ fontSize: '0.6875rem', fontWeight: 600, color: cfg.text, marginTop: 4, letterSpacing: '0.03em' }}>
                {cfg.label}
              </p>
              <p style={{ fontSize: '0.625rem', color: '#94a3b8', marginTop: 2, fontFamily: 'var(--font-mono)' }}>
                {pct}%
              </p>
            </div>
          )
        })}
      </div>

      {/* Chart + bar legend */}
      {chartData.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ flex: '0 0 160px', height: 160 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={44}
                  outerRadius={70}
                  dataKey="value"
                  strokeWidth={2}
                  stroke="#fff"
                >
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '0.5rem',
                    fontSize: '0.75rem',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  }}
                  formatter={(value) => [value, 'Features']}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Legend with progress bars */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            {chartData.map((d) => (
              <div key={d.name}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: d.color }} />
                    <span style={{ fontSize: '0.75rem', color: '#475569', fontWeight: 500 }}>{d.name}</span>
                  </div>
                  <span className="tabular" style={{ fontSize: '0.75rem', fontWeight: 700, color: d.color }}>{d.value}</span>
                </div>
                <div className="progress-track">
                  <div style={{
                    height: '100%',
                    width: `${(d.value / total) * 100}%`,
                    background: d.color,
                    borderRadius: 3,
                    transition: 'width 0.6s ease',
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
