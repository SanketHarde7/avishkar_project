/**
 * Standardized Inter-Agent Data Contracts & Interfaces
 * Adheres strictly to Section 5 of AGENTS.md
 */

// 5.1 Station Data Contract
export interface Station {
  station_id: string;
  name: string;
  lat: number;
  lon: number;
  pm25: number;
  aqi: number;
  status: 'active' | 'hidden_for_validation';
}

// Atmospheric & Weather Metrics
export interface WeatherMetrics {
  wind_speed_kmh: number;
  wind_direction_deg: number;
  u: number; // u = -wind_speed * sin(wind_direction_rad)
  v: number; // v = -wind_speed * cos(wind_direction_rad)
  temp_c: number;
  humidity_pct?: number;
}

// 2D Advection-Diffusion PDE Physics Metadata
export interface PhysicsMetadata {
  diffusion_coeff: number; // D (e.g. 0.15)
  decay_rate: number;      // k (e.g. 0.02)
}

// 5.2 Point Prediction Contract
export type RiskCategory = 'Good' | 'Moderate' | 'Poor' | 'Unhealthy' | 'Severe' | 'Hazardous';

export interface PointPrediction {
  lat: number;
  lon: number;
  predicted_pm25: number;
  predicted_aqi: number;
  pinn_base_pm25?: number;
  sensor_bias_pct?: number;
  physics_bias_pct?: number;
  dominant_sensor_name?: string;
  dominant_sensor_distance_km?: number;
  assimilation_summary?: string;
  street_name?: string;
  nearest_station_km: number;
  nearest_station_name?: string;
  weather: WeatherMetrics;
  physics_metadata: PhysicsMetadata;
  risk_category: RiskCategory;
  is_live?: boolean;
  model_type?: string;
}

// 2D Spatial Grid Matrix Point for PINN Heatmap Surface
export interface GridPoint {
  lat: number;
  lon: number;
  predicted_pm25: number;
  predicted_aqi: number;
  u?: number;
  v?: number;
}

// 5.3 Benchmark Comparison Contract
export interface BenchmarkModelMetric {
  model: string;
  mae: number;
  r2: number;
}

export interface ValidationMetrics {
  withheld_stations: string[];
  metrics: BenchmarkModelMetric[];
}

// Spatiotemporal Forecast Slice (0h to +24h)
export interface ForecastSlice {
  hour_offset: number;
  label: string;
  grid: GridPoint[];
  avg_aqi: number;
  wind_speed_kmh: number;
  wind_direction_deg: number;
  u: number;
  v: number;
}

// City definition
export interface CityOption {
  id: string;
  name: string;
  center: [number, number];
  zoom: number;
  bounds: [[number, number], [number, number]];
}
