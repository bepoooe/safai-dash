/**
 * Heatmap Processing Service
 * Processes model results to handle confidence score changes
 */

import { db } from '@/lib/firebase';
import { collection, query, getDocs, orderBy } from 'firebase/firestore';
import { ModelResult } from '@/types/garbage-detection';

export interface ProcessedModelResult extends ModelResult {
  processed?: boolean;
  action?: 'kept' | 'removed' | 'ignored';
}

/**
 * Check if any confidence score indicates garbage detection
 */
// function hasGarbageDetected(confidenceScores: number[]): boolean {
//   return confidenceScores.some(score => score > 0);
// }

/**
 * Check if two coordinates are within the specified degree threshold
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
 * Process model results to handle confidence score changes
 * This runs on the client side and processes the data for display
 */
export class HeatmapProcessingService {
  /**
   * Process model results and return filtered data for heatmap
   */
  static async processModelResultsForHeatmap(): Promise<ProcessedModelResult[]> {
    try {
      console.log('🔄 Processing model results for heatmap...');
      
      // Get all model results
      const modelResultsRef = collection(db, 'model_results');
      const q = query(modelResultsRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        console.log('No model results found');
        return [];
      }
      
      const allResults: ProcessedModelResult[] = [];
      const resultsToRemove: string[] = [];
      
      // Process each result
      snapshot.forEach((doc) => {
        const data = doc.data();
        const confidenceScores = data.confidence_scores || [];
        
        const result: ProcessedModelResult = {
          id: doc.id,
          latitude: data.location?.latitude || 0,
          longitude: data.location?.longitude || 0,
          address: data.location?.address || '',
          confidence_score: Math.max(...confidenceScores),
          accuracy: data.location?.accuracy || '±100 meters',
          timestamp: data.createdAt || new Date().toISOString(),
          processed: true
        };
        
        // If all confidence scores are 0, don't show on heatmap at all
        if (confidenceScores.every((score: number) => score === 0)) {
          result.action = 'ignored';
          console.log(`🔍 Found cleaned detection: ${doc.id} at ${result.address} - will not show on heatmap`);
          
          // Find nearby detections to remove
          const nearbyResults = allResults.filter(existingResult => 
            existingResult.id !== doc.id &&
            isWithinDegreeThreshold(
              result.latitude, 
              result.longitude,
              existingResult.latitude,
              existingResult.longitude,
              0.005,
              0.005
            )
          );
          
          if (nearbyResults.length > 0) {
            // Find the closest one to remove
            let closestResult = nearbyResults[0];
            let minDistance = Math.sqrt(
              Math.pow(closestResult.latitude - result.latitude, 2) + 
              Math.pow(closestResult.longitude - result.longitude, 2)
            );
            
            for (const nearbyResult of nearbyResults) {
              const distance = Math.sqrt(
                Math.pow(nearbyResult.latitude - result.latitude, 2) + 
                Math.pow(nearbyResult.longitude - result.longitude, 2)
              );
              if (distance < minDistance) {
                minDistance = distance;
                closestResult = nearbyResult;
              }
            }
            
            console.log(`🗑️ Marking for removal: ${closestResult.id} (${minDistance.toFixed(6)} degrees away)`);
            resultsToRemove.push(closestResult.id);
            result.action = 'removed';
          } else {
            console.log(`ℹ️ No nearby detections found for ${doc.id}`);
          }
        } else {
          result.action = 'kept';
        }
        
        allResults.push(result);
      });
      
      // Filter out results marked for removal AND results with zero confidence scores
      const filteredResults = allResults.filter(result => 
        !resultsToRemove.includes(result.id) && 
        result.confidence_score > 0
      );
      
      console.log(`✅ Processed ${allResults.length} results, kept ${filteredResults.length} for heatmap`);
      console.log(`🗑️ Removed ${resultsToRemove.length} cleaned detections`);
      
      return filteredResults;
      
    } catch (error) {
      console.error('❌ Error processing model results:', error);
      throw error;
    }
  }
  
  /**
   * Get processed model results with statistics
   */
  static async getProcessedHeatmapData(): Promise<{
    results: ProcessedModelResult[];
    totalCount: number;
    averageConfidence: number;
    processedCount: number;
    removedCount: number;
  }> {
    try {
      const results = await this.processModelResultsForHeatmap();
      
      const totalCount = results.length;
      const averageConfidence = results.length > 0 
        ? results.reduce((sum, result) => sum + result.confidence_score, 0) / results.length 
        : 0;
      
      const processedCount = results.filter(r => r.processed).length;
      const removedCount = results.filter(r => r.action === 'removed').length;
      
      return {
        results,
        totalCount,
        averageConfidence,
        processedCount,
        removedCount
      };
      
    } catch (error) {
      console.error('❌ Error getting processed heatmap data:', error);
      throw error;
    }
  }
  
  /**
   * Process a single detection (for real-time updates)
   */
  static async processSingleDetection(detectionId: string): Promise<ProcessedModelResult | null> {
    try {
      const results = await this.processModelResultsForHeatmap();
      return results.find(r => r.id === detectionId) || null;
    } catch (error) {
      console.error('❌ Error processing single detection:', error);
      return null;
    }
  }
}
