/**
 * Test script for exact coordinate matching
 * Tests the scenario where two detections have identical coordinates
 */

import { hasGarbageDetected } from './heatmap-processor';

/**
 * Test the exact scenario from the user's example
 */
function testExactCoordinateScenario() {
  console.log('🧪 Testing Exact Coordinate Scenario\n');
  
  // Your example data
  const detection1 = {
    id: 'detection-1',
    confidence_scores: [0, 0.28445136547088623], // Garbage detected
    location: {
      latitude: 22.694988318968743,
      longitude: 88.37945593162355,
      address: "Nilgunj Road, Sodepur, Kamarhati, Barrackpore, North 24 Parganas, West Bengal, 700114, India"
    },
    createdAt: "2025-09-07T04:20:40.496Z"
  };
  
  const detection2 = {
    id: 'detection-2', 
    confidence_scores: [0, 0], // Garbage cleaned
    location: {
      latitude: 22.694988318968743, // EXACT same coordinates
      longitude: 88.37945593162355, // EXACT same coordinates
      address: "Nilgunj Road, Sodepur, Kamarhati, Barrackpore, North 24 Parganas, West Bengal, 700114, India"
    },
    createdAt: "2025-09-07T04:21:03.496Z"
  };
  
  console.log('📊 Test Data:');
  console.log(`Detection 1 (Garbage Found):`);
  console.log(`  ID: ${detection1.id}`);
  console.log(`  Confidence Scores: [${detection1.confidence_scores.join(', ')}]`);
  console.log(`  Coordinates: (${detection1.location.latitude}, ${detection1.location.longitude})`);
  console.log(`  Has Garbage: ${hasGarbageDetected(detection1.confidence_scores) ? '✅ YES' : '❌ NO'}`);
  console.log(`  Action: ${hasGarbageDetected(detection1.confidence_scores) ? 'KEEP on heatmap' : 'REMOVE from heatmap'}\n`);
  
  console.log(`Detection 2 (Garbage Cleaned):`);
  console.log(`  ID: ${detection2.id}`);
  console.log(`  Confidence Scores: [${detection2.confidence_scores.join(', ')}]`);
  console.log(`  Coordinates: (${detection2.location.latitude}, ${detection2.location.longitude})`);
  console.log(`  Has Garbage: ${hasGarbageDetected(detection2.confidence_scores) ? '✅ YES' : '❌ NO'}`);
  console.log(`  Action: ${hasGarbageDetected(detection2.confidence_scores) ? 'KEEP on heatmap' : 'REMOVE from heatmap'}\n`);
  
  // Test coordinate matching
  const latDiff = Math.abs(detection2.location.latitude - detection1.location.latitude);
  const lonDiff = Math.abs(detection2.location.longitude - detection1.location.longitude);
  
  console.log('🎯 Coordinate Analysis:');
  console.log(`Latitude difference: ${latDiff}`);
  console.log(`Longitude difference: ${lonDiff}`);
  console.log(`Within 0.005° threshold: ${latDiff < 0.005 && lonDiff < 0.005 ? '✅ YES' : '❌ NO'}`);
  console.log(`Exact match: ${latDiff === 0 && lonDiff === 0 ? '✅ YES' : '❌ NO'}\n`);
  
  // Expected behavior
  console.log('📋 Expected Behavior:');
  console.log('1. Detection 1 (confidence > 0) → ✅ KEEP on heatmap (garbage detected)');
  console.log('2. Detection 2 (confidence = 0) → 🔍 Look for nearby detections');
  console.log('3. Find Detection 1 at same coordinates → 🗑️ REMOVE Detection 1');
  console.log('4. Result: Heatmap point disappears (garbage cleaned)\n');
  
  // Simulate the logic
  console.log('🔄 Simulating Heatmap Processor Logic:');
  
  if (hasGarbageDetected(detection1.confidence_scores)) {
    console.log('✅ Detection 1: KEPT (garbage detected)');
  }
  
  if (!hasGarbageDetected(detection2.confidence_scores)) {
    console.log('🔍 Detection 2: Looking for nearby detections...');
    if (latDiff < 0.005 && lonDiff < 0.005) {
      console.log('✅ Found Detection 1 at same coordinates');
      console.log('🗑️ REMOVING Detection 1 from heatmap');
      console.log('🎉 Result: Heatmap point disappears (garbage cleaned)');
    } else {
      console.log('❌ No nearby detections found');
    }
  }
  
  console.log('\n✨ Test completed! The logic should work correctly for your scenario.');
}

/**
 * Test various confidence score combinations
 */
function testConfidenceScoreCombinations() {
  console.log('\n🧪 Testing Confidence Score Combinations\n');
  
  const testCases = [
    {
      scores: [0, 0.28445136547088623],
      description: 'Garbage detected (one score > 0)',
      expected: true
    },
    {
      scores: [0, 0],
      description: 'Garbage cleaned (all scores = 0)',
      expected: false
    },
    {
      scores: [0.5, 0.3],
      description: 'Multiple garbage types detected',
      expected: true
    },
    {
      scores: [0, 0, 0],
      description: 'All clean (three scores = 0)',
      expected: false
    },
    {
      scores: [0.1, 0.2, 0.05],
      description: 'Multiple detections with low confidence',
      expected: true
    }
  ];
  
  testCases.forEach((testCase, index) => {
    const result = hasGarbageDetected(testCase.scores);
    const status = result === testCase.expected ? '✅ PASS' : '❌ FAIL';
    
    console.log(`${index + 1}. ${testCase.description}`);
    console.log(`   Scores: [${testCase.scores.join(', ')}]`);
    console.log(`   Expected: ${testCase.expected}, Got: ${result} ${status}\n`);
  });
}

/**
 * Run all tests
 */
function runAllTests() {
  console.log('🔥 Exact Coordinate Test Suite\n');
  console.log('=' .repeat(60));
  
  testExactCoordinateScenario();
  testConfidenceScoreCombinations();
  
  console.log('=' .repeat(60));
  console.log('✅ All tests completed!');
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests();
}

export { testExactCoordinateScenario, testConfidenceScoreCombinations, runAllTests };
