/**
 * Example usage of the assign-cleaner script
 * This file demonstrates how to use the assignment functions
 */

import { 
  assignCleaner, 
  batchAssignCleaners, 
  assignCleanersToUnassigned,
  getUnassignedDetections 
} from './assign-cleaner';

/**
 * Example 1: Assign a cleaner to a specific detection
 */
async function exampleSingleAssignment() {
  console.log('=== Single Assignment Example ===');
  
  try {
    // Replace with an actual detection ID from your Firestore
    const detectionId = 'example-detection-id';
    const success = await assignCleaner(detectionId);
    
    if (success) {
      console.log(`✅ Successfully assigned cleaner to detection ${detectionId}`);
    } else {
      console.log(`❌ Failed to assign cleaner to detection ${detectionId}`);
    }
  } catch (error) {
    console.error('Error in single assignment:', error);
  }
}

/**
 * Example 2: Batch assign cleaners to multiple detections
 */
async function exampleBatchAssignment() {
  console.log('\n=== Batch Assignment Example ===');
  
  try {
    // Replace with actual detection IDs from your Firestore
    const detectionIds = [
      'detection-id-1',
      'detection-id-2', 
      'detection-id-3'
    ];
    
    const result = await batchAssignCleaners(detectionIds);
    console.log(`Batch assignment completed: ${result.successful} successful, ${result.failed} failed`);
  } catch (error) {
    console.error('Error in batch assignment:', error);
  }
}

/**
 * Example 3: Assign cleaners to all unassigned detections
 */
async function exampleUnassignedAssignment() {
  console.log('\n=== Unassigned Assignment Example ===');
  
  try {
    // First, check how many unassigned detections we have
    const unassignedIds = await getUnassignedDetections();
    console.log(`Found ${unassignedIds.length} unassigned detections`);
    
    if (unassignedIds.length > 0) {
      const result = await assignCleanersToUnassigned();
      console.log(`Assignment completed: ${result.successful} successful, ${result.failed} failed`);
    } else {
      console.log('No unassigned detections found');
    }
  } catch (error) {
    console.error('Error in unassigned assignment:', error);
  }
}

/**
 * Example 4: Monitor assignment process with detailed logging
 */
async function exampleDetailedAssignment() {
  console.log('\n=== Detailed Assignment Example ===');
  
  try {
    const unassignedIds = await getUnassignedDetections();
    console.log(`Processing ${unassignedIds.length} unassigned detections...`);
    
    let processed = 0;
    for (const detectionId of unassignedIds.slice(0, 5)) { // Process first 5 for demo
      console.log(`\nProcessing detection ${detectionId}...`);
      const success = await assignCleaner(detectionId);
      processed++;
      
      if (success) {
        console.log(`✅ Detection ${detectionId} assigned successfully`);
      } else {
        console.log(`❌ Detection ${detectionId} could not be assigned`);
      }
      
      // Add a small delay to avoid overwhelming Firestore
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`\nProcessed ${processed} detections`);
  } catch (error) {
    console.error('Error in detailed assignment:', error);
  }
}

/**
 * Run all examples
 */
async function runAllExamples() {
  console.log('🚀 Starting Assign Cleaner Examples\n');
  
  await exampleSingleAssignment();
  await exampleBatchAssignment();
  await exampleUnassignedAssignment();
  await exampleDetailedAssignment();
  
  console.log('\n✨ All examples completed!');
}

// Uncomment the line below to run the examples
// runAllExamples();

export {
  exampleSingleAssignment,
  exampleBatchAssignment,
  exampleUnassignedAssignment,
  exampleDetailedAssignment,
  runAllExamples
};
