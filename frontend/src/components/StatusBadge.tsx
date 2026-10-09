import type { FileStatus } from '../types'

const STATUS_CONFIG: Record<FileStatus, { label: string; dot: string; style: React.CSSProperties }> = {
  UPLOADED: {
    label: 'Uploaded',
    dot: '#2563eb',
    style: { background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' },
  },
  PROCESSING: {
    label: 'Processing',
    dot: '#d97706',
    style: { background: '#fffbeb', color: '#b45309', border: '1px solid #fde68a' },
  },
  COMPLETED: {
    label: 'Completed',
    dot: '#16a34a',
    style: { background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0' },
  },
  PARTIALLY_COMPLETED: {
    label: 'Partial',
    dot: '#ea580c',
    style: { background: '#fff7ed', color: '#c2410c', border: '1px solid #fed7aa' },
  },
  FAILED: {
    label: 'Failed',
    dot: '#dc2626',
    style: { background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' },
  },
}

export function StatusBadge({ status }: { status: FileStatus }) {
  const cfg = STATUS_CONFIG[status]
  const isProcessing = status === 'PROCESSING'

  return (
    <span className="badge" style={cfg.style}>
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: cfg.dot,
          display: 'inline-block',
          flexShrink: 0,
          animation: isProcessing ? 'pulse 1.4s ease infinite' : undefined,
        }}
      />
      {cfg.label}
    </span>
  )
}
