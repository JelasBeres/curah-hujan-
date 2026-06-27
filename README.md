# Flood Early Warning System — TMA Prediction

Sistem prediksi Tinggi Muka Air (TMA) berbasis *Random Forest Regression* untuk peringatan dini banjir di Pos Duga Air Batu Beulah, Bogor.

## Arsitektur

```
┌─────────────────────────────────────────────────────┐
│                    Browser                           │
└──────────┬──────────────────────────────┬────────────┘
           │ http                         │ http
           ▼                              ▼
┌──────────────────────┐      ┌────────────────────────┐
│   Next.js 15 (App    │      │  FastAPI ML Service     │
│   Router + SSR)      │      │  (Python, scikit-learn) │
│                      │ ◄────│                         │
│   localhost:3000     │  API │  localhost:8000          │
└──────────┬───────────┘      └────────────────────────┘
           │
           │ Drizzle ORM
           ▼
┌──────────────────────┐
│   Neon PostgreSQL    │
│   (Serverless)       │
└──────────────────────┘
```

## Struktur Projek

```
flood-early-warning/
├── apps/
│   ├── web/                # Next.js 15 frontend + API routes
│   │   └── src/
│   │       ├── app/
│   │       │   ├── admin/      # 7 halaman admin (dilindungi middleware)
│   │       │   ├── login/      # Login admin
│   │       │   ├── status/     # Status publik
│   │       │   ├── grafik/     # Grafik publik
│   │       │   ├── informasi/  # Informasi publik
│   │       │   └── api/        # API routes
│   │       ├── db/             # Drizzle schema, seed, migrations
│   │       ├── lib/            # Utils, rate limiting, validasi
│   │       └── components/     # Shared components
│   └── ml-service/         # FastAPI ML prediction service
│       └── app/
│           ├── main.py         # Endpoints (/predict, /train, /health)
│           └── services.py     # ModelService, rating curve, feature building
├── data/
│   ├── raw/                # PDF sumber
│   ├── interim/            # Hasil ekstraksi CSV
│   └── processed/          # Dataset final + split
├── ml/
│   └── artifacts/          # Model .joblib, metadata JSON
├── scripts/                # ETL pipeline + training
│   ├── extract_tma_pdf.py
│   ├── extract_rainfall_pdf.py
│   ├── validate_extraction.py
│   ├── build_dataset.py
│   └── train_model.py
└── packages/
    └── database/           # Shared Drizzle schema
```

## Teknologi

| Lapisan | Teknologi |
|---------|-----------|
| Frontend | Next.js 15 (App Router), React 19, TypeScript strict |
| Styling | Tailwind CSS 4 |
| Grafik | Recharts |
| Form | React Hook Form + Zod |
| Database | Neon PostgreSQL (serverless) |
| ORM | Drizzle ORM |
| Auth | Auth.js v5, bcrypt, HTTP-only cookie session |
| ML Service | FastAPI, scikit-learn, pandas, NumPy, joblib |
| Rating Curve | Q = 20.268 × (H + 0.15)^2.157 |

## Model Machine Learning

- **Algoritma**: Random Forest Regressor
- **Hyperparameter**: n_estimators=300, max_depth=25, min_samples_split=5, min_samples_leaf=2
- **Fitur**: 31 fitur (lag TMA 1–24 jam, lag curah hujan 1–24 jam, TMA rolling mean 3/12/24, rainfall rolling sum 3/12/24, sinusoidal jam, debit air, interaksi TMA-rainfall, TMA²)
- **Target**: TMA 1 jam ke depan
- **Split**: Chronological (70% train, 15% validation, 15% test)
- **CV**: TimeSeriesSplit (5-fold)
- **Test Metrics**: MAE=0.096m, RMSE=0.214m, R²=0.79

### Feature Importance

Top 5 fitur:
1. `tma_lag_1` (TMA 1 jam sebelumnya)
2. `tma_lag_2` (TMA 2 jam sebelumnya)
3. `tma_rolling_mean_12` (Rata-rata TMA 12 jam)
4. `tma_lag_3` (TMA 3 jam sebelumnya)
5. `tma_lag_4` (TMA 4 jam sebelumnya)

## API Endpoints

