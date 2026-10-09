export function Skeleton({ rows = 3, className = '' }: { rows?: number; className?: string }) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="skeleton"
          style={{ height: 40, opacity: 1 - i * 0.15 }}
        />
      ))}
    </div>
  )
}

export function CardSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="skeleton" style={{ height: 88 }} />
      ))}
    </div>
  )
}

export function TableSkeleton({ cols = 4, rows = 5 }: { cols?: number; rows?: number }) {
  return (
    <div>
      <div className="skeleton" style={{ height: 40, marginBottom: 12 }} />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          {Array.from({ length: cols }).map((_, j) => (
            <div key={j} className="skeleton" style={{ height: 36, flex: 1 }} />
          ))}
        </div>
      ))}
    </div>
  )
}
