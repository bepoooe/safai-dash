/**
 * Automated Cleanup Service
 * Automatically removes detections with confidence scores = 0 from Firestore
 */

import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, writeBatch } from 'firebase/firestore';

export interface CleanupStats {
  totalProcessed: number;
  cleanedDetections: number;
  removedDetections: number;
  errors: number;
  lastCleanup: Date;
}

export class AutomatedCleanupService {
  /**
   * Automatically clean up detections with confidence scores = 0
   */
  static async performAutomaticCleanup(): Promise<CleanupStats> {
    console.log('🧹 Starting automated cleanup...');
    
    const stats: CleanupStats = {
      totalProcessed: 0,
      cleanedDetections: 0,
      removedDetections: 0,
      errors: 0,
      lastCleanup: new Date()
    };
    
    try {
      // Get all detections with confidence scores = 0
      const modelResultsRef = collection(db, 'model_results');
      const cleanedQuery = query(
        modelResultsRef,
        where('confidence_scores', 'array-contains', 0)
      );
      
      const cleanedSnapshot = await getDocs(cleanedQuery);
      
      if (cleanedSnapshot.empty) {
        console.log('✅ No cleaned detections found');
        return stats;
      }
      
      console.log(`🔍 Found ${cleanedSnapshot.size} detections to process`);
      
      // Process each cleaned detection
      const batch = writeBatch(db);
      let batchCount = 0;
      const BATCH_SIZE = 500; // Firestore batch limit
      
      for (const docSnapshot of cleanedSnapshot.docs) {
        try {
          const data = docSnapshot.data();
          const confidenceScores = data.confidence_scores || [];
          
          // Check if ALL confidence scores are 0 (completely cleaned)
          if (confidenceScores.every((score: number) => score === 0)) {
            console.log(`🗑️ Marking for deletion: ${docSnapshot.id} at ${data.location?.address}`);
            
            // Add to batch for deletion
            batch.delete(docSnapshot.ref);
            batchCount++;
            stats.cleanedDetections++;
            
            // If batch is full, commit it
            if (batchCount >= BATCH_SIZE) {
              await batch.commit();
              console.log(`✅ Committed batch of ${batchCount} deletions`);
              batchCount = 0;
            }
          }
          
          stats.totalProcessed++;
          
        } catch (error) {
          console.error(`❌ Error processing ${docSnapshot.id}:`, error);
          stats.errors++;
        }
      }
      
      // Commit remaining batch
      if (batchCount > 0) {
        await batch.commit();
        console.log(`✅ Committed final batch of ${batchCount} deletions`);
      }
      
      stats.removedDetections = stats.cleanedDetections;
      
      console.log(`🎉 Cleanup completed!`);
      console.log(`📊 Stats: ${stats.removedDetections} detections removed, ${stats.errors} errors`);
      
      return stats;
      
    } catch (error) {
      console.error('❌ Error during automated cleanup:', error);
      stats.errors++;
      throw error;
    }
  }
  
  /**
   * Get cleanup statistics
   */
  static async getCleanupStats(): Promise<{
    totalDetections: number;
    cleanedDetections: number;
    activeDetections: number;
  }> {
    try {
      const modelResultsRef = collection(db, 'model_results');
      
      // Get total detections
      const totalSnapshot = await getDocs(modelResultsRef);
      const totalDetections = totalSnapshot.size;
      
      // Get cleaned detections (all confidence scores = 0)
      const cleanedQuery = query(
        modelResultsRef,
        where('confidence_scores', 'array-contains', 0)
      );
      const cleanedSnapshot = await getDocs(cleanedQuery);
      
      let cleanedDetections = 0;
      cleanedSnapshot.forEach(doc => {
        const data = doc.data();
        const confidenceScores = data.confidence_scores || [];
        if (confidenceScores.every((score: number) => score === 0)) {
          cleanedDetections++;
        }
      });
      
      const activeDetections = totalDetections - cleanedDetections;
      
      return {
        totalDetections,
        cleanedDetections,
        activeDetections
      };
      
    } catch (error) {
      console.error('❌ Error getting cleanup stats:', error);
      throw error;
    }
  }
  
  /**
   * Schedule automatic cleanup (call this periodically)
   */
  static async scheduleCleanup(): Promise<void> {
    try {
      console.log('⏰ Running scheduled cleanup...');
      const stats = await this.performAutomaticCleanup();
      
      // Log cleanup results
      console.log('📊 Cleanup Results:');
      console.log(`  - Total Processed: ${stats.totalProcessed}`);
      console.log(`  - Cleaned Detections: ${stats.cleanedDetections}`);
      console.log(`  - Removed Detections: ${stats.removedDetections}`);
      console.log(`  - Errors: ${stats.errors}`);
      console.log(`  - Last Cleanup: ${stats.lastCleanup.toISOString()}`);
      
    } catch (error) {
      console.error('❌ Scheduled cleanup failed:', error);
    }
  }
  
  /**
   * Start automatic cleanup service (runs every 5 minutes)
   */
  static startAutomaticCleanup(): NodeJS.Timeout {
    console.log('🚀 Starting automatic cleanup service (every 5 minutes)');
    
    // Run immediately
    this.scheduleCleanup();
    
    // Schedule recurring cleanup every 5 minutes
    return setInterval(() => {
      this.scheduleCleanup();
    }, 5 * 60 * 1000); // 5 minutes
  }
  
  /**
   * Stop automatic cleanup service
   */
  static stopAutomaticCleanup(intervalId: NodeJS.Timeout): void {
    console.log('🛑 Stopping automatic cleanup service');
    clearInterval(intervalId);
  }
}
