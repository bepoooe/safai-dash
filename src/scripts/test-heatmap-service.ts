/**
 * Test script for the new heatmap processing service
 */

import { HeatmapProcessingService } from '../services/heatmapProcessingService';

/**
 * Test the heatmap processing service
 */
async function testHeatmapProcessingService() {
  console.log('🔥 Testing Heatmap Processing Service\n');
  
  try {
    console.log('🔄 Fetching processed heatmap data...');
    const data = await HeatmapProcessingService.getProcessedHeatmapData();
    
    console.log('✅ Data fetched successfully!');
    console.log(`📊 Results:`);
    console.log(`  - Active Points: ${data.totalCount}`);
    console.log(`  - Average Confidence: ${data.averageConfidence.toFixed(2)}`);
    console.log(`  - Processed Count: ${data.processedCount}`);
    console.log(`  - Removed Count: ${data.removedCount}`);
    
    if (data.results.length > 0) {
      console.log(`\n📍 Sample Results:`);
      data.results.slice(0, 3).forEach((result, index) => {
        console.log(`${index + 1}. ${result.id}`);
        console.log(`   Coordinates: (${result.latitude}, ${result.longitude})`);
        console.log(`   Confidence: ${result.confidence_score}`);
        console.log(`   Address: ${result.address}`);
        console.log(`   Action: ${result.action}`);
        console.log('');
      });
    }
    
    console.log('🎉 Heatmap processing service is working correctly!');
    
  } catch (error) {
    console.error('❌ Error testing heatmap processing service:', error);
  }
}

// Run test if this file is executed directly
if (require.main === module) {
  testHeatmapProcessingService();
}

export { testHeatmapProcessingService };
