# GeoInsight API

A full-stack geospatial file processing platform. Upload Shapefiles or KML files, inspect features on an interactive map, review geometry quality, and download processed GeoJSON — all through a clean React dashboard.

---

## Quick Start

### Backend

```bash
cd backend
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS/Linux
source .venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload
```

API available at `http://localhost:8000`  
Swagger docs at `http://localhost:8000/docs`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Dashboard at `http://localhost:5173`

### Docker (optional)

```bash
docker-compose up --build
```

Frontend → `http://localhost:80`  
Backend → `http://localhost:8000`

---

## Project Structure

```
geo/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app + lifespan
│   │   ├── config.py            # Settings from env vars
│   │   ├── database.py          # SQLAlchemy engine + session
│   │   ├── models.py            # ORM: GeoFile, GeoFeature, Measurement
│   │   ├── schemas.py           # Pydantic request/response models
│   │   ├── routers/
│   │   │   ├── files.py         # POST /api/files/, GET /api/files/{id}
│   │   │   ├── features.py      # GET /api/files/{id}/features/
│   │   │   ├── measurements.py  # GET /api/files/{id}/measurements/
│   │   │   ├── summary.py       # GET /api/files/{id}/summary/ + quality/
│   │   │   ├── geojson.py       # GET /api/files/{id}/geojson/
│   │   │   └── health.py        # GET /health
│   │   └── services/
│   │       ├── file_validator.py  # ZIP Slip prevention, format checks
│   │       ├── crs_service.py     # UTM zone selection strategy
│   │       └── geometry_service.py # Read → validate → measure → store
│   ├── tests/                   # pytest test suite (43 tests)
│   ├── generate_sample_data.py  # Creates sample .zip and .kml files
│   └── requirements.txt
│
└── frontend/
    ├── src/
    │   ├── types/index.ts        # All TypeScript interfaces
    │   ├── services/api.ts       # Axios API client
    │   ├── hooks/
    │   │   ├── useGeoFile.ts     # File polling (auto-refetch while PROCESSING)
    │   │   └── useProcessingData.ts  # Summary, quality, features, map
    │   ├── components/
    │   │   ├── FileUploader.tsx   # Drag-and-drop with progress
    │   │   ├── FileSummary.tsx    # Stats cards + CRS info
    │   │   ├── StatusBadge.tsx    # Coloured status pill
    │   │   ├── GeoMap.tsx         # React-Leaflet map + auto fit-bounds
    │   │   ├── GeoJSONViewer.tsx  # Syntax-highlighted + download
    │   │   ├── FeatureTable.tsx   # Paginated + geometry-type filter
    │   │   ├── MeasurementTable.tsx
    │   │   ├── QualityReport.tsx  # Pie chart + stat cards
    │   │   └── Skeleton.tsx       # Loading placeholders
    │   └── pages/DashboardPage.tsx
    └── .env                      # VITE_API_BASE_URL=http://localhost:8000
```

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | API health check |
| `POST` | `/api/files/` | Upload .zip or .kml |
| `GET` | `/api/files/` | List uploaded files |
| `GET` | `/api/files/{id}` | File metadata + status |
| `GET` | `/api/files/{id}/summary/` | Feature counts, CRS, totals |
| `GET` | `/api/files/{id}/features/` | Paginated features + type filter |
| `GET` | `/api/files/{id}/measurements/` | Area, perimeter, length per feature |
| `GET` | `/api/files/{id}/quality/` | VALID / REPAIRED / FAILED breakdown |
| `GET` | `/api/files/{id}/geojson/` | Full GeoJSON FeatureCollection |

### Upload Example

```bash
curl -X POST http://localhost:8000/api/files/ \
  -F "file=@sample_data/sample_shapefile.zip"
```

### Poll status until COMPLETED

```bash
curl http://localhost:8000/api/files/1
```

---

## Processing Flow

```
Upload → Validate (ZIP Slip check, required files) → Save to disk
       → Background task starts
       → Read with GeoPandas (Shapefile or KML)
       → Detect source CRS
       → Select UTM measurement CRS (based on centroid)
       → For each feature:
           ├── Validate geometry (Shapely is_valid)
           ├── Repair if invalid (make_valid)
           ├── Classify quality: VALID / REPAIRED / EMPTY / UNSUPPORTED / FAILED
           ├── Project to UTM CRS
           └── Calculate area, perimeter, or length
       → Store features + measurements to SQLite
       → Update file status: COMPLETED / PARTIALLY_COMPLETED / FAILED
```

---

## CRS Strategy

Measurements are **never calculated in geographic degrees (EPSG:4326)** because a degree of longitude varies in size with latitude, making area/length values meaningless.

Strategy:
1. Detect dataset's source CRS from the file metadata
2. Reproject to WGS84 to compute the dataset centroid `(lon, lat)`
3. Derive UTM zone: `zone = int((lon + 180) / 6) % 60 + 1`
4. Select EPSG: `32600 + zone` (Northern) or `32700 + zone` (Southern)
5. Project geometries to that UTM CRS and measure in metres

This gives accurate SI-unit measurements (m, m², km, km²) appropriate for the dataset's geographic location.

---

## Security

- **ZIP Slip prevention**: every ZIP entry path is normalised and checked for `..` traversal before extraction. Absolute paths are rejected.
- **Dangerous file types**: `.exe`, `.bat`, `.sh`, `.ps1`, `.php` etc. inside ZIPs are rejected.
- **Zip bomb protection**: each ZIP entry checked against a 500 MB size limit.
- **UUID filenames**: uploaded files are stored with UUID-generated names, never the original filename.
- **Content-Type agnostic**: validation is based on file contents, not just MIME type.

---

## Running Tests

```bash
cd backend
.venv\Scripts\activate      # Windows
pytest tests/ -v
```

43 tests covering:
- File validator (ZIP Slip, missing components, dangerous types, KML parsing)
- CRS service (UTM zone selection for multiple hemispheres/zones)
- Geometry service (valid, invalid, repaired, empty, unsupported geometries)
- API endpoints (upload, list, get, summary, quality)
- Health check

---

## Design Decisions

| Decision | Rationale |
|----------|-----------|
| SQLite + SQLAlchemy | Zero-config, sufficient for single-user workloads; swap to PostgreSQL via `DATABASE_URL` env var |
| Background tasks (not Celery) | Keeps deployment simple; upgrade to Celery/Redis for multi-worker production use |
| GeoPandas + Fiona | Industry-standard geospatial stack; Fiona handles format drivers cleanly |
| Shapely `make_valid` | RFC-compliant geometry repair without data loss; handles bowtie polygons, self-intersections |
| TanStack Query | Declarative caching + automatic refetch intervals for polling; much cleaner than raw `useEffect` |
| Tailwind CSS v4 | Minimal config; ships as a Vite plugin — no `tailwind.config.js` needed |
| React-Leaflet | Mature, lightweight, OSM-backed; no API key required |

---

## Generating Sample Data

```bash
cd backend
.venv\Scripts\activate
python generate_sample_data.py
```

Creates:
- `sample_data/sample_shapefile.zip` — 5 polygons over Germany
- `sample_data/sample_points.kml` — 5 German city points
- `sample_data/sample_invalid_geometries.zip` — contains a bowtie polygon to test repair

---

## Future Scope

- PostgreSQL + PostGIS for spatial queries
- Celery + Redis for async processing at scale
- Support for GeoTIFF raster files
- User authentication (JWT)
- File expiry and cleanup
- WebSocket real-time processing updates (replace polling)
- Export to multiple formats (GeoJSON, CSV, KML)
