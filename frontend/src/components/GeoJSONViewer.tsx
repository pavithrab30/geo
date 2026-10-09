import { useState } from 'react'
import { useGeoJSON } from '../hooks/useProcessingData'
import { Skeleton } from './Skeleton'

export function GeoJSONViewer({ fileId }: { fileId: number }) {
  const { data, isLoading, isError } = useGeoJSON(fileId)
  const [collapsed, setCollapsed] = useState(true)
  const [copied, setCopied] = useState(false)

  if (isLoading) return <Skeleton rows={3} />
  if (isError || !data) return (
    <div style={{ padding: '0.875rem', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '0.625rem', fontSize: '0.8125rem', color: '#f87171' }}>
      Failed to load GeoJSON.
    </div>
  )

  const fullJson = JSON.stringify(data, null, 2)
  const preview = collapsed
    ? JSON.stringify({ ...data, features: data.features.slice(0, 2) }, null, 2) +
      (data.features.length > 2 ? '\n  // … and more features' : '')
    : fullJson

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(fullJson)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* ignore */ }
  }

  const handleDownload = () => {
    const blob = new Blob([fullJson], { type: 'application/geo+json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `geoinsight_${fileId}.geojson`
    a.click()
    URL.revokeObjectURL(url)
  }

  const sizeKb = Math.round(fullJson.length / 1024)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span className="tabular" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {data.features.length} features
          </span>
          <span style={{ color: 'var(--border)', fontSize: '0.75rem' }}>·</span>
          <span className="tabular" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {sizeKb} KB
          </span>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-ghost" style={{ fontSize: '0.75rem', padding: '0.375rem 0.75rem' }} onClick={() => setCollapsed((c) => !c)}>
            {collapsed ? 'Expand' : 'Collapse'}
          </button>
          <button className="btn btn-ghost" style={{ fontSize: '0.75rem', padding: '0.375rem 0.75rem' }} onClick={handleCopy}>
            {copied ? '✓ Copied' : 'Copy'}
          </button>
          <button className="btn btn-primary" style={{ fontSize: '0.75rem', padding: '0.375rem 0.75rem' }} onClick={handleDownload}>
            ↓ Download
          </button>
        </div>
      </div>

      {/* Code block */}
      <pre className="json-viewer">{preview}</pre>
    </div>
  )
}
