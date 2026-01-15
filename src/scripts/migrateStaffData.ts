/**
 * Migration script to move hardcoded staff data to Firebase
 * This script should be run once to migrate the existing hardcoded data
 */

import { FirebaseService } from '@/services/firebaseService';

export async function migrateStaffData() {
  try {
    console.log('Starting staff data migration...');
    await FirebaseService.migrateStaffData();
    console.log('Staff data migration completed successfully!');
  } catch (error) {
    console.error('Staff data migration failed:', error);
    throw error;
  }
}

// Function to be called from the staff page for one-time migration
export async function runStaffMigration() {
  try {
    await migrateStaffData();
    return { success: true, message: 'Staff data migrated successfully!' };
  } catch (error) {
    return { 
      success: false, 
      message: `Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
    };
  }
}
