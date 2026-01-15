/**
 * Test script to process real heatmap data
 * This will test the actual heatmap processor with your data
 */

import { processDetection } from './heatmap-processor';

/**
 * Test with your exact data
 */
async function testRealDataProcessing() {
  console.log('🔥 Testing Real Data Processing\n');
  
  // Your example detection IDs (you'll need to replace these with actual IDs from your Firestore)
  const testDetectionIds = [
    // Replace these with actual detection IDs from your model_results collection
    'detection-with-garbage-id',
    'detection-cleaned-id'
  ];
  
  console.log('📋 Test Detection IDs:');
  testDetectionIds.forEach((id, index) => {
    console.log(`${index + 1}. ${id}`);
  });
  
  console.log('\n⚠️  Note: Replace the test IDs above with actual detection IDs from your Firestore.');
  console.log('You can find these IDs in your Firebase Console under model_results collection.\n');
  
  // Test processing each detection
  for (const detectionId of testDetectionIds) {
    try {
      console.log(`🔄 Processing detection: ${detectionId}`);
      const result = await processDetection(detectionId);
      
      console.log(`✅ Result:`, {
        id: result.id,
        action: result.action,
        reason: result.reason,
        coordinates: `(${result.latitude}, ${result.longitude})`,
        confidence: result.confidence
      });
      
    } catch (error) {
      console.log(`❌ Error processing ${detectionId}:`, error instanceof Error ? error.message : String(error));
    }
    
    console.log(''); // Empty line for readability
  }
}

/**
 * Get actual detection IDs from Firestore
 */
async function getActualDetectionIds() {
  console.log('🔍 Getting actual detection IDs from Firestore...\n');
  
  try {
    const { initializeFirebaseAdmin } = await import('./heatmap-processor');
    const db = initializeFirebaseAdmin();
    
    // Get all detection documents
    const snapshot = await db.collection('model_results').limit(10).get();
    
    if (snapshot.empty) {
      console.log('❌ No detections found in model_results collection');
      return [];
    }
    
    const detectionIds: string[] = [];
    console.log('📋 Found detections:');
    
    let index = 0;
    snapshot.forEach((doc) => {
      const data = doc.data();
      const confidenceScores = data.confidence_scores || [];
      const hasGarbage = confidenceScores.some((score: number) => score > 0);
      
      console.log(`${index + 1}. ID: ${doc.id}`);
      console.log(`   Confidence: [${confidenceScores.join(', ')}]`);
      console.log(`   Has Garbage: ${hasGarbage ? '✅ YES' : '❌ NO'}`);
      console.log(`   Coordinates: (${data.location?.latitude}, ${data.location?.longitude})`);
      console.log(`   Address: ${data.location?.address}`);
      console.log('');
      
      detectionIds.push(doc.id);
      index++;
    });
    
    return detectionIds;
    
  } catch (error) {
    console.error('❌ Error getting detection IDs:', error instanceof Error ? error.message : String(error));
    return [];
  }
}

/**
 * Process actual detections
 */
async function processActualDetections() {
  console.log('🚀 Processing Actual Detections\n');
  
  const detectionIds = await getActualDetectionIds();
  
  if (detectionIds.length === 0) {
    console.log('❌ No detections to process');
    return;
  }
  
  console.log(`📊 Processing ${detectionIds.length} detections...\n`);
  
  let processed = 0;
  let kept = 0;
  let removed = 0;
  let ignored = 0;
  
  for (const detectionId of detectionIds) {
    try {
      console.log(`🔄 Processing: ${detectionId}`);
      const result = await processDetection(detectionId);
      
      console.log(`✅ ${result.action.toUpperCase()}: ${result.reason}`);
      
      switch (result.action) {
        case 'kept':
          kept++;
          break;
        case 'removed':
          removed++;
          break;
        case 'ignored':
          ignored++;
          break;
      }
      
      processed++;
      
    } catch (error) {
      console.log(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    console.log(''); // Empty line
  }
  
  console.log('📊 Processing Summary:');
  console.log(`Total processed: ${processed}`);
  console.log(`Kept on heatmap: ${kept}`);
  console.log(`Removed from heatmap: ${removed}`);
  console.log(`Ignored: ${ignored}`);
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('🔥 Heatmap Processing Test Suite\n');
  console.log('=' .repeat(60));
  
  await processActualDetections();
  
  console.log('=' .repeat(60));
  console.log('✅ All tests completed!');
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests().catch(console.error);
}

export { testRealDataProcessing, getActualDetectionIds, processActualDetections, runAllTests };
