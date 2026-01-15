import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin SDK
const initializeFirebaseAdmin = () => {
  if (getApps().length === 0) {
    // For production, you should use environment variables for the service account
    // For now, using the project ID from your existing config
    initializeApp({
      projectId: 'safai-saathi',
      // In production, add: credential: cert(serviceAccountKey)
    });
  }
  return getFirestore();
};

// Types for our data structures
interface StaffDocument {
  working_area: string;
  [key: string]: unknown;
}

interface ModelResultDocument {
  confidence_scores: number;
  location: {
    address: string;
    latitude: number;
    longitude: number;
  };
  [key: string]: unknown;
}

interface AssignmentData {
  staffId: string;
  working_area: string;
  [key: string]: unknown;
}

/**
 * Assigns a cleaner to a detection based on location matching
 * @param detectionId - The ID of the detection document in model_results collection
 * @returns Promise<boolean> - Returns true if assignment was successful, false otherwise
 */
export async function assignCleaner(detectionId: string): Promise<boolean> {
  try {
    const db = initializeFirebaseAdmin();
    
    // 1. Fetch the detection document from model_results
    const detectionRef = db.collection('model_results').doc(detectionId);
    const detectionDoc = await detectionRef.get();
    
    if (!detectionDoc.exists) {
      console.error(`Detection document with ID ${detectionId} not found`);
      return false;
    }
    
    const detectionData = detectionDoc.data() as ModelResultDocument;
    
    // Check if detection has location.address
    if (!detectionData.location?.address) {
      console.error(`Detection ${detectionId} does not have location.address`);
      return false;
    }
    
    const detectionAddress = detectionData.location.address.toLowerCase();
    console.log(`Processing detection at: ${detectionAddress}`);
    
    // 2. Fetch all documents from staff collection
    const staffSnapshot = await db.collection('staff').get();
    
    if (staffSnapshot.empty) {
      console.log('No staff members found');
      return false;
    }
    
    // 3. Find matching staff
    let matchedStaff: { id: string; working_area: string } | null = null;
    
    for (const staffDoc of staffSnapshot.docs) {
      const staffData = staffDoc.data() as StaffDocument;
      
      // Check if staff has working_area
      if (!staffData.working_area) {
        console.warn(`Staff member ${staffDoc.id} does not have working_area`);
        continue;
      }
      
      // Split working_area into words and convert to lowercase
      const workingAreaWords = staffData.working_area
        .toLowerCase()
        .split(/\s+/)
        .filter(word => word.length > 0);
      
      // Check if ALL words from working_area are contained in the detection address
      const allWordsMatch = workingAreaWords.every(word => 
        detectionAddress.includes(word)
      );
      
      if (allWordsMatch) {
        matchedStaff = {
          id: staffDoc.id,
          working_area: staffData.working_area
        };
        console.log(`Found matching staff: ${staffData.working_area} (ID: ${staffDoc.id})`);
        break; // Use the first match found
      }
    }
    
    // 4. Update detection document with assignment or log no match
    if (matchedStaff) {
      const assignmentData: AssignmentData = {
        staffId: matchedStaff.id,
        working_area: matchedStaff.working_area
      };
      
      await detectionRef.update(assignmentData);
      console.log(`Successfully assigned staff ${matchedStaff.id} to detection ${detectionId}`);
      return true;
    } else {
      console.log('No matching staff found');
      return false;
    }
    
  } catch (error) {
    console.error('Error in assignCleaner:', error);
    throw error;
  }
}

/**
 * Batch assign cleaners to multiple detections
 * @param detectionIds - Array of detection IDs to process
 * @returns Promise<{successful: number, failed: number}> - Assignment results
 */
export async function batchAssignCleaners(detectionIds: string[]): Promise<{successful: number, failed: number}> {
  let successful = 0;
  let failed = 0;
  
  for (const detectionId of detectionIds) {
    try {
      const result = await assignCleaner(detectionId);
      if (result) {
        successful++;
      } else {
        failed++;
      }
    } catch (error) {
      console.error(`Failed to assign cleaner for detection ${detectionId}:`, error);
      failed++;
    }
  }
  
  console.log(`Batch assignment complete: ${successful} successful, ${failed} failed`);
  return { successful, failed };
}

/**
 * Get all unassigned detections (detections without staffId)
 * @returns Promise<string[]> - Array of unassigned detection IDs
 */
export async function getUnassignedDetections(): Promise<string[]> {
  try {
    const db = initializeFirebaseAdmin();
    const unassignedSnapshot = await db.collection('model_results')
      .where('staffId', '==', null)
      .get();
    
    return unassignedSnapshot.docs.map(doc => doc.id);
  } catch (error) {
    console.error('Error fetching unassigned detections:', error);
    throw error;
  }
}

/**
 * Assign cleaners to all unassigned detections
 * @returns Promise<{successful: number, failed: number}> - Assignment results
 */
export async function assignCleanersToUnassigned(): Promise<{successful: number, failed: number}> {
  try {
    const unassignedIds = await getUnassignedDetections();
    console.log(`Found ${unassignedIds.length} unassigned detections`);
    
    if (unassignedIds.length === 0) {
      console.log('No unassigned detections found');
      return { successful: 0, failed: 0 };
    }
    
    return await batchAssignCleaners(unassignedIds);
  } catch (error) {
    console.error('Error assigning cleaners to unassigned detections:', error);
    throw error;
  }
}

// Example usage (uncomment to test):
/*
async function testAssignment() {
  try {
    // Test with a specific detection ID
    const result = await assignCleaner('your-detection-id-here');
    console.log('Assignment result:', result);
    
    // Or assign to all unassigned detections
    const batchResult = await assignCleanersToUnassigned();
    console.log('Batch assignment result:', batchResult);
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Uncomment to run test
// testAssignment();
*/
