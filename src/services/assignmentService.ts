import { collection, getDocs, where, query, doc, updateDoc, DocumentData, QueryDocumentSnapshot, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { AssignedWork, SafaiKarmi } from '@/types/staff';
import { simpleWhatsAppService } from './simpleWhatsAppService';

export class AssignmentService {
  /**
   * Fetch assigned work for a specific staff member
   */
  static async getAssignedWorkForStaff(staffId: string): Promise<AssignedWork[]> {
    try {
      const modelResultsRef = collection(db, 'model_results');
      // Remove orderBy to avoid composite index requirement
      const q = query(
        modelResultsRef,
        where('staffId', '==', staffId)
      );
      
      const querySnapshot = await getDocs(q);
      const assignedWork: AssignedWork[] = [];
      
      querySnapshot.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
        const data = doc.data();
        const location = data.location || {};
        
        assignedWork.push({
          detectionId: doc.id,
          address: location.address || data.address || 'Unknown Address',
          latitude: location.latitude || data.latitude || 0,
          longitude: location.longitude || data.longitude || 0,
          confidenceScore: data.confidence_scores || data.confidence_score || 0,
          assignedAt: data.assignedAt || data.createdAt || new Date().toISOString(),
          status: data.workStatus || 'pending'
        });
      });

      // Sort in memory instead of using Firestore orderBy
      return assignedWork.sort((a, b) => 
        new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime()
      );
    } catch (error) {
      console.error('Error fetching assigned work for staff:', error);
      throw new Error('Failed to fetch assigned work');
    }
  }

  /**
   * Fetch all staff with their assigned work
   */
  static async getStaffWithAssignedWork(): Promise<SafaiKarmi[]> {
    try {
      // First get all staff
      const staffRef = collection(db, 'staff');
      const staffSnapshot = await getDocs(staffRef);
      const staff: SafaiKarmi[] = [];
      
      // Process each staff member
      for (const staffDoc of staffSnapshot.docs) {
        const staffData = staffDoc.data();
        const assignedWork = await this.getAssignedWorkForStaff(staffDoc.id);
        
        const completedWork = assignedWork.filter(work => work.status === 'completed').length;
        const pendingWork = assignedWork.filter(work => work.status === 'pending' || work.status === 'in_progress').length;
        
        staff.push({
          id: staffDoc.id,
          name: staffData.name,
          phone: staffData.phone,
          workingArea: staffData.workingArea,
          status: staffData.status,
          joinDate: staffData.joinDate,
          lastActive: staffData.lastActive,
          totalCollections: staffData.totalCollections || 0,
          rating: staffData.rating || 5,
          assignedWork: assignedWork,
          totalAssignedWork: assignedWork.length,
          completedWork: completedWork,
          pendingWork: pendingWork
        });
      }

      return staff;
    } catch (error) {
      console.error('Error fetching staff with assigned work:', error);
      throw new Error('Failed to fetch staff with assigned work');
    }
  }

  /**
   * Get assignment statistics
   */
  static async getAssignmentStats(): Promise<{
    totalAssignments: number;
    pendingAssignments: number;
    completedAssignments: number;
    staffWithWork: number;
    unassignedDetections: number;
  }> {
    try {
      // Get all model results with staff assignments
      const modelResultsRef = collection(db, 'model_results');
      const assignedQuery = query(modelResultsRef, where('staffId', '!=', null));
      const assignedSnapshot = await getDocs(assignedQuery);
      
      // Get all model results (for unassigned count)
      const allQuery = query(modelResultsRef);
      const allSnapshot = await getDocs(allQuery);
      
      let pendingAssignments = 0;
      let completedAssignments = 0;
      const staffWithWorkSet = new Set<string>();
      
      assignedSnapshot.forEach((doc) => {
        const data = doc.data();
        const status = data.workStatus || 'pending';
        
        if (status === 'pending' || status === 'in_progress') {
          pendingAssignments++;
        } else if (status === 'completed') {
          completedAssignments++;
        }
        
        if (data.staffId) {
          staffWithWorkSet.add(data.staffId);
        }
      });
      
      const unassignedDetections = allSnapshot.docs.filter(doc => !doc.data().staffId).length;
      
      return {
        totalAssignments: assignedSnapshot.docs.length,
        pendingAssignments,
        completedAssignments,
        staffWithWork: staffWithWorkSet.size,
        unassignedDetections
      };
    } catch (error) {
      console.error('Error fetching assignment stats:', error);
      throw new Error('Failed to fetch assignment statistics');
    }
  }

  /**
   * Update work status for a specific assignment
   */
  static async updateWorkStatus(detectionId: string, status: 'pending' | 'in_progress' | 'completed' | 'cancelled'): Promise<void> {
    try {
      const detectionRef = doc(db, 'model_results', detectionId);
      await updateDoc(detectionRef, {
        workStatus: status,
        updatedAt: new Date().toISOString()
      });

      // Send WhatsApp notification for status changes
      if (status === 'completed') {
        await this.sendWorkCompletionNotification(detectionId);
      }
    } catch (error) {
      console.error('Error updating work status:', error);
      throw new Error('Failed to update work status');
    }
  }

  /**
   * Assign work to staff member with WhatsApp notification
   */
  static async assignWorkWithNotification(detectionId: string, staffId: string, workingArea: string): Promise<boolean> {
    try {
      // Update the detection with staff assignment
      const detectionRef = doc(db, 'model_results', detectionId);
      await updateDoc(detectionRef, {
        staffId: staffId,
        working_area: workingArea,
        assignedAt: new Date().toISOString(),
        workStatus: 'pending'
      });

      // Get staff member details
      const staffRef = doc(db, 'staff', staffId);
      const staffDoc = await getDoc(staffRef);
      
      if (!staffDoc.exists()) {
        console.error('Staff member not found:', staffId);
        return false;
      }

      const staffData = staffDoc.data();
      const staff: SafaiKarmi = {
        id: staffDoc.id,
        name: staffData.name,
        phone: staffData.phone,
        workingArea: staffData.workingArea,
        status: staffData.status,
        joinDate: staffData.joinDate,
        lastActive: staffData.lastActive,
        totalCollections: staffData.totalCollections || 0,
        rating: staffData.rating || 5
      };

      // Get work details
      const detectionDoc = await getDoc(detectionRef);
      if (!detectionDoc.exists()) {
        console.error('Detection not found:', detectionId);
        return false;
      }

      const detectionData = detectionDoc.data();
      const location = detectionData.location || {};
      
      const work: AssignedWork = {
        detectionId: detectionId,
        address: location.address || detectionData.address || 'Unknown Address',
        latitude: location.latitude || detectionData.latitude || 0,
        longitude: location.longitude || detectionData.longitude || 0,
        confidenceScore: detectionData.confidence_scores || detectionData.confidence_score || 0,
        assignedAt: new Date().toISOString(),
        status: 'pending'
      };

      // Send WhatsApp notification via simple service
      const notificationSent = await simpleWhatsAppService.sendWorkAssignmentNotification(staff, work);
      
      if (notificationSent) {
        console.log(`✅ Work assigned and WhatsApp notification prepared for ${staff.name} (${staff.phone})`);
        // Show notification preview
        if (typeof window !== 'undefined') {
          const message = simpleWhatsAppService['formatWorkAssignmentMessage'](staff, work);
          simpleWhatsAppService.showNotificationPreview(staff, work, message);
        }
      } else {
        console.log(`⚠️ Work assigned but notification failed for ${staff.name} (${staff.phone})`);
      }

      return true;
    } catch (error) {
      console.error('Error assigning work with notification:', error);
      return false;
    }
  }

  /**
   * Send work completion notification
   */
  private static async sendWorkCompletionNotification(detectionId: string): Promise<void> {
    try {
      // Get detection details
      const detectionRef = doc(db, 'model_results', detectionId);
      const detectionDoc = await getDoc(detectionRef);
      
      if (!detectionDoc.exists() || !detectionDoc.data().staffId) {
        return;
      }

      const detectionData = detectionDoc.data();
      const staffId = detectionData.staffId;

      // Get staff member details
      const staffRef = doc(db, 'staff', staffId);
      const staffDoc = await getDoc(staffRef);
      
      if (!staffDoc.exists()) {
        return;
      }

      const staffData = staffDoc.data();
      const staff: SafaiKarmi = {
        id: staffDoc.id,
        name: staffData.name,
        phone: staffData.phone,
        workingArea: staffData.workingArea,
        status: staffData.status,
        joinDate: staffData.joinDate,
        lastActive: staffData.lastActive,
        totalCollections: staffData.totalCollections || 0,
        rating: staffData.rating || 5
      };

      // Get work details
      const location = detectionData.location || {};
      const work: AssignedWork = {
        detectionId: detectionId,
        address: location.address || detectionData.address || 'Unknown Address',
        latitude: location.latitude || detectionData.latitude || 0,
        longitude: location.longitude || detectionData.longitude || 0,
        confidenceScore: detectionData.confidence_scores || detectionData.confidence_score || 0,
        assignedAt: detectionData.assignedAt || new Date().toISOString(),
        status: 'completed'
      };

      // Send completion notification
      await simpleWhatsAppService.sendWorkCompletionNotification(staff, work);
    } catch (error) {
      console.error('Error sending work completion notification:', error);
    }
  }


  /**
   * Get unassigned detections (detections without staffId)
   */
  static async getUnassignedDetections(): Promise<string[]> {
    try {
      const modelResultsRef = collection(db, 'model_results');
      const q = query(modelResultsRef);
      
      const querySnapshot = await getDocs(q);
      const unassignedIds: string[] = [];
      
      querySnapshot.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
        const data = doc.data();
        if (!data.staffId) {
          unassignedIds.push(doc.id);
        }
      });
      
      return unassignedIds;
    } catch (error) {
      console.error('Error fetching unassigned detections:', error);
      throw new Error('Failed to fetch unassigned detections');
    }
  }

  /**
   * Get recent assignments (last 24 hours)
   */
  static async getRecentAssignments(hours: number = 24): Promise<AssignedWork[]> {
    try {
      const modelResultsRef = collection(db, 'model_results');
      const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
      
      // Simplified query without orderBy to avoid composite index requirement
      const q = query(
        modelResultsRef,
        where('staffId', '!=', null)
      );
      
      const querySnapshot = await getDocs(q);
      const recentAssignments: AssignedWork[] = [];
      
      querySnapshot.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
        const data = doc.data();
        const location = data.location || {};
        const assignedAt = data.assignedAt || data.createdAt || new Date().toISOString();
        
        // Filter by time in memory instead of using Firestore where clause
        if (new Date(assignedAt) >= new Date(cutoffTime)) {
          recentAssignments.push({
            detectionId: doc.id,
            address: location.address || data.address || 'Unknown Address',
            latitude: location.latitude || data.latitude || 0,
            longitude: location.longitude || data.longitude || 0,
            confidenceScore: data.confidence_scores || data.confidence_score || 0,
            assignedAt: assignedAt,
            status: data.workStatus || 'pending'
          });
        }
      });

      // Sort in memory instead of using Firestore orderBy
      return recentAssignments.sort((a, b) => 
        new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime()
      );
    } catch (error) {
      console.error('Error fetching recent assignments:', error);
      throw new Error('Failed to fetch recent assignments');
    }
  }
}
