// Heatmap data point interface
export interface HeatmapPoint {
  lat: number;
  lng: number;
  intensity: number;
}

// Heatmap configuration interface
export interface HeatmapConfig {
  radius?: number;
  max?: number;
  minOpacity?: number;
  blur?: number;
  gradient?: { [key: number]: string };
}

// API response interface for future backend integration
export interface HeatmapApiResponse {
  points: HeatmapPoint[];
  lastUpdated: string;
  totalPoints: number;
  averageIntensity: number;
  maxIntensity: number;
}
