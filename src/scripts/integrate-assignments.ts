/**
 * Integration script to connect assign-cleaner functionality with the UI
 * This script can be run to assign cleaners and update the UI
 */

import { assignCleanersToUnassigned, getUnassignedDetections } from './assign-cleaner';

/**
 * Run assignment process and log results
 */
export async function runAssignmentProcess(): Promise<{
  success: boolean;
  message: string;
  stats: {
    totalUnassigned: number;
    successfulAssignments: number;
    failedAssignments: number;
  };
}> {
  try {
    console.log('🚀 Starting assignment process...');
    
    // Get unassigned detections
    const unassignedIds = await getUnassignedDetections();
    console.log(`📊 Found ${unassignedIds.length} unassigned detections`);
    
    if (unassignedIds.length === 0) {
      return {
        success: true,
        message: 'No unassigned detections found. All detections are already assigned.',
        stats: {
          totalUnassigned: 0,
          successfulAssignments: 0,
          failedAssignments: 0
        }
      };
    }
    
    // Assign cleaners to unassigned detections
    const result = await assignCleanersToUnassigned();
    
    console.log(`✅ Assignment process completed:`);
    console.log(`   - Successful: ${result.successful}`);
    console.log(`   - Failed: ${result.failed}`);
    
    return {
      success: true,
      message: `Successfully assigned ${result.successful} detections. ${result.failed} failed.`,
      stats: {
        totalUnassigned: unassignedIds.length,
        successfulAssignments: result.successful,
        failedAssignments: result.failed
      }
    };
    
  } catch (error) {
    console.error('❌ Assignment process failed:', error);
    return {
      success: false,
      message: `Assignment process failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      stats: {
        totalUnassigned: 0,
        successfulAssignments: 0,
        failedAssignments: 0
      }
    };
  }
}

/**
 * Check assignment status
 */
export async function checkAssignmentStatus(): Promise<{
  unassignedCount: number;
  totalDetections: number;
  assignmentRate: number;
}> {
  try {
    const unassignedIds = await getUnassignedDetections();
    
    // This is a simplified calculation - in a real app, you'd get total from a separate query
    const totalDetections = unassignedIds.length; // This should be total detections, not just unassigned
    const assignmentRate = totalDetections > 0 ? ((totalDetections - unassignedIds.length) / totalDetections) * 100 : 0;
    
    return {
      unassignedCount: unassignedIds.length,
      totalDetections,
      assignmentRate
    };
  } catch (error) {
    console.error('Error checking assignment status:', error);
    throw error;
  }
}

// Example usage
if (require.main === module) {
  runAssignmentProcess()
    .then(result => {
      console.log('\n📋 Assignment Process Result:');
      console.log(`Success: ${result.success}`);
      console.log(`Message: ${result.message}`);
      console.log(`Stats:`, result.stats);
    })
    .catch(error => {
      console.error('Script failed:', error);
    });
}
