/**
 * Automated Cleanup Script
 * Runs the automated cleanup service to remove cleaned detections
 */

import { AutomatedCleanupService } from '../services/automatedCleanupService';

/**
 * Run automated cleanup
 */
async function runAutomatedCleanup() {
  console.log('🧹 Automated Cleanup Service\n');
  console.log('=' .repeat(50));
  
  try {
    // Get current stats
    console.log('📊 Getting current statistics...');
    const stats = await AutomatedCleanupService.getCleanupStats();
    
    console.log('Current Database State:');
    console.log(`  - Total Detections: ${stats.totalDetections}`);
    console.log(`  - Active Detections: ${stats.activeDetections}`);
    console.log(`  - Cleaned Detections: ${stats.cleanedDetections}`);
    console.log('');
    
    // Run cleanup
    console.log('🧹 Running automated cleanup...');
    const cleanupStats = await AutomatedCleanupService.performAutomaticCleanup();
    
    console.log('\n✅ Cleanup Completed!');
    console.log('📊 Cleanup Results:');
    console.log(`  - Total Processed: ${cleanupStats.totalProcessed}`);
    console.log(`  - Cleaned Detections: ${cleanupStats.cleanedDetections}`);
    console.log(`  - Removed Detections: ${cleanupStats.removedDetections}`);
    console.log(`  - Errors: ${cleanupStats.errors}`);
    console.log(`  - Last Cleanup: ${cleanupStats.lastCleanup.toISOString()}`);
    
    // Get updated stats
    console.log('\n📊 Updated Statistics:');
    const updatedStats = await AutomatedCleanupService.getCleanupStats();
    console.log(`  - Total Detections: ${updatedStats.totalDetections}`);
    console.log(`  - Active Detections: ${updatedStats.activeDetections}`);
    console.log(`  - Cleaned Detections: ${updatedStats.cleanedDetections}`);
    
    console.log('\n🎉 Automated cleanup completed successfully!');
    
  } catch (error) {
    console.error('❌ Automated cleanup failed:', error);
    process.exit(1);
  }
}

/**
 * Start continuous cleanup service
 */
async function startContinuousCleanup() {
  console.log('🚀 Starting Continuous Cleanup Service\n');
  console.log('This will run cleanup every 5 minutes...');
  console.log('Press Ctrl+C to stop\n');
  
  try {
    const intervalId = AutomatedCleanupService.startAutomaticCleanup();
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n🛑 Shutting down cleanup service...');
      AutomatedCleanupService.stopAutomaticCleanup(intervalId);
      console.log('✅ Cleanup service stopped');
      process.exit(0);
    });
    
  } catch (error) {
    console.error('❌ Failed to start continuous cleanup:', error);
    process.exit(1);
  }
}

/**
 * Show help
 */
function showHelp() {
  console.log('🧹 Automated Cleanup Service\n');
  console.log('Usage:');
  console.log('  npm run cleanup              - Run cleanup once');
  console.log('  npm run cleanup-continuous   - Run cleanup every 5 minutes');
  console.log('  npm run cleanup-stats        - Show current statistics');
  console.log('');
  console.log('This service automatically removes detections with confidence scores = 0');
  console.log('from your Firestore database to keep it clean and efficient.');
}

// Main execution
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
  } else if (args.includes('--continuous') || args.includes('-c')) {
    startContinuousCleanup();
  } else if (args.includes('--stats') || args.includes('-s')) {
    AutomatedCleanupService.getCleanupStats()
      .then(stats => {
        console.log('📊 Current Database Statistics:');
        console.log(`  - Total Detections: ${stats.totalDetections}`);
        console.log(`  - Active Detections: ${stats.activeDetections}`);
        console.log(`  - Cleaned Detections: ${stats.cleanedDetections}`);
      })
      .catch(console.error);
  } else {
    runAutomatedCleanup();
  }
}

export { runAutomatedCleanup, startContinuousCleanup, showHelp };
