/**
 * Test script for assign-cleaner functionality
 * Run this with: npx tsx src/scripts/test-assignment.ts
 */

import { assignCleaner, getUnassignedDetections } from './assign-cleaner';

/**
 * Test the assignment functionality with a real detection ID
 */
async function testAssignment() {
  console.log('🧪 Testing Assign Cleaner Functionality\n');
  
  try {
    // First, let's see what unassigned detections we have
    console.log('1. Checking for unassigned detections...');
    const unassignedIds = await getUnassignedDetections();
    console.log(`   Found ${unassignedIds.length} unassigned detections`);
    
    if (unassignedIds.length === 0) {
      console.log('   ℹ️  No unassigned detections found. You can create a test detection or use an existing one.');
      console.log('   To test with a specific detection ID, modify the testDetectionId variable below.');
      return;
    }
    
    // Test with the first unassigned detection
    const testDetectionId = unassignedIds[0];
    console.log(`\n2. Testing assignment with detection: ${testDetectionId}`);
    
    const success = await assignCleaner(testDetectionId);
    
    if (success) {
      console.log('   ✅ Assignment successful!');
      console.log('   Check your Firestore to see the updated detection document.');
    } else {
      console.log('   ❌ Assignment failed - no matching staff found');
      console.log('   This could mean:');
      console.log('   - No staff members have working areas that match the detection address');
      console.log('   - The detection address format doesn\'t match staff working areas');
      console.log('   - Staff collection is empty');
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
    console.log('\nTroubleshooting tips:');
    console.log('1. Make sure Firebase Admin SDK is properly configured');
    console.log('2. Check that your Firestore collections exist and have data');
    console.log('3. Verify the service account has proper permissions');
    console.log('4. Check the console for more detailed error messages');
  }
}

/**
 * Test with a specific detection ID (modify this for your use case)
 */
async function testWithSpecificId() {
  const testDetectionId = 'your-detection-id-here'; // Replace with actual ID
  
  console.log(`🧪 Testing with specific detection ID: ${testDetectionId}\n`);
  
  try {
    const success = await assignCleaner(testDetectionId);
    
    if (success) {
      console.log('✅ Assignment successful!');
    } else {
      console.log('❌ Assignment failed - no matching staff found');
    }
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
if (require.main === module) {
  testAssignment();
}

export { testAssignment, testWithSpecificId };