### ML Service (localhost:8000)

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/health` | Health check |
| POST | `/predict` | Prediksi TMA (body: array TMA 24 jam + rainfall 24 jam) |
| POST | `/train` | Melatih ulang model (body: CSV training data) |
| GET | `/model/metrics` | Metrik evaluasi model |
| GET | `/discharge/{tma}` | Hitung debit dari rating curve |

### Next.js API Routes (localhost:3000/api)

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/dashboard` | Data dashboard (TMA terbaru, prediksi, grafik) |
| GET/POST | `/hydrology` | CRUD data hidrologi |
| POST | `/hydrology/import` | Import data dari CSV/Excel |
| GET/POST | `/predictions` | CRUD prediksi |
| POST | `/predictions/run` | Jalankan prediksi via ML service |
| GET | `/warnings` | Ambil informasi peringatan |
| POST | `/warnings` | Buat informasi peringatan (admin) |
| GET/POST | `/thresholds` | CRUD threshold peringatan |
| GET | `/model/metrics` | Ambil metrik model dari ML service |

## Halaman

### Public (tanpa login)
1. **Beranda** (`/`) — Informasi umum dan navigasi
2. **Status Terkini** (`/status`) — Status peringatan saat ini, TMA, curah hujan, debit, prediksi
3. **Grafik Hidrologi** (`/grafik`) — Grafik TMA dan curah hujan (7/14/30 hari)
4. **Informasi** (`/informasi`) — Informasi dan peringatan yang dipublikasikan

### Admin (perlu login)
5. **Dashboard** (`/admin`) — Ringkasan data dan grafik
6. **Data Hidrologi** (`/admin/data-hidrologi`) — CRUD dan import data TMA + curah hujan
7. **Prediksi** (`/admin/prediksi`) — Jalankan prediksi dan lihat riwayat
8. **Grafik** (`/admin/grafik`) — Grafik administrasi
9. **Informasi** (`/admin/informasi`) — Kelola informasi dan peringatan
10. **Model** (`/admin/model`) — Lihat metrik dan importance fitur model
11. **Pengaturan Threshold** (`/admin/pengaturan-threshold`) — Atur batas Aman/Siaga/Bahaya

## Instalasi & Menjalankan

### Prasyarat
- Node.js 20+
- Python 3.11+
- PostgreSQL (Neon)

### 1. Clone dan setup environment

```bash
git clone <repo-url>
cd flood-early-warning
cp .env.example .env
```

Isi `.env` dengan kredensial database dan generate `AUTH_SECRET`:

```bash
openssl rand -base64 64
```

### 2. Database

```bash
cd apps/web
npm install
npx drizzle-kit push      # Migrasi schema ke PostgreSQL
npx tsx src/db/seed.ts    # Seed data awal
```

### 3. ML Service

```bash
cd apps/ml-service
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### 4. Web App

```bash
cd apps/web
npm run dev     # http://localhost:3000
```

### 5. Import Data Historis

```bash
# Jalankan ETL pipeline lengkap
cd scripts
python extract_tma_pdf.py
python extract_rainfall_pdf.py
python validate_extraction.py
python build_dataset.py
python train_model.py
```

### 6. Login Admin

Buka `http://localhost:3000/login`
- Email: `admin@example.com`
- Password: `admin123`

## ETL Pipeline

```
PDF TMA (Batubeulah_2024.pdf) ──┐
                                ├──► extract_tma_pdf.py ──► CSV ──┐
PDF Curah Hujan                  │                                │
(ARR-RancaBungur_2024.pdf) ─────┘                                │
                                                                  ├──► build_dataset.py ──► Dataset (4 split CSV)
                                                                  │
                                            rating curve ────────┘
```

## Rating Curve

Debit dihitung otomatis dari TMA menggunakan rumus:

**Q = 20.268 × (H + 0.15)^2.157**

dimana:
- Q = Debit (m³/s)
- H = Tinggi Muka Air (m)

## Threshold Peringatan

| Status | Rentang TMA |
|--------|-------------|
| Aman | TMA ≤ safe_max |
| Siaga | safe_max < TMA ≤ alert_max |
| Bahaya | TMA > danger_min |

Default: safe_max=2.0m, alert_max=3.0m, danger_min=3.0m

## Pengujian

```bash
# ML Service tests
cd apps/ml-service
pytest -v

# Web app type checking
cd apps/web
npm run typecheck
npm run lint
```

## Deployment

### Web App (Vercel)
```bash
cd apps/web
npx vercel deploy
```

### ML Service (Railway / Cloud Run)
```bash
cd apps/ml-service
docker build -t ml-service .
docker run -p 8000:8000 ml-service
```

## Kontribusi

1. Fork repository
2. Buat branch fitur (`git checkout -b feature/amazing-feature`)
3. Commit perubahan (`git commit -m 'feat: add amazing feature'`)
4. Push ke branch (`git push origin feature/amazing-feature`)
5. Buka Pull Request

## Lisensi

Proyek ini dibuat untuk tujuan akademis — Tugas Akhir/Skripsi.
