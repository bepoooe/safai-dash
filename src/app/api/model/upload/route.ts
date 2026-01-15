import { NextRequest, NextResponse } from 'next/server';
import { ModelUploadService, ModelDetectionUpload } from '@/services/modelUploadService';

/**
 * POST /api/model/upload
 * Endpoint to receive garbage detection data from the Safai Saathi Model
 * 
 * Expected payload:
 * {
 *   "detection_count": 5,
 *   "confidence_scores": [0.85, 0.92, 0.78, 0.88, 0.95],
 *   "location": {
 *     "source": "GPS",
 *     "latitude": 28.6139,
 *     "longitude": 77.2090,
 *     "accuracy": "±50 meters",
 *     "address": "Connaught Place, New Delhi",
 *     "city": "New Delhi",
 *     "country": "India",
 *     "timestamp": "2026-01-15T10:30:00Z"
 *   },
 *   "timestamp": "2026-01-15T10:30:00Z",
 *   "model_version": "YOLOv8",
 *   "image_url": "https://example.com/detection.jpg"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();

    // Check if it's a batch upload
    if (Array.isArray(body)) {
      // Handle batch upload
      const result = await ModelUploadService.batchStoreDetections(body);
      
      return NextResponse.json(
        {
          success: result.success > 0,
          message: `Batch upload: ${result.success} succeeded, ${result.failed} failed`,
          details: {
            successful: result.success,
            failed: result.failed,
            results: result.results
          }
        },
        { status: result.success > 0 ? 200 : 400 }
      );
    } else {
      // Handle single upload
      const result = await ModelUploadService.storeDetection(body as ModelDetectionUpload);
      
      if (result.success) {
        return NextResponse.json(
          {
            success: true,
            message: result.message,
            documentId: result.documentId
          },
          { status: 200 }
        );
      } else {
        return NextResponse.json(
          {
            success: false,
            message: result.message,
            error: result.error
          },
          { status: 400 }
        );
      }
    }
  } catch (error) {
    console.error('Error in /api/model/upload:', error);
    
    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/model/upload
 * Returns API documentation
 */
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/model/upload',
    description: 'Upload garbage detection data from Safai Saathi Model to Firebase',
    methods: ['POST'],
    authentication: 'None (add API key in production)',
    payload: {
      single: {
        detection_count: 'number - Number of garbage items detected',
        confidence_scores: 'number[] - Array of confidence scores for each detection',
        location: {
          source: '"GPS" | "IP" - Location source type',
          latitude: 'number - GPS latitude (-90 to 90)',
          longitude: 'number - GPS longitude (-180 to 180)',
          accuracy: 'string - Location accuracy (e.g., "±50 meters")',
          address: 'string - Human-readable address',
          city: 'string (optional) - City name',
          region: 'string (optional) - Region/State name',
          country: 'string (optional) - Country name',
          ip: 'string (optional) - IP address if source is IP',
          timestamp: 'string - ISO timestamp of location capture'
        },
        timestamp: 'string - ISO timestamp of detection',
        model_version: 'string (optional) - Model version (e.g., "YOLOv8")',
        image_url: 'string (optional) - URL to detection image'
      },
      batch: 'Array of detection objects for batch upload'
    },
    examples: {
      single: {
        detection_count: 3,
        confidence_scores: [0.85, 0.92, 0.78],
        location: {
          source: 'GPS',
          latitude: 28.6139,
          longitude: 77.2090,
          accuracy: '±50 meters',
          address: 'Connaught Place, New Delhi, India',
          city: 'New Delhi',
          country: 'India',
          timestamp: '2026-01-15T10:30:00Z'
        },
        timestamp: '2026-01-15T10:30:00Z',
        model_version: 'YOLOv8',
        image_url: 'https://example.com/detection.jpg'
      },
      batch: [
        { detection_count: 3, confidence_scores: [0.85, 0.92, 0.78], location: '...' },
        { detection_count: 5, confidence_scores: [0.88, 0.91, 0.76, 0.89, 0.94], location: '...' }
      ]
    },
    response: {
      success: {
        success: true,
        message: 'Detection stored successfully',
        documentId: 'firebase-document-id'
      },
      error: {
        success: false,
        message: 'Validation failed',
        error: 'Error details'
      }
    }
  });
}
