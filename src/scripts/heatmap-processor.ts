import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin SDK
export const initializeFirebaseAdmin = () => {
  if (getApps().length === 0) {
    // For production, you should use environment variables for the service account
    // For now, using the project ID from your existing config
    initializeApp({
      projectId: 'safai-saathi',
      // In production, add: credential: cert(serviceAccountKey)
    });
  }
  return getFirestore();
};

// Types for our data structures
interface DetectionDocument {
  confidence_scores: number[];
  location: {
    latitude: number;
    longitude: number;
    address: string;
  };
  createdAt: string;
  [key: string]: unknown;
}

interface ProcessedDetection {
  id: string;
  latitude: number;
  longitude: number;
  confidence: number;
  address: string;
  action: 'kept' | 'removed' | 'ignored';
  reason?: string;
}

/**
 * Check if any confidence score indicates garbage detection
 * @param confidenceScores Array of confidence scores
 * @returns True if any score > 0 (garbage detected), false if all scores are 0 (clean)
 */
export function hasGarbageDetected(confidenceScores: number[]): boolean {
  return confidenceScores.some(score => score > 0);
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in kilometers
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

/**
 * Check if two coordinates are within the specified proximity threshold
 * @param lat1 First latitude
 * @param lon1 First longitude
 * @param lat2 Second latitude
 * @param lon2 Second longitude
 * @param threshold Distance threshold in kilometers (default: ~0.5km)
 */
function isWithinProximity(
  lat1: number, 
  lon1: number, 
  lat2: number, 
  lon2: number, 
  threshold: number = 0.5
): boolean {
  const distance = calculateDistance(lat1, lon1, lat2, lon2);
  return distance < threshold;
}

/**
 * Check if two coordinates are within the specified degree threshold
 * @param lat1 First latitude
 * @param lon1 First longitude
 * @param lat2 Second latitude
 * @param lon2 Second longitude
 * @param latThreshold Latitude threshold in degrees (default: 0.005)
 * @param lonThreshold Longitude threshold in degrees (default: 0.005)
 */
function isWithinDegreeThreshold(
  lat1: number, 
  lon1: number, 
  lat2: number, 
  lon2: number, 
  latThreshold: number = 0.005,
  lonThreshold: number = 0.005
): boolean {
  const latDiff = Math.abs(lat2 - lat1);
  const lonDiff = Math.abs(lon2 - lon1);
  return latDiff < latThreshold && lonDiff < lonThreshold;
}

/**
 * Process a single detection document
 * @param detectionId The ID of the detection document to process
 * @returns Promise<ProcessedDetection> The processing result
 */
export async function processDetection(detectionId: string): Promise<ProcessedDetection> {
  try {
    const db = initializeFirebaseAdmin();
    
    // 1. Fetch the detection document
    const detectionRef = db.collection('model_results').doc(detectionId);
    const detectionDoc = await detectionRef.get();
    
    if (!detectionDoc.exists) {
      return {
        id: detectionId,
        latitude: 0,
        longitude: 0,
        confidence: 0,
        address: 'Unknown',
        action: 'ignored',
        reason: 'Document not found'
      };
    }
    
    const detectionData = detectionDoc.data() as DetectionDocument;
    const { latitude, longitude, address } = detectionData.location;
    const confidenceScores = detectionData.confidence_scores;
    
    // 2. If any confidence score > 0, keep it as a heatmap point (garbage detected)
    if (hasGarbageDetected(confidenceScores)) {
      return {
        id: detectionId,
        latitude,
        longitude,
        confidence: Math.max(...confidenceScores), // Use highest confidence score
        address,
        action: 'kept',
        reason: 'Garbage detected (confidence > 0)'
      };
    }
    
    // 3. If all confidence scores == 0, look for nearby detections to remove (garbage cleaned)
    if (confidenceScores.every(score => score === 0)) {
      console.log(`Processing detection with confidence 0 at ${address} (${latitude}, ${longitude})`);
      
      // Query for nearby detections within proximity threshold
      const nearbyDetections = await findNearbyDetections(db, latitude, longitude, detectionId);
      
      if (nearbyDetections.length === 0) {
      return {
        id: detectionId,
        latitude,
        longitude,
        confidence: 0, // All scores are 0
        address,
        action: 'ignored',
        reason: 'No nearby detections found to remove'
      };
      }
      
      // Find the closest detection to remove (using degree-based distance)
      let closestDetection = nearbyDetections[0];
      let minDistance = Math.sqrt(
        Math.pow(closestDetection.latitude - latitude, 2) + 
        Math.pow(closestDetection.longitude - longitude, 2)
      );
      
      for (const detection of nearbyDetections) {
        const distance = Math.sqrt(
          Math.pow(detection.latitude - latitude, 2) + 
          Math.pow(detection.longitude - longitude, 2)
        );
        if (distance < minDistance) {
          minDistance = distance;
          closestDetection = detection;
        }
      }
      
      // Remove the closest detection
      await db.collection('model_results').doc(closestDetection.id).delete();
      
      console.log(`Removed detection ${closestDetection.id} at ${closestDetection.address} (distance: ${minDistance.toFixed(6)} degrees)`);
      
      return {
        id: detectionId,
        latitude,
        longitude,
        confidence: 0, // All scores are 0
        address,
        action: 'removed',
        reason: `Removed nearby detection ${closestDetection.id} (${minDistance.toFixed(6)} degrees away)`
      };
    }
    
    // This should not happen, but handle unexpected cases
    return {
      id: detectionId,
      latitude,
      longitude,
      confidence: Math.max(...confidenceScores),
      address,
      action: 'ignored',
      reason: 'Unexpected confidence scores'
    };
    
  } catch (error) {
    console.error(`Error processing detection ${detectionId}:`, error);
    throw new Error(`Failed to process detection ${detectionId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Find nearby detections within proximity threshold
 * @param db Firestore instance
 * @param latitude Target latitude
 * @param longitude Target longitude
 * @param excludeId Detection ID to exclude from results
 * @returns Promise<Array<{id: string, latitude: number, longitude: number, address: string}>>
 */
async function findNearbyDetections(
  db: Firestore,
  latitude: number,
  longitude: number,
  excludeId: string
): Promise<Array<{id: string, latitude: number, longitude: number, address: string}>> {
  try {
    // Get all detections (we'll filter in memory for better control)
    const detectionsSnapshot = await db.collection('model_results').get();
    const nearbyDetections: Array<{id: string, latitude: number, longitude: number, address: string}> = [];
    
    detectionsSnapshot.forEach((doc) => {
      // Skip the current detection
      if (doc.id === excludeId) return;
      
      const data = doc.data() as DetectionDocument;
      const { latitude: docLat, longitude: docLon, address } = data.location;
      
      // Check if within degree threshold (0.005 degrees for both lat and lon)
      if (isWithinDegreeThreshold(latitude, longitude, docLat, docLon, 0.005, 0.005)) {
        nearbyDetections.push({
          id: doc.id,
          latitude: docLat,
          longitude: docLon,
          address
        });
      }
    });
    
    return nearbyDetections;
  } catch (error) {
    console.error('Error finding nearby detections:', error);
    throw error;
  }
}

/**
 * Process multiple detections in batch
 * @param detectionIds Array of detection IDs to process
 * @returns Promise<ProcessedDetection[]> Array of processing results
 */
export async function processDetectionsBatch(detectionIds: string[]): Promise<ProcessedDetection[]> {
  const results: ProcessedDetection[] = [];
  
  console.log(`Processing ${detectionIds.length} detections...`);
  
  for (let i = 0; i < detectionIds.length; i++) {
    const detectionId = detectionIds[i];
    try {
      console.log(`Processing ${i + 1}/${detectionIds.length}: ${detectionId}`);
      const result = await processDetection(detectionId);
      results.push(result);
      
      // Add small delay to avoid overwhelming Firestore
      if (i < detectionIds.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (error) {
      console.error(`Failed to process detection ${detectionId}:`, error);
      results.push({
        id: detectionId,
        latitude: 0,
        longitude: 0,
        confidence: 0,
        address: 'Unknown',
        action: 'ignored',
        reason: `Processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  }
  
  return results;
}

/**
 * Get all detection IDs from the model_results collection
 * @returns Promise<string[]> Array of detection IDs
 */
export async function getAllDetectionIds(): Promise<string[]> {
  try {
    const db = initializeFirebaseAdmin();
    const detectionsSnapshot = await db.collection('model_results').get();
    
    return detectionsSnapshot.docs.map((doc) => doc.id);
  } catch (error) {
    console.error('Error getting detection IDs:', error);
    throw error;
  }
}

/**
 * Process all detections in the collection
 * @returns Promise<ProcessedDetection[]> Array of processing results
 */
export async function processAllDetections(): Promise<ProcessedDetection[]> {
  try {
    const detectionIds = await getAllDetectionIds();
    return await processDetectionsBatch(detectionIds);
  } catch (error) {
    console.error('Error processing all detections:', error);
    throw error;
  }
}

/**
 * Get processing statistics
 * @param results Array of processing results
 * @returns Object with statistics
 */
export function getProcessingStats(results: ProcessedDetection[]): {
  total: number;
  kept: number;
  removed: number;
  ignored: number;
  keptPercentage: number;
  removedPercentage: number;
  ignoredPercentage: number;
} {
  const total = results.length;
  const kept = results.filter(r => r.action === 'kept').length;
  const removed = results.filter(r => r.action === 'removed').length;
  const ignored = results.filter(r => r.action === 'ignored').length;
  
  return {
    total,
    kept,
    removed,
    ignored,
    keptPercentage: total > 0 ? (kept / total) * 100 : 0,
    removedPercentage: total > 0 ? (removed / total) * 100 : 0,
    ignoredPercentage: total > 0 ? (ignored / total) * 100 : 0
  };
}

// Example usage and testing
async function main() {
  try {
    console.log('🔥 Heatmap Processor Starting...\n');
    
    // Example 1: Process a single detection
    // const result = await processDetection('your-detection-id-here');
    // console.log('Single detection result:', result);
    
    // Example 2: Process all detections
    console.log('Processing all detections...');
    const results = await processAllDetections();
    
    // Display statistics
    const stats = getProcessingStats(results);
    console.log('\n📊 Processing Statistics:');
    console.log(`Total processed: ${stats.total}`);
    console.log(`Kept (confidence > 0): ${stats.kept} (${stats.keptPercentage.toFixed(1)}%)`);
    console.log(`Removed (cleaned): ${stats.removed} (${stats.removedPercentage.toFixed(1)}%)`);
    console.log(`Ignored: ${stats.ignored} (${stats.ignoredPercentage.toFixed(1)}%)`);
    
    // Show some examples
    console.log('\n📋 Sample Results:');
    results.slice(0, 5).forEach((result, index) => {
      console.log(`${index + 1}. ${result.action.toUpperCase()}: ${result.address} (confidence: ${result.confidence})`);
      if (result.reason) {
        console.log(`   Reason: ${result.reason}`);
      }
    });
    
    console.log('\n✅ Heatmap processing completed!');
    
  } catch (error) {
    console.error('❌ Heatmap processing failed:', error);
    process.exit(1);
  }
}

// Run the main function if this script is executed directly
if (require.main === module) {
  main();
}

export {
  calculateDistance,
  isWithinProximity,
  isWithinDegreeThreshold,
  findNearbyDetections
};
