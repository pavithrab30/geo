import { useState } from 'react'
import { FileUploader } from '../components/FileUploader'
import { FileSummary } from '../components/FileSummary'
import { FeatureTable } from '../components/FeatureTable'
import { MeasurementTable } from '../components/MeasurementTable'
import { QualityReport } from '../components/QualityReport'
import { GeoMap } from '../components/GeoMap'
import { GeoJSONViewer } from '../components/GeoJSONViewer'
import { StatusBadge } from '../components/StatusBadge'
import { useGeoFile, useFileList } from '../hooks/useGeoFile'

type Tab = 'map' | 'features' | 'measurements' | 'quality' | 'geojson'

const TABS: { id: Tab; icon: string; label: string }[] = [
  { id: 'map',          icon: '⬡', label: 'Map' },
  { id: 'features',     icon: '≡', label: 'Features' },
  { id: 'measurements', icon: '⊡', label: 'Measurements' },
  { id: 'quality',      icon: '◎', label: 'Quality' },
  { id: 'geojson',      icon: '{ }', label: 'GeoJSON' },
]

function ProcessingBanner() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '0.75rem',
      padding: '0.875rem 1rem',
      background: 'rgba(245,158,11,0.06)',
      border: '1px solid rgba(245,158,11,0.2)',
      borderRadius: '0.75rem',
    }}>
      <svg style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }} width="16" height="16" fill="none" viewBox="0 0 24 24">
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <circle cx="12" cy="12" r="10" stroke="rgba(245,158,11,0.3)" strokeWidth="3" />
        <path d="M12 2a10 10 0 010 20" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" />
      </svg>
      <p style={{ fontSize: '0.8125rem', color: '#fbbf24', fontWeight: 500 }}>
        Processing your file — this may take a moment…
      </p>
    </div>
  )
}

function EmptyState() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '4rem 2rem', textAlign: 'center',
      background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '1rem',
      minHeight: 320,
    }}>
      {/* Globe icon */}
      <div style={{
        width: 64, height: 64, borderRadius: '50%',
        background: 'rgba(59,130,246,0.08)',
        border: '1px solid rgba(59,130,246,0.15)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: '1.25rem',
      }}>
        <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="rgba(96,165,250,0.7)" strokeWidth="1.2">
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
        </svg>
      </div>
      <p style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--text-primary)', marginBottom: '0.375rem' }}>
        No file selected
      </p>
      <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', maxWidth: 280, lineHeight: 1.6 }}>
        Upload a Shapefile ZIP or KML to start processing and visualising geospatial data.
      </p>
    </div>
  )
}

function FailedBanner({ message }: { message: string | null }) {
  return (
    <div style={{
      padding: '0.875rem 1rem',
      background: 'rgba(239,68,68,0.06)',
      border: '1px solid rgba(239,68,68,0.2)',
      borderRadius: '0.75rem',
      fontSize: '0.8125rem',
      color: '#f87171',
    }}>
      <strong>Processing failed:</strong> {message || 'An unknown error occurred.'}
    </div>
  )
}

