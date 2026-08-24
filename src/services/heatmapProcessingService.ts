/**
 * Heatmap Processing Service
 * Processes model results to handle confidence score changes
 */

import { FirebaseService } from './firebaseService';
import { ModelResult } from '@/types/garbage-detection';

export interface ProcessedModelResult extends ModelResult {
  processed?: boolean;
  action?: 'kept' | 'removed' | 'ignored';
}

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
      
      const { results } = await FirebaseService.fetchModelResults();
      
      if (results.length === 0) {
        console.log('No model results found');
        return [];
      }
      
      const allResults: ProcessedModelResult[] = [];
      const resultsToRemove: string[] = [];
      
      // Process each result
      results.forEach((item) => {
        const result: ProcessedModelResult = {
          ...item,
          processed: true
        };
        
        // If confidence score is 0, don't show on heatmap at all
        if (item.confidence_score <= 0) {
          result.action = 'ignored';
          console.log(`🔍 Found cleaned detection: ${item.id} at ${result.address} - will not show on heatmap`);
          
          // Find nearby detections to remove
          const nearbyResults = allResults.filter(existingResult => 
            existingResult.id !== item.id &&
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
