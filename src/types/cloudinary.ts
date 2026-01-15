export interface DetectionDetail {
  class_name: string;
  confidence: number;
  bbox?: number[];
}

export interface CloudinaryAnalysis {
  id: string;
  detection_details?: DetectionDetail[];
  timestamp: Date | string;
  image_url?: string;
  summary?: string;
  status?: string;
  detection_count?: number;
  average_confidence?: number;
  confidence_scores?: number[];
  createdAt?: string;
  [key: string]: unknown;
}

export interface ModelResult {
  id: string;
  timestamp: Date;
  confidence_score: number;
  latitude: number;
  longitude: number;
  [key: string]: unknown;
}

export interface WhatsAppWebhookData {
  entry?: Array<{
    changes?: Array<{
      value?: {
        messages?: Array<{
          from: string;
          text?: {
            body: string;
          };
          [key: string]: unknown;
        }>;
        [key: string]: unknown;
      };
      [key: string]: unknown;
    }>;
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
}

export interface IncomingMessage {
  from: string;
  text?: {
    body: string;
  };
  [key: string]: unknown;
}
