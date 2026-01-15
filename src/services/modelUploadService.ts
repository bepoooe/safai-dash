/**
 * Model Upload Service
 * Handles incoming garbage detection data from the Safai Saathi Model
 */

import { db } from '@/lib/firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';

export interface ModelDetectionUpload {
  detection_count: number;
  confidence_scores: number[];
  location: {
    source: 'GPS' | 'IP';
    latitude: number;
    longitude: number;
    accuracy: string;
    address: string;
    city?: string;
    region?: string;
    country?: string;
    ip?: string;
    timestamp: string;
  };
  timestamp: string;
  model_version?: string;
  image_url?: string;
}

export interface UploadResponse {
  success: boolean;
  message: string;
  documentId?: string;
  error?: string;
}

export class ModelUploadService {
  /**
   * Validate incoming detection data
   */
  static validateDetection(data: any): { valid: boolean; error?: string } {
    if (!data) {
      return { valid: false, error: 'No data provided' };
    }

    if (typeof data.detection_count !== 'number' || data.detection_count < 0) {
      return { valid: false, error: 'Invalid detection_count' };
    }

    if (!Array.isArray(data.confidence_scores)) {
      return { valid: false, error: 'confidence_scores must be an array' };
    }

    if (!data.location) {
      return { valid: false, error: 'location is required' };
    }

    const loc = data.location;
    if (typeof loc.latitude !== 'number' || typeof loc.longitude !== 'number') {
      return { valid: false, error: 'Invalid location coordinates' };
    }

    if (loc.latitude < -90 || loc.latitude > 90) {
      return { valid: false, error: 'Latitude must be between -90 and 90' };
    }

    if (loc.longitude < -180 || loc.longitude > 180) {
      return { valid: false, error: 'Longitude must be between -180 and 180' };
    }

    return { valid: true };
  }

  /**
   * Store detection in Firebase
   */
  static async storeDetection(data: ModelDetectionUpload): Promise<UploadResponse> {
    try {
      // Validate data first
      const validation = this.validateDetection(data);
      if (!validation.valid) {
        return {
          success: false,
          message: 'Validation failed',
          error: validation.error
        };
      }

      // Calculate average confidence
      const avgConfidence = data.confidence_scores.length > 0
        ? data.confidence_scores.reduce((a, b) => a + b, 0) / data.confidence_scores.length
        : 0;

      // Calculate overflow score (same as average confidence for now)
      const overflowScore = avgConfidence;

      // Determine status based on confidence
      let status = 'LOW_OVERFLOW';
      if (avgConfidence > 0.8) {
        status = 'CRITICAL_OVERFLOW';
      } else if (avgConfidence > 0.6) {
        status = 'HIGH_OVERFLOW';
      } else if (avgConfidence > 0.4) {
        status = 'MEDIUM_OVERFLOW';
      }

      // Prepare document for Firestore
      const firestoreDoc = {
        location: {
          latitude: data.location.latitude,
          longitude: data.location.longitude,
          accuracy: data.location.accuracy,
          address: data.location.address,
          source: data.location.source,
          timestamp: data.location.timestamp,
          ...(data.location.city && { city: data.location.city }),
          ...(data.location.region && { region: data.location.region }),
          ...(data.location.country && { country: data.location.country }),
          ...(data.location.ip && { ip: data.location.ip })
        },
        confidence_scores: data.confidence_scores,
        detection_summary: {
          total_detections: data.detection_count,
          average_confidence: avgConfidence,
          max_confidence: Math.max(...data.confidence_scores, 0),
          min_confidence: Math.min(...data.confidence_scores, 1),
          overflow_score: overflowScore,
          detection_frequency: data.detection_count,
          status: status
        },
        createdAt: Timestamp.now(),
        timestamp: data.timestamp,
        status: 'unassigned',
        area: this.extractAreaFromAddress(data.location.address),
        ...(data.model_version && { model_version: data.model_version }),
        ...(data.image_url && { image_url: data.image_url })
      };

      // Add to Firestore
      const modelResultsRef = collection(db, 'model_results');
      const docRef = await addDoc(modelResultsRef, firestoreDoc);

      console.log(`✅ Detection stored in Firebase: ${docRef.id}`);

      return {
        success: true,
        message: 'Detection stored successfully',
        documentId: docRef.id
      };

    } catch (error) {
      console.error('Error storing detection:', error);
      return {
        success: false,
        message: 'Failed to store detection',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Extract area name from address
   */
  private static extractAreaFromAddress(address: string): string {
    if (!address) return 'Unknown';
    
    // Try to extract meaningful area from address
    const parts = address.split(',').map(p => p.trim());
    
    // Return the first significant part (usually neighborhood or landmark)
    if (parts.length > 0) {
      return parts[0];
    }
    
    return 'Unknown';
  }

  /**
   * Batch store multiple detections
   */
  static async batchStoreDetections(
    detections: ModelDetectionUpload[]
  ): Promise<{ success: number; failed: number; results: UploadResponse[] }> {
    const results: UploadResponse[] = [];
    let success = 0;
    let failed = 0;

    for (const detection of detections) {
      const result = await this.storeDetection(detection);
      results.push(result);
      
      if (result.success) {
        success++;
      } else {
        failed++;
      }
    }

    return { success, failed, results };
  }
}
