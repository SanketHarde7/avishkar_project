# Developer Instructions & Implementation Blueprint
# Project: AIR POLLUTION DETECTOR (Frontend MVP)

---

## 1. Tech Stack Selection (Zero-Cost Verified)
- **Framework:** Next.js 14+ (App Router, TypeScript)
- **Styling:** Tailwind CSS + Shadcn UI primitives
- **Map Engine:** `leaflet` + `react-leaflet` (or `@maplibre/maplibre-gl-leaflet`)
- **Icons:** `lucide-react`
- **Charts:** `recharts` (for validation benchmark modal/drawer)
- **Deployment:** Vercel (Free Hobby Tier)

---

## Critical: never run npm install command directly ,only when user give permission then run .and always those libraries which are required and safe to use ...
## 2. Project Initialization Steps

Run the following commands in your terminal:

```bash
# 1. Initialize Next.js project
npx create-next-app@latest air-pollution-detector --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"

cd air-pollution-detector

# 2. Install required packages
npm install leaflet react-leaflet lucide-react recharts clsx tailwind-merge
npm install -D @types/leaflet