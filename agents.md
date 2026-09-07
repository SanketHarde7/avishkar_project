# AGENTS.md — Universal Autonomous Coding & Execution Guide
# Project: AIR POLLUTION DETECTOR
# System Architecture: Physics-Informed Neural Network (PINN) + FastAPI + Next.js

---

## 1. System Overview & Operational Constraints

- **Core Mission:** Sparse CPCB station data, satellite imagery (Sentinel-5P), aur weather data (Open-Meteo) ko physics equations (Advection-Diffusion PDE) ke saath fuse karke zero-sensor regions par continuous air quality predict karna.
- **Zero-Cost Mandate:** Kisi bhi paid API, paid cloud service, ya proprietary tile service (e.g., Mapbox token) ka use prohibited hai. Har component 100% free open-source stack par chalega.
- **Production Integrity:** AI agents ko incomplete snippets, placeholder comments (`// TODO`), ya non-functional pseudocode generate karne ki permission nahi hai. Every deliverable must be copy-paste ready.

---

## 2. Functional Agent Roles (Abstract / Model-Agnostic)

Kahi bhi specific LLM ka naam use kiye bina, responsibilities ko 4 functional roles me divide kiya gaya hai:

### Role A: Data Engineering & Pipeline Agent
- **Scope:** Free API extraction (OpenAQ, Open-Meteo, GEE/Sentinel-5P), spatiotemporal alignment, data cleaning, and CSV/Parquet export.
- **Primary Tooling:** Python, `requests`, `pandas`, `geopandas`, `xarray`, `openmeteo-requests`.

### Role B: Physics-ML Core Scientist Agent
- **Scope:** Advection-Diffusion PDE formulation, PINN architecture design, collocation point sampling, training loop with automatic differentiation, validation benchmarking (PINN vs XGBoost/Baseline).
- **Primary Tooling:** PyTorch, DeepXDE, NumPy, Scikit-learn, ONNX.

### Role C: Backend & Inference Serving Agent
- **Scope:** Loading trained weights (`.pt`/`.onnx`), exposing fast spatial query endpoints, simulating temporal advection slices, handling CORS, and packaging for zero-cost deployment[cite: 1].
- **Primary Tooling:** FastAPI, Uvicorn, Pydantic, ONNX Runtime (CPU).

### Role D: Frontend & Visualization Architect Agent
- **Scope:** Map-centric single-page dashboard, CartoDB base tiles, Leaflet/MapLibre integration, interactive inspector sidebar, timeline slider, and judge benchmark modal[cite: 1].
- **Primary Tooling:** Next.js (App Router), TypeScript, Tailwind CSS, Leaflet, Recharts, Lucide Icons.

---

## 3. Global Development Rules for All Agents

1. **Deterministic Contracts:** Frontend aur Backend ke beech contract (JSON schema) strictly defined rahega. Data models me divergence allowed nahi hai.
2. **Strict Typing:** Python scripts me Pydantic/Type Hints aur frontend me zero-`any` TypeScript interfaces enforce honge.
3. **Graceful Degraded States:** Agar live API fail ho ya rate-limit trigger kare, system ko automatically local cached snapshot par fallback karna hoga bina screen crash kiye.
4. **Compute Feasibility:** Heavy model training strictly Colab T4 GPU notebook me hogi; PC aur backend server par sirf lightweight CPU inference (`<100ms`) execute hoga[cite: 1].

---

## 4. Phased Execution Tasks & Direct Prompts

---

### Task 1: Free Data Pipeline (Role A — Data Engineer)
**Context:** Pune target area (Lat: `18.44` to `18.65`, Lon: `73.75` to `73.98`) ke ground sensors aur weather data ko hourly basis par extract aur merge karna[cite: 1].

