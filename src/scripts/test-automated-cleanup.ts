/**
 * Test script for automated cleanup system
 */

import { AutomatedCleanupService } from '../services/automatedCleanupService';

/**
 * Test the automated cleanup system
 */
async function testAutomatedCleanup() {
  console.log('🧹 Testing Automated Cleanup System\n');
  
  try {
    // Get current stats
    console.log('📊 Getting current statistics...');
    const beforeStats = await AutomatedCleanupService.getCleanupStats();
    
    console.log('Before Cleanup:');
    console.log(`  - Total Detections: ${beforeStats.totalDetections}`);
    console.log(`  - Active Detections: ${beforeStats.activeDetections}`);
    console.log(`  - Cleaned Detections: ${beforeStats.cleanedDetections}`);
    console.log('');
    
    // Run cleanup
    console.log('🧹 Running automated cleanup...');
    const cleanupStats = await AutomatedCleanupService.performAutomaticCleanup();
    
    console.log('Cleanup Results:');
    console.log(`  - Total Processed: ${cleanupStats.totalProcessed}`);
    console.log(`  - Cleaned Detections: ${cleanupStats.cleanedDetections}`);
    console.log(`  - Removed Detections: ${cleanupStats.removedDetections}`);
    console.log(`  - Errors: ${cleanupStats.errors}`);
    console.log('');
    
    // Get updated stats
    console.log('📊 Getting updated statistics...');
    const afterStats = await AutomatedCleanupService.getCleanupStats();
    
    console.log('After Cleanup:');
    console.log(`  - Total Detections: ${afterStats.totalDetections}`);
    console.log(`  - Active Detections: ${afterStats.activeDetections}`);
    console.log(`  - Cleaned Detections: ${afterStats.cleanedDetections}`);
    console.log('');
    
    // Calculate changes
    const totalRemoved = beforeStats.totalDetections - afterStats.totalDetections;
    const cleanedRemoved = beforeStats.cleanedDetections - afterStats.cleanedDetections;
    
    console.log('📈 Changes:');
    console.log(`  - Total Removed: ${totalRemoved}`);
    console.log(`  - Cleaned Removed: ${cleanedRemoved}`);
    
    if (totalRemoved > 0) {
      console.log('✅ SUCCESS: Cleaned detections were removed from database!');
    } else {
      console.log('ℹ️ INFO: No cleaned detections found to remove');
    }
    
    console.log('\n🎉 Automated cleanup test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run test if this file is executed directly
if (require.main === module) {
  testAutomatedCleanup();
}

export { testAutomatedCleanup };
