/**
 * Test script to verify heatmap processing logic
 * This script tests the proximity detection with your specified thresholds
 */

import { isWithinDegreeThreshold, calculateDistance } from './heatmap-processor';

/**
 * Test the degree-based proximity detection
 */
function testProximityLogic() {
  console.log('🧪 Testing Heatmap Proximity Logic\n');
  
  // Test cases with your specified threshold (0.005 degrees)
  const testCases = [
    {
      name: 'Exact same coordinates',
      lat1: 22.6950,
      lon1: 88.3794,
      lat2: 22.6950,
      lon2: 88.3794,
      expected: true
    },
    {
      name: 'Within 0.005 degrees (should match)',
      lat1: 22.6950,
      lon1: 88.3794,
      lat2: 22.6970, // +0.002 degrees
      lon2: 88.3810, // +0.0016 degrees
      expected: true
    },
    {
      name: 'Just at 0.005 degree boundary (should match)',
      lat1: 22.6950,
      lon1: 88.3794,
      lat2: 22.7000, // +0.005 degrees
      lon2: 88.3844, // +0.005 degrees
      expected: true
    },
    {
      name: 'Slightly beyond 0.005 degrees (should not match)',
      lat1: 22.6950,
      lon1: 88.3794,
      lat2: 22.7001, // +0.0051 degrees
      lon2: 88.3845, // +0.0051 degrees
      expected: false
    },
    {
      name: 'Far away coordinates (should not match)',
      lat1: 22.6950,
      lon1: 88.3794,
      lat2: 22.8000, // +0.105 degrees
      lon2: 88.5000, // +0.1206 degrees
      expected: false
    }
  ];
  
  console.log('Testing degree-based proximity detection (0.005 degree threshold):\n');
  
  let passedTests = 0;
  
  testCases.forEach((testCase, index) => {
    const result = isWithinDegreeThreshold(
      testCase.lat1, 
      testCase.lon1, 
      testCase.lat2, 
      testCase.lon2, 
      0.005, 
      0.005
    );
    
    const status = result === testCase.expected ? '✅ PASS' : '❌ FAIL';
    const latDiff = Math.abs(testCase.lat2 - testCase.lat1);
    const lonDiff = Math.abs(testCase.lon2 - testCase.lon1);
    
    console.log(`${index + 1}. ${testCase.name}`);
    console.log(`   Coordinates: (${testCase.lat1}, ${testCase.lon1}) vs (${testCase.lat2}, ${testCase.lon2})`);
    console.log(`   Differences: lat=${latDiff.toFixed(6)}, lon=${lonDiff.toFixed(6)}`);
    console.log(`   Expected: ${testCase.expected}, Got: ${result} ${status}\n`);
    
    if (result === testCase.expected) {
      passedTests++;
    }
  });
  
  console.log(`📊 Test Results: ${passedTests}/${testCases.length} tests passed`);
  
  if (passedTests === testCases.length) {
    console.log('🎉 All tests passed! The logic is working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Please check the logic.');
  }
}

/**
 * Test with real-world coordinates (Kolkata area)
 */
function testRealWorldCoordinates() {
  console.log('\n🌍 Testing with Real-World Coordinates (Kolkata Area)\n');
  
  // Example coordinates from your data
  const baseCoordinates = {
    lat: 22.6950,
    lon: 88.3794,
    address: 'Nilgunj Road, Sodepur, Barrackpore, West Bengal, India'
  };
  
  const testCoordinates = [
    {
      lat: 22.6950,
      lon: 88.3794,
      description: 'Exact same location'
    },
    {
      lat: 22.6960,
      lon: 88.3800,
      description: 'Very close (within 0.005 degrees)'
    },
    {
      lat: 22.7000,
      lon: 88.3844,
      description: 'At 0.005 degree boundary'
    },
    {
      lat: 22.7001,
      lon: 88.3845,
      description: 'Just beyond 0.005 degrees'
    },
    {
      lat: 22.7500,
      lon: 88.4000,
      description: 'Far away (different area)'
    }
  ];
  
  console.log(`Base location: ${baseCoordinates.address}`);
  console.log(`Coordinates: (${baseCoordinates.lat}, ${baseCoordinates.lon})\n`);
  
  testCoordinates.forEach((coord, index) => {
    const isNearby = isWithinDegreeThreshold(
      baseCoordinates.lat, 
      baseCoordinates.lon, 
      coord.lat, 
      coord.lon, 
      0.005, 
      0.005
    );
    
    const latDiff = Math.abs(coord.lat - baseCoordinates.lat);
    const lonDiff = Math.abs(coord.lon - baseCoordinates.lon);
    const distance = calculateDistance(baseCoordinates.lat, baseCoordinates.lon, coord.lat, coord.lon);
    
    console.log(`${index + 1}. ${coord.description}`);
    console.log(`   Coordinates: (${coord.lat}, ${coord.lon})`);
    console.log(`   Differences: lat=${latDiff.toFixed(6)}, lon=${lonDiff.toFixed(6)}`);
    console.log(`   Distance: ${distance.toFixed(3)} km`);
    console.log(`   Within threshold: ${isNearby ? '✅ YES' : '❌ NO'}\n`);
  });
}

/**
 * Run all tests
 */
function runAllTests() {
  console.log('🔥 Heatmap Logic Test Suite\n');
  console.log('=' .repeat(50));
  
  testProximityLogic();
  testRealWorldCoordinates();
  
  console.log('=' .repeat(50));
  console.log('✅ All tests completed!');
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests();
}

export { testProximityLogic, testRealWorldCoordinates, runAllTests };
