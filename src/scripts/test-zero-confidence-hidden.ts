/**
 * Test script to verify zero confidence points are hidden
 */

import { HeatmapProcessingService } from '../services/heatmapProcessingService';

/**
 * Test that zero confidence points are completely hidden
 */
async function testZeroConfidenceHidden() {
  console.log('🔥 Testing Zero Confidence Points Are Hidden\n');
  
  try {
    console.log('🔄 Fetching processed heatmap data...');
    const data = await HeatmapProcessingService.getProcessedHeatmapData();
    
    console.log('✅ Data fetched successfully!');
    console.log(`📊 Results:`);
    console.log(`  - Total Points Found: ${data.totalCount}`);
    console.log(`  - Points Shown on Map: ${data.results.length}`);
    console.log(`  - Average Confidence: ${data.averageConfidence.toFixed(2)}`);
    
    if (data.results.length === 0) {
      console.log('\n🎉 SUCCESS: No points shown on heatmap!');
      console.log('✅ Zero confidence points are completely hidden as requested.');
    } else {
      console.log('\n📍 Points shown on heatmap:');
      data.results.forEach((result, index) => {
        console.log(`${index + 1}. ${result.id}`);
        console.log(`   Confidence: ${result.confidence_score}`);
        console.log(`   Coordinates: (${result.latitude}, ${result.longitude})`);
        console.log(`   Address: ${result.address}`);
        console.log('');
      });
    }
    
    // Check if any results have confidence = 0
    const zeroConfidenceResults = data.results.filter(r => r.confidence_score === 0);
    if (zeroConfidenceResults.length > 0) {
      console.log(`⚠️  WARNING: Found ${zeroConfidenceResults.length} points with confidence = 0 that are still showing!`);
    } else {
      console.log('✅ No zero confidence points are showing on the heatmap.');
    }
    
  } catch (error) {
    console.error('❌ Error testing zero confidence points:', error);
  }
}

// Run test if this file is executed directly
if (require.main === module) {
  testZeroConfidenceHidden();
}

export { testZeroConfidenceHidden };
