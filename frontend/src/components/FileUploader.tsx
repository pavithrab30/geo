import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import type { FileRejection } from 'react-dropzone'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { AxiosError } from 'axios'
import { uploadFile } from '../services/api'
import { QUERY_KEYS } from '../hooks/useGeoFile'

interface Props {
  onUploaded: (fileId: number) => void
}

const ACCEPTED_TYPES = [
  { ext: '.zip', label: 'Shapefile ZIP' },
  { ext: '.kml', label: 'KML' },
]

export function FileUploader({ onUploaded }: Props) {
  const qc = useQueryClient()
  const [progress, setProgress] = useState(0)
  const [dragError, setDragError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: (file: File) => uploadFile(file, setProgress),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.files })
      onUploaded(data.file_id)
      setProgress(0)
      setDragError(null)
    },
    onError: () => setProgress(0),
  })

  const onDrop = useCallback(
    (accepted: File[], rejected: FileRejection[]) => {
      setDragError(null)
      if (rejected.length > 0) {
        setDragError(rejected[0].errors.map((e) => e.message).join(', '))
        return
      }
      if (accepted.length > 0) mutation.mutate(accepted[0])
    },
    [mutation],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/zip': ['.zip'],
      'application/vnd.google-earth.kml+xml': ['.kml'],
      'application/octet-stream': ['.zip'],
      'text/xml': ['.kml'],
    },
    maxFiles: 1,
    maxSize: 100 * 1024 * 1024,
    multiple: false,
  })

  const apiError =
    mutation.error instanceof Error
      ? ((mutation.error as AxiosError<{ detail?: string }>).response?.data?.detail ?? mutation.error.message)
      : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
      {/* Drop zone */}
      <div
        {...getRootProps()}
        className={`drop-zone${isDragActive ? ' active' : ''}`}
        style={{ pointerEvents: mutation.isPending ? 'none' : undefined, opacity: mutation.isPending ? 0.6 : 1 }}
      >
        <input {...getInputProps()} />

        {/* Upload icon */}
        <div style={{
          width: 48, height: 48, borderRadius: '50%',
          background: 'rgba(59,130,246,0.1)',
          border: '1px solid rgba(59,130,246,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 1rem',
        }}>
          <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="rgba(96,165,250,1)" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
        </div>

        {isDragActive ? (
          <p style={{ color: '#60a5fa', fontWeight: 600, fontSize: '0.9375rem' }}>
            Drop it here
          </p>
        ) : (
          <>
            <p style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.9375rem', marginBottom: '0.375rem' }}>
              Drop your geospatial file here
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', marginBottom: '1rem' }}>
              or click to browse your files
            </p>
          </>
        )}

        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          {ACCEPTED_TYPES.map(({ ext, label }) => (
            <span key={ext} style={{
              padding: '0.2rem 0.6rem',
              background: 'var(--bg-raised)',
              border: '1px solid var(--border)',
              borderRadius: '0.375rem',
              fontSize: '0.6875rem',
              fontWeight: 600,
              color: 'var(--text-muted)',
              letterSpacing: '0.04em',
              fontFamily: 'var(--font-mono)',
            }}>
              {ext}
              <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-sans)', fontWeight: 400, marginLeft: 4 }}>
                {label}
              </span>
            </span>
          ))}
          <span style={{
            padding: '0.2rem 0.6rem',
            background: 'var(--bg-raised)',
            border: '1px solid var(--border)',
            borderRadius: '0.375rem',
            fontSize: '0.6875rem',
            color: 'var(--text-muted)',
          }}>
            max 100 MB
          </span>
        </div>
      </div>

      {/* Progress */}
      {mutation.isPending && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            <span style={{ fontFamily: 'var(--font-sans)' }}>Uploading…</span>
            <span className="tabular" style={{ color: '#60a5fa' }}>{progress}%</span>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {/* Error */}
      {(dragError || apiError) && (
        <div style={{
          padding: '0.75rem 1rem',
          background: 'rgba(239,68,68,0.08)',
          border: '1px solid rgba(239,68,68,0.2)',
          borderRadius: '0.625rem',
          fontSize: '0.8125rem',
          color: '#f87171',
          display: 'flex',
          gap: '0.5rem',
          alignItems: 'flex-start',
        }}>
          <svg width="14" height="14" fill="currentColor" viewBox="0 0 20 20" style={{ flexShrink: 0, marginTop: 1 }}>
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {dragError || apiError}
        </div>
      )}

      {/* Success */}
      {mutation.isSuccess && (
        <div style={{
          padding: '0.75rem 1rem',
          background: 'rgba(34,197,94,0.08)',
          border: '1px solid rgba(34,197,94,0.2)',
          borderRadius: '0.625rem',
          fontSize: '0.8125rem',
          color: '#4ade80',
        }}>
          ✓ {mutation.data.message}
        </div>
      )}
    </div>
  )
}