**Agent Execution Prompt:**
```text
Role: Senior Data Engineer
Task: Create a self-contained Python script `pipeline/fetch_data.py`.

Requirements:
1. OpenAQ API Integration:
   - Query active PM2.5 and PM10 sensors in Pune within bounding box [18.44, 73.75, 18.65, 73.98][cite: 1].
   - Extract: station_id, station_name, lat, lon, parameter, value, timestamp.
   - Handle pagination, rate-limits, and missing readings.
2. Open-Meteo Integration:
   - For each active station coordinate, fetch past 7 days hourly weather:
     `wind_speed_10m`, `wind_direction_10m`, `temperature_2m`, `relative_humidity_2m`.
   - Calculate wind components:
     u = -wind_speed * sin(wind_direction_rad)
     v = -wind_speed * cos(wind_direction_rad)
3. Merging & Export:
   - Spatiotemporally align station pollutants with weather variables on hourly timestamps.
   - Output clean `data/processed_pune_data.csv` with zero NaNs.
Provide fully functional, production-ready Python code with error handling.


Task 2: PINN Core & Benchmark Engine (Role B — ML Scientist)Context: 2D Advection-Diffusion equation solve karna: $\frac{\partial C}{\partial t} + u\frac{\partial C}{\partial x} + v\frac{\partial C}{\partial y} = D\left(\frac{\partial^2 C}{\partial x^2} + \frac{\partial^2 C}{\partial y^2}\right) - kC$[cite: 1].



## Agent Execution Prompt:
Role: Backend API Specialist
Task: Build a production-grade FastAPI application in `backend/main.py`.

Requirements:
1. Environment & Setup:
   - Use `onnxruntime` for CPU inference[cite: 1].
   - Configure CORS for Next.js frontend communication (`*` or localhost:3000)[cite: 1].
2. Endpoints to implement:
   - `GET /api/stations`: Returns live/cached CPCB stations with current AQI and status ('active' | 'hidden_for_validation')[cite: 1].
   - `POST /api/predict/point`: Accepts `{ lat: float, lon: float, timestamp: str }`. Runs ONNX model, returns predicted PM2.5, calculated AQI, distance to nearest physical sensor, and local wind vector.
   - `GET /api/grid/slice?hour_offset=X`: Generates an interpolated 20x20 bounding-box spatial matrix for Pune at time T+X (0, 3, 6, 12, 24h) for heatmap rendering[cite: 1].
   - `GET /api/benchmark`: Returns static JSON from Task 2 comparing PINN MAE vs XGBoost MAE for the judges panel[cite: 1].
3. Fail-Safe:
   - If ONNX model file is not found, fallback smoothly to mathematical analytical dispersion without crashing.
Provide complete file structure including `backend/requirements.txt` and `backend/main.py`.


Task 4: Interactive Web UI & Dashboard (Role D — Frontend Architect)
Context: Next.js 14 App Router, Dark Theme, Leaflet map canvas, real-time point inspector, aur Judges Benchmark visualization[cite: 1].

Agent Execution Prompt:

Role: Senior Frontend Engineer
Task: Implement the core dashboard for Next.js 14 (App Router) in `src/app/page.tsx` and related components.

Requirements:
1. Layout:
   - Top Nav (60px): Title "AIR POLLUTION DETECTOR", City selector (Pune), Live API badge, and "[Validation Experiment]" button[cite: 1].
   - Main View: 70% Left Map Canvas, 30% Right Inspector Sidebar.
   - Bottom Bar: 24-hour timeline forecast slider (0h, +3h, +6h, +12h, +24h)[cite: 1].
2. Map Capabilities (src/components/Map/MapView.tsx):
   - Dynamic import with `ssr: false` to avoid Leaflet window errors.
   - Free CartoDB Dark Matter tile layer.
   - Render CPCB ground station pins (Green/Yellow/Red).
   - Render semi-transparent interpolated grid points representing PINN spatial predictions[cite: 1].
   - When "[Validation Experiment]" is toggled, style withheld stations with dashed grey border and tooltip "Validation Sensor (Unseen by PINN)"[cite: 1].
3. Sidebar & Interactivity (src/components/Sidebar/Inspector.tsx):
   - On map click: Update Lat, Lon, dynamic PM2.5, AQI badge, and "Nearest Sensor: X.X km away".
   - Include atmospheric physics card: wind vectors ($u, v$), velocity, and temperature[cite: 1].
4. Judge Benchmark Component (src/components/Sidebar/JudgeBenchmark.tsx):
   - When validation mode is enabled, display Recharts Bar Chart: PINN (MAE: 13.8) vs Baseline XGBoost (MAE: 27.4)[cite: 1].
Provide fully typed, cleanly decoupled TypeScript/React components with Tailwind CSS.



5. Standardized Inter-Agent Data Contracts
5.1 Station Data Contract (JSON)
{
  "station_id": "PUN_SHIVAJINAGAR",
  "name": "Shivajinagar, Pune",
  "lat": 18.5314,
  "lon": 73.8446,
  "pm25": 94.2,
  "aqi": 172,
  "status": "active"
}


5.2 Point Prediction Contract (JSON)

{
  "lat": 18.5204,
  "lon": 73.8567,
  "predicted_pm25": 86.4,
  "predicted_aqi": 165,
  "nearest_station_km": 4.12,
  "weather": {
    "wind_speed_kmh": 12.5,
    "wind_direction_deg": 245.0,
    "u": -3.14,
    "v": -1.46,
    "temp_c": 28.4
  },
  "physics_metadata": {
    "diffusion_coeff": 0.15,
    "decay_rate": 0.02
  }
}


5.3 Benchmark Comparison Contract (JSON)

{
  "withheld_stations": ["Pashan", "Bhosari"],
  "metrics": [
    { "model": "Persistence (Baseline)", "mae": 38.2, "r2": 0.21 },
    { "model": "Spatial XGBoost", "mae": 26.8, "r2": 0.54 },
    { "model": "PINN (Ours)", "mae": 14.1, "r2": 0.78 }
  ]
}


6. Verification Checklist Before Demonstration


[ ] Zero Paid Keys: Verify code has no Mapbox, Google Cloud, or OpenAI API keys.

[ ] Offline Resilience: If network disconnects, mock datasets render properly without white-screening.


*after deploying*
[ ] Cold Start Preparation: FastAPI backend is warmed up 5 minutes prior to live presentation[cite: 1].

[ ] Validation Story: Ensure the "[Validation Experiment]" toggle clearly conveys how the PINN generalizes over unseen stations to the judges[cite: 1].