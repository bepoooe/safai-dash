/**
 * Test script for automatic work assignment
 * This script tests the assignment logic with real data
 */

import { collection, getDocs, DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface StaffMember {
  id: string;
  name: string;
  workingArea: string;
  status: string;
}

interface Detection {
  id: string;
  address: string;
  staffId?: string;
}

/**
 * Test the assignment logic
 */
async function testAssignmentLogic() {
  try {
    console.log('🧪 Testing Assignment Logic\n');

    // 1. Get all staff members
    console.log('1. Fetching staff members...');
    const staffRef = collection(db, 'staff');
    const staffSnapshot = await getDocs(staffRef);
    const staffMembers: StaffMember[] = [];
    
    staffSnapshot.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
      const data = doc.data();
      staffMembers.push({
        id: doc.id,
        name: data.name,
        workingArea: data.workingArea,
        status: data.status
      });
    });
    
    console.log(`   Found ${staffMembers.length} staff members:`);
    staffMembers.forEach(staff => {
      console.log(`   - ${staff.name} (${staff.workingArea}) - ${staff.status}`);
    });

    // 2. Get all detections
    console.log('\n2. Fetching detections...');
    const modelResultsRef = collection(db, 'model_results');
    const detectionsSnapshot = await getDocs(modelResultsRef);
    const detections: Detection[] = [];
    
    detectionsSnapshot.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
      const data = doc.data();
      const address = data.location?.address || data.address || '';
      detections.push({
        id: doc.id,
        address: address,
        staffId: data.staffId
      });
    });
    
    console.log(`   Found ${detections.length} detections:`);
    detections.forEach(detection => {
      console.log(`   - ${detection.address} ${detection.staffId ? '(ASSIGNED)' : '(UNASSIGNED)'}`);
    });

    // 3. Test assignment logic
    console.log('\n3. Testing assignment logic...');
    const activeStaff = staffMembers.filter(s => s.status === 'Active');
    const unassignedDetections = detections.filter(d => !d.staffId);
    
    console.log(`   Active staff: ${activeStaff.length}`);
    console.log(`   Unassigned detections: ${unassignedDetections.length}`);

    let matchesFound = 0;

    for (const detection of unassignedDetections) {
      console.log(`\n   Testing detection: "${detection.address}"`);
      
      for (const staff of activeStaff) {
        if (!staff.workingArea) continue;
        
        const workingAreaWords = staff.workingArea
          .toLowerCase()
          .split(/\s+/)
          .filter(word => word.length > 0);
        
        const lowerAddress = detection.address.toLowerCase();
        
        // Check if ALL words from working area are in the address
        const allWordsMatch = workingAreaWords.every(word => 
          lowerAddress.includes(word)
        );
        
        if (allWordsMatch) {
          console.log(`   ✅ MATCH: ${staff.name} (${staff.workingArea}) matches "${detection.address}"`);
          matchesFound++;
          break;
        } else {
          console.log(`   ❌ No match: ${staff.name} (${staff.workingArea}) doesn't match "${detection.address}"`);
        }
      }
    }

    console.log(`\n📊 Results:`);
    console.log(`   Total staff: ${staffMembers.length}`);
    console.log(`   Active staff: ${activeStaff.length}`);
    console.log(`   Total detections: ${detections.length}`);
    console.log(`   Unassigned detections: ${unassignedDetections.length}`);
    console.log(`   Potential matches: ${matchesFound}`);

    if (matchesFound > 0) {
      console.log('\n🎉 Assignment logic is working! Matches found.');
    } else {
      console.log('\n⚠️  No matches found. Check if:');
      console.log('   - Staff working areas match detection addresses');
      console.log('   - Addresses contain the working area words');
      console.log('   - Both are in the same case (lowercase comparison)');
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
if (require.main === module) {
  testAssignmentLogic();
}

export { testAssignmentLogic };
