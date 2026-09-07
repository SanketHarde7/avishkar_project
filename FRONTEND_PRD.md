# Product Requirement Document (PRD) — Frontend
# Project: AIR POLLUTION DETECTOR (Phase 1: Detection & Validation)
# Target Stack: Next.js 14 (App Router), Tailwind CSS, Leaflet/MapLibre, Recharts, Lucide Icons

---

## 1. Executive Summary & Vision
"AIR POLLUTION DETECTOR" ek research-backed, interactive web platform hai jo Physics-Informed Neural Networks (PINN) ka use karke city-scale par continuous, physically consistent air quality maps render karta hai. 
Standard dashboards sirf sparse government sensors (CPCB) ke static points dikhate hain. Yeh frontend user ko kisi bhi unmonitored mohalle par click karke simulated concentration check karne, wind-driven advection dekhne, aur model ka validation benchmark verify karne ki suvidha deta hai.

---

## 2. Target Audience & Core Use Cases
- **Hackathon Judges / Evaluators:** Model ki mathematical validity, error metrics (MAE/R²), aur sparse-data baseline comparison inspect karna.
- **Urban Planners & Citizens:** Kisi specific street/area ka hyperlocal AQI dekhna jahan koi physical sensor maujood nahi hai.

---

## 3. UI/UX Architecture & Layout
Screen ko ek single-viewport desktop dashboard ki tarah design kiya jayega (No unnecessary vertical scrolling).

### 3.1 Global Top Bar (Height: 60px)
- **Brand Title:** `AIR POLLUTION DETECTOR` (with a clean scientific badge: `PINN Engine v1.0`).
- **City Selector (Dropdown):** Pune (Default), Delhi, Mumbai.
- **Live Pipeline Indicator:** Pulsing green badge indicating API connectivity (`OpenAQ: Connected` | `Open-Meteo: Synced`).
- **Judges Mode Switch:** High-contrast toggle button: `[ Validation Experiment ]`.

### 3.2 Main Layout Grid (Height: calc(100vh - 60px - 70px))
- **Interactive Map Canvas (Left 70% Width):**
  - Base map: CartoDB Dark Matter ya Positron tiles (distraction-free contrast).
  - PINN Heatmap Layer: Semi-transparent interpolated grid surface representing continuous PM2.5 / AQI.
  - CPCB Sensor Markers: Interactive pins showing real ground station locations with click tooltips.
  - Wind Streamlines / Vector Layer: Animated particles displaying wind flow direction and speed.
  - Click Interaction: Map par kahin bhi click karne se ek coordinate pulse marker banega aur Sidebar instantly update hoga.
- **Inspector Sidebar (Right 30% Width, Scrollable if needed):**
  - **Selected Location Card:** Latitude, Longitude, Predicted AQI, PM2.5 ($µg/m^3$), PM10 ($µg/m^3$), Risk Category (Good to Severe).
  - **Zero-Sensor Proof Indicator:** "Nearest physical CPCB station: X.X km away" (proves model is doing spatial inference, not sensor readout).
  - **Atmospheric Physics Card:** Local wind speed ($km/h$), wind bearing, ambient temperature, humidity, calculated atmospheric diffusion coefficient ($D$).
  - **Validation Drawer (Visible when Judge Mode is Active):**
    - Displays metrics comparison: PINN vs XGBoost vs Persistence.
    - Hidden sensors toggle (highlights 2 ground stations withheld during training).
    - Compact Bar Chart showing Mean Absolute Error (MAE) at unseen points.

### 3.3 Bottom Spatiotemporal Timeline (Height: 70px)
- Fixed horizontal slider across the bottom of the map.
- Steps: `Now (0h)`, `+3h`, `+6h`, `+12h`, `+24h`.
- Play/Pause button for automatic 24-hour dispersion animation.
- Slider drag updates the map heatmap layer to reflect time-stepped advection-diffusion output.

---

## 4. Technical Constraints & Performance Requirements
- **100% Free Hosting:** Zero reliance on paid third-party tile services (Mapbox API keys avoided; use free OpenStreetMap/Carto tiles).
- **Client Latency:** Point-click inspection must feel instant (<50ms for cached spatial grid).
- **Responsiveness:** Optimized for standard 1080p laptop displays (college presentation projectors).