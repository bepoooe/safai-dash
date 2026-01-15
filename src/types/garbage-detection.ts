// Garbage overflow detection data types

export interface GPSLocation {
  latitude: number;
  longitude: number;
  accuracy: string;
  address: string;
  source: 'GPS' | 'MANUAL' | 'ESTIMATED';
  timestamp: string;
}

export interface DetectionSummary {
  total_detections: number;
  average_confidence: number;
  max_confidence: number;
  min_confidence: number;
  overflow_score: number;
  detection_frequency: number;
  status: 'LOW_OVERFLOW' | 'MEDIUM_OVERFLOW' | 'HIGH_OVERFLOW' | 'CRITICAL_OVERFLOW';
}

export interface RecentDetection {
  timestamp: string;
  detection_count: number;
  confidence_scores: number[];
  average_confidence: number;
  location: {
    source: string;
    latitude: number;
    longitude: number;
    city: string | null;
    country: string | null;
    address: string;
  };
}

export interface GarbageOverflowReport {
  timestamp: string;
  gps_location: GPSLocation;
  detection_summary: DetectionSummary;
  recent_detections: RecentDetection[];
}

// Dashboard-specific data types
export interface DashboardStats {
  totalDetections: number;
  averageConfidence: number;
  overflowScore: number;
  detectionFrequency: number;
  status: string;
  totalCollections: number;
  collectionRate: number;
  activeRoutes: number;
  tonsCollected: number;
}

export interface DashboardActivity {
  id: string;
  timestamp: string;
  detectionCount: number;
  averageConfidence: number;
  status: string;
  area: string;
  action: string;
  timeAgo: string;
}

// Heatmap-specific data types
export interface HeatmapDetectionPoint {
  lat: number;
  lng: number;
  intensity: number; // Based on overflow_score or confidence
  timestamp: string;
  address: string;
  detectionCount: number;
  averageConfidence: number;
  overflowScore: number;
  status: string;
}

export interface HeatmapData {
  points: HeatmapDetectionPoint[];
  totalDataPoints: number;
  averageIntensity: number;
  maxIntensity: number;
  lastUpdated: string;
}

// Analytics-specific data types
export interface DailyDetectionData {
  date: string;
  detections: number;
  averageConfidence: number;
  overflowScore: number;
  status: string;
}

export interface AreaStats {
  area: string;
  detections: number;
  averageConfidence: number;
  status: string;
  lastDetection: string;
}

export interface AnalyticsData {
  dailyDetections: DailyDetectionData[];
  areaStats: AreaStats[];
  collectionEfficiency: number;
  recyclingRate: number;
  wasteCollected: number;
  totalActiveAreas: number;
}

// API response types
export interface GarbageDetectionApiResponse {
  reports: GarbageOverflowReport[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  lastUpdated: string;
}

export interface DashboardApiResponse {
  stats: DashboardStats;
  recentActivities: DashboardActivity[];
  lastUpdated: string;
}

export interface HeatmapApiResponse {
  data: HeatmapData;
  lastUpdated: string;
}

export interface AnalyticsApiResponse {
  data: AnalyticsData;
  lastUpdated: string;
}

// Filter and query types
export interface DetectionFilters {
  status?: 'LOW_OVERFLOW' | 'MEDIUM_OVERFLOW' | 'HIGH_OVERFLOW' | 'CRITICAL_OVERFLOW' | 'All';
  dateRange?: {
    start: string;
    end: string;
  };
  area?: string;
  minConfidence?: number;
  maxConfidence?: number;
}

export interface HeatmapFilters {
  dateRange?: {
    start: string;
    end: string;
  };
  minIntensity?: number;
  maxIntensity?: number;
  area?: string;
}

// Firebase model results data types
export interface ModelResult {
  id: string;
  latitude: number;
  longitude: number;
  confidence_score: number; // This is the calculated average from confidence_scores array
  accuracy: number | string; // Can be number or string like "±78 meters"
  address: string;
  timestamp: string;
  model_version?: string;
  image_url?: string;
  status?: string; // CLEAN, LOW_OVERFLOW, HIGH_OVERFLOW, etc.
  overflow_score?: number;
  total_detections?: number;
}

// Raw Firebase document structure
export interface FirebaseModelResult {
  id: string;
  latitude: number;
  longitude: number;
  confidence_scores: number[]; // Array of confidence scores from Firebase
  confidence_score?: number; // Optional single score fallback
  accuracy: number;
  address: string;
  timestamp: string;
  model_version?: string;
  image_url?: string;
}

export interface ModelResultsResponse {
  results: ModelResult[];
  totalCount: number;
  averageConfidence: number;
  lastUpdated: string;
}

// Area-specific data types
export interface AreaData {
  area: string;
  count: number;
  latestDetection: string;
}

export interface DetailedAreaStats {
  totalDetections: number;
  averageConfidence: number;
  maxConfidence: number;
  minConfidence: number;
  latestDetection: string;
  status: {
    status: string;
    color: string;
    bgColor: string;
  };
}