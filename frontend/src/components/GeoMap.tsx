import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, GeoJSON as LeafletGeoJSON, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useGeoJSON } from '../hooks/useProcessingData'
import { Skeleton } from './Skeleton'
import type { GeoJSONCollection } from '../types'

import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png'
import iconUrl from 'leaflet/dist/images/marker-icon.png'
import shadowUrl from 'leaflet/dist/images/marker-shadow.png'

delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl
L.Icon.Default.mergeOptions({ iconRetinaUrl, iconUrl, shadowUrl })

const Q_COLORS: Record<string, string> = {
  VALID: '#ef4444', REPAIRED: '#f59e0b',
  UNSUPPORTED: '#8b5cf6', EMPTY: '#64748b', FAILED: '#ef4444',
}

function styleForFeature(feature: { properties?: Record<string, unknown> } | undefined) {
  const q = feature?.properties?._quality as string | undefined
  const t = feature?.properties?._geometry_type as string | undefined
  const color = q ? (Q_COLORS[q] ?? '#3b82f6') : '#3b82f6'
  const isLine = t === 'LineString' || t === 'MultiLineString'
  return isLine
    ? { color, weight: 2.5, opacity: 0.9 }
    : { color, fillColor: color, fillOpacity: 0.15, weight: 1.5 }
}

function onEachFeature(feature: { properties?: Record<string, unknown> }, layer: L.Layer) {
  if (!feature.properties) return
  const props = feature.properties
  const rows = Object.entries(props)
    .filter(([k]) => !k.startsWith('_'))
    .slice(0, 6)
    .map(([k, v]) => `<tr><td style="color:#94a3b8;padding:2px 8px 2px 0;font-size:11px">${k}</td><td style="color:#f1f5f9;font-size:11px;font-family:monospace">${String(v).slice(0, 50)}</td></tr>`)
    .join('')
  const q = props._quality as string
  const t = props._geometry_type as string
  const qColor = Q_COLORS[q] ?? '#64748b'
  layer.bindPopup(`
    <div style="min-width:200px">
      <div style="display:flex;gap:6px;margin-bottom:8px;align-items:center">
        <span style="background:rgba(59,130,246,0.15);color:#60a5fa;padding:2px 7px;border-radius:4px;font-size:10px;font-weight:600">${t}</span>
        <span style="background:${qColor}20;color:${qColor};padding:2px 7px;border-radius:4px;font-size:10px;font-weight:600">${q}</span>
      </div>
      ${rows ? `<table>${rows}</table>` : '<p style="color:#64748b;font-size:11px;margin:0">No properties</p>'}
    </div>
  `)
}

function FitBounds({ geojson }: { geojson: GeoJSONCollection }) {
  const map = useMap()
  const fitted = useRef(false)
  useEffect(() => {
    if (fitted.current || !geojson.features.length) return
    try {
      const layer = L.geoJSON(geojson as unknown as GeoJSON.GeoJsonObject)
      const bounds = layer.getBounds()
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [32, 32], maxZoom: 16 })
        fitted.current = true
      }
    } catch { /* ignore */ }
  }, [geojson, map])
  return null
}

export function GeoMap({ fileId }: { fileId: number }) {
  const { data, isLoading, isError } = useGeoJSON(fileId)

  if (isLoading) return <Skeleton rows={1} className="h-96" />

  if (isError || !data) return (
    <div style={{
      height: 380, display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '0.75rem',
    }}>
      <p style={{ color: '#f87171', fontSize: '0.875rem' }}>Failed to load map data.</p>
    </div>
  )

  const validFeatures = data.features.filter((f) => f.geometry !== null)

  if (validFeatures.length === 0) return (
    <div style={{
      height: 380, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '0.75rem', gap: '0.75rem',
    }}>
      <svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="var(--text-muted)" strokeWidth="1">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
      </svg>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No renderable geometries.</p>
    </div>
  )

  const displayData = { ...data, features: validFeatures }

  return (
    <div style={{ height: 400, borderRadius: '0.75rem', overflow: 'hidden', border: '1px solid var(--border)' }}>
      <MapContainer center={[20, 0]} zoom={2} style={{ height: '100%', width: '100%' }} scrollWheelZoom>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <LeafletGeoJSON
          key={fileId}
          data={displayData as unknown as GeoJSON.GeoJsonObject}
          style={styleForFeature}
          onEachFeature={onEachFeature}
          pointToLayer={(_, latlng) =>
            L.circleMarker(latlng, {
              radius: 7,
              fillColor: '#f97316',
              color: '#fb923c',
              weight: 1.5,
              fillOpacity: 0.85,
            })
          }
        />
        <FitBounds geojson={displayData} />
      </MapContainer>
    </div>
  )
}