function FileList({
  selectedId,
  onSelect,
}: {
  selectedId: number | null
  onSelect: (id: number) => void
}) {
  const { data } = useFileList()
  if (!data || data.files.length === 0) return (
    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', padding: '0.5rem 0', textAlign: 'center' }}>
      No uploads yet.
    </p>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', maxHeight: 280, overflowY: 'auto', paddingRight: 2 }}>
      {data.files.map((f) => (
        <button
          key={f.id}
          onClick={() => onSelect(f.id)}
          className={`file-item${selectedId === f.id ? ' selected' : ''}`}
          style={{ textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', width: '100%' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <span style={{
              flex: 1, fontSize: '0.8125rem', fontWeight: 500,
              color: 'var(--text-primary)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {f.original_filename}
            </span>
            <StatusBadge status={f.status} />
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <span className="tabular" style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
              {f.feature_count} features
            </span>
            <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
              {new Date(f.created_at).toLocaleDateString()}
            </span>
          </div>
        </button>
      ))}
    </div>
  )
}

export function DashboardPage() {
  const [activeFileId, setActiveFileId] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('map')
  const { data: fileData } = useGeoFile(activeFileId)

  const isProcessing = fileData?.status === 'UPLOADED' || fileData?.status === 'PROCESSING'
  const isReady     = fileData?.status === 'COMPLETED' || fileData?.status === 'PARTIALLY_COMPLETED'
  const isFailed    = fileData?.status === 'FAILED'

  const handleUploaded = (fileId: number) => {
    setActiveFileId(fileId)
    setActiveTab('map')
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg-base)' }}>

      {/* ── Header ── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(255,255,255,0.9)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border)',
        boxShadow: '0 1px 0 rgba(15, 23, 42, 0.04)',
        padding: '0 1.5rem',
      }}>
        <div style={{
          maxWidth: 1400, margin: '0 auto',
          height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <div style={{
              width: 30, height: 30, borderRadius: '0.5rem',
              background: 'linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 12px rgba(59,130,246,0.3)',
            }}>
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
              </svg>
            </div>
            <div>
              <span style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                GeoInsight
              </span>
              <span style={{ marginLeft: 8, fontSize: '0.6875rem', color: 'var(--text-muted)', display: 'none' }}>
                Geospatial Processing
              </span>
            </div>
          </div>

          {/* Right side */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {fileData && <StatusBadge status={fileData.status} />}
            <a
              href="http://localhost:8000/docs"
              target="_blank"
              rel="noreferrer"
              className="btn btn-ghost"
              style={{ fontSize: '0.75rem', padding: '0.375rem 0.75rem' }}
            >
              API docs ↗
            </a>
          </div>
        </div>
      </header>

      {/* ── Body ── */}
      <main style={{ maxWidth: 1400, margin: '0 auto', padding: '1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '1.25rem', alignItems: 'start' }}>

          {/* ── Left panel ── */}
          <aside style={{ display: 'flex', flexDirection: 'column', gap: '1rem', position: 'sticky', top: 72 }}>

            {/* Upload card */}
            <div className="card" style={{ padding: '1.25rem' }}>
              <p style={{
                fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.08em',
                textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.875rem',
              }}>
                Upload
              </p>
              <FileUploader onUploaded={handleUploaded} />
            </div>

            {/* History card */}
            <div className="card" style={{ padding: '1.25rem' }}>
              <p style={{
                fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.08em',
                textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.875rem',
              }}>
                Recent uploads
              </p>
              <FileList selectedId={activeFileId} onSelect={setActiveFileId} />
            </div>

          </aside>

          {/* ── Right panel ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', minWidth: 0 }}>

            {!activeFileId ? (
              <EmptyState />
            ) : (
              <>
                {/* Summary */}
                <div className="card animate-fade-up" style={{ padding: '1.25rem' }}>
                  <p style={{
                    fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.08em',
                    textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.875rem',
                  }}>
                    File summary
                  </p>
                  {isProcessing && <ProcessingBanner />}
                  {!isProcessing && <FileSummary fileId={activeFileId} />}
                </div>

                {isFailed && <FailedBanner message={fileData?.error_message ?? null} />}

                {/* Tabs + content */}
                {isReady && (
                  <div className="card animate-fade-up-delay-1" style={{ overflow: 'hidden' }}>
                    {/* Tab bar */}
                    <div style={{
                      padding: '0.75rem 1rem 0',
                      borderBottom: '1px solid var(--border)',
                    }}>
                      <div className="tab-bar" style={{ maxWidth: 480 }}>
                        {TABS.map((tab) => (
                          <button
                            key={tab.id}
                            className={`tab-item${activeTab === tab.id ? ' active' : ''}`}
                            onClick={() => setActiveTab(tab.id)}
                          >
                            <span style={{ marginRight: 4, fontSize: '0.6875rem', opacity: 0.7 }}>{tab.icon}</span>
                            {tab.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Tab content */}
                    <div style={{ padding: '1.25rem' }}>
                      {activeTab === 'map'          && <GeoMap           fileId={activeFileId} />}
                      {activeTab === 'features'     && <FeatureTable     fileId={activeFileId} />}
                      {activeTab === 'measurements' && <MeasurementTable fileId={activeFileId} />}
                      {activeTab === 'quality'      && <QualityReport    fileId={activeFileId} />}
                      {activeTab === 'geojson'      && <GeoJSONViewer    fileId={activeFileId} />}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

        </div>
      </main>

      {/* ── Footer ── */}
      <footer style={{
        borderTop: '1px solid var(--border)',
        padding: '1.25rem 1.5rem',
        marginTop: '2rem',
        display: 'flex',
        justifyContent: 'center',
        gap: '1.5rem',
      }}>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>GeoInsight v1.0.0</span>
        <a href="http://localhost:8000/docs" target="_blank" rel="noreferrer"
          style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textDecoration: 'none' }}>
          API docs
        </a>
        <a href="http://localhost:8000/health" target="_blank" rel="noreferrer"
          style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textDecoration: 'none' }}>
          Health
        </a>
      </footer>

    </div>
  )
}
