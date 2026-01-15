/**
 * Example usage of the heatmap processor
 * This file demonstrates how to use the heatmap processing functions
 */

import { 
  processDetection, 
  processDetectionsBatch, 
  processAllDetections, 
  getAllDetectionIds,
  getProcessingStats 
} from './heatmap-processor';

/**
 * Example 1: Process a single detection
 */
async function exampleSingleDetection() {
  console.log('🔍 Example 1: Processing Single Detection\n');
  
  try {
    // Replace with an actual detection ID from your Firestore
    const detectionId = 'your-detection-id-here';
    const result = await processDetection(detectionId);
    
    console.log('Result:', result);
    console.log(`Action: ${result.action}`);
    console.log(`Reason: ${result.reason}`);
    
  } catch (error) {
    console.error('Error processing single detection:', error);
  }
}

/**
 * Example 2: Process specific detections
 */
async function exampleBatchProcessing() {
  console.log('\n🔍 Example 2: Processing Specific Detections\n');
  
  try {
    // Replace with actual detection IDs
    const detectionIds = [
      'detection-id-1',
      'detection-id-2',
      'detection-id-3'
    ];
    
    const results = await processDetectionsBatch(detectionIds);
    
    console.log('Batch processing results:');
    results.forEach((result, index) => {
      console.log(`${index + 1}. ${result.action.toUpperCase()}: ${result.address}`);
    });
    
    const stats = getProcessingStats(results);
    console.log('\nStatistics:', stats);
    
  } catch (error) {
    console.error('Error processing batch:', error);
  }
}

/**
 * Example 3: Process all detections
 */
async function exampleProcessAll() {
  console.log('\n🔍 Example 3: Processing All Detections\n');
  
  try {
    const results = await processAllDetections();
    const stats = getProcessingStats(results);
    
    console.log('Processing completed!');
    console.log('Statistics:', stats);
    
    // Show some examples
    console.log('\nSample results:');
    results.slice(0, 3).forEach((result, index) => {
      console.log(`${index + 1}. ${result.action}: ${result.address} (${result.confidence})`);
    });
    
  } catch (error) {
    console.error('Error processing all detections:', error);
  }
}

/**
 * Example 4: Get detection IDs first, then process
 */
async function exampleGetIdsFirst() {
  console.log('\n🔍 Example 4: Get IDs First, Then Process\n');
  
  try {
    // Get all detection IDs
    const detectionIds = await getAllDetectionIds();
    console.log(`Found ${detectionIds.length} detections`);
    
    // Process only the first 5 (for demo)
    const firstFive = detectionIds.slice(0, 5);
    console.log(`Processing first 5 detections...`);
    
    const results = await processDetectionsBatch(firstFive);
    
    results.forEach((result, index) => {
      console.log(`${index + 1}. ${result.action}: ${result.address}`);
    });
    
  } catch (error) {
    console.error('Error in example 4:', error);
  }
}

/**
 * Run all examples
 */
async function runAllExamples() {
  console.log('🚀 Heatmap Processor Examples\n');
  
  await exampleSingleDetection();
  await exampleBatchProcessing();
  await exampleProcessAll();
  await exampleGetIdsFirst();
  
  console.log('\n✅ All examples completed!');
}

// Run examples if this file is executed directly
if (require.main === module) {
  runAllExamples().catch(console.error);
}

export {
  exampleSingleDetection,
  exampleBatchProcessing,
  exampleProcessAll,
  exampleGetIdsFirst,
  runAllExamples
};
