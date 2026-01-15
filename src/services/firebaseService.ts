import { collection, getDocs, query, orderBy, limit, DocumentData, QueryDocumentSnapshot, addDoc, updateDoc, deleteDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ModelResult, ModelResultsResponse, AreaData } from '@/types/garbage-detection';
import { SafaiKarmi } from '@/types/staff';
import { Citizen, CitizenStats } from '@/types/citizen';
import { CloudinaryAnalysis } from '@/types/cloudinary';

export class FirebaseService {
  /**
   * Fetch all documents from the model_results collection
   */
  static async fetchModelResults(): Promise<ModelResultsResponse> {
    try {
      const modelResultsRef = collection(db, 'model_results');
      const q = query(modelResultsRef, orderBy('timestamp', 'desc'));
      
      const querySnapshot = await getDocs(q);
      const results: ModelResult[] = [];
      
      querySnapshot.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
        const data = doc.data();
        
        // Extract GPS location object fields
        const gpsLocation = data.gps_location || {};
        const detectionSummary = data.detection_summary || {};
        
        // Use detection summary for confidence score
        const confidenceScore = detectionSummary.average_confidence || 0;
        
        results.push({
          id: doc.id,
          latitude: gpsLocation.latitude || 0,
          longitude: gpsLocation.longitude || 0,
          confidence_score: confidenceScore,
          accuracy: typeof gpsLocation.accuracy === 'string' ? 
            parseFloat(gpsLocation.accuracy.replace(/[^\d.]/g, '')) : 
            (gpsLocation.accuracy || 0),
          address: gpsLocation.address || 'Unknown Address',
          timestamp: data.timestamp || data.saved_at || new Date().toISOString(),
          model_version: data.source || 'unknown',
          image_url: data.image_url,
          status: detectionSummary.status || 'UNKNOWN',
          overflow_score: detectionSummary.overflow_score || 0,
          total_detections: detectionSummary.total_detections || 0
        });
      });

      // Calculate average confidence
      const averageConfidence = results.length > 0 
        ? results.reduce((sum, result) => sum + result.confidence_score, 0) / results.length
        : 0;

      return {
        results,
        totalCount: results.length,
        averageConfidence,
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error fetching model results:', error);
      throw new Error('Failed to fetch model results from Firebase');
    }
  }

  /**
   * Fetch unique areas from model results
   */
  static async fetchUniqueAreas(): Promise<AreaData[]> {
    try {
      const modelResultsRef = collection(db, 'model_results');
      const q = query(modelResultsRef, orderBy('createdAt', 'desc'));
      
      const querySnapshot = await getDocs(q);
      const areaMap = new Map<string, { count: number; latestDetection: string }>();
      
      querySnapshot.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
        const data = doc.data();
        const location = data.location || {};
        const address = location.address || data.address || 'Unknown Address';
        
        // Extract area from address (you can modify this logic based on your address format)
        const area = this.extractAreaFromAddress(address);
        
        if (areaMap.has(area)) {
          const existing = areaMap.get(area)!;
          areaMap.set(area, {
            count: existing.count + 1,
            latestDetection: existing.latestDetection > (data.createdAt || data.timestamp) 
              ? existing.latestDetection 
              : (data.createdAt || data.timestamp)
          });
        } else {
          areaMap.set(area, {
            count: 1,
            latestDetection: data.createdAt || data.timestamp || new Date().toISOString()
          });
        }
      });

      // Convert map to array and sort by detection count
      return Array.from(areaMap.entries())
        .map(([area, data]) => ({
          area,
          count: data.count,
          latestDetection: data.latestDetection
        }))
        .sort((a, b) => b.count - a.count);
    } catch (error) {
      console.error('Error fetching unique areas:', error);
      throw new Error('Failed to fetch unique areas from Firebase');
    }
  }

  /**
   * Extract area name from address string
   */
  private static extractAreaFromAddress(address: string): string {
    // Split address by comma and take the first meaningful part
    const parts = address.split(',').map(part => part.trim());
    
    // Look for common area indicators
    for (const part of parts) {
      if (part && 
          !part.includes('India') && 
          !part.includes('West Bengal') && 
          !part.includes('North 24 Parganas') &&
          !part.includes('Barrackpore') &&
          !part.match(/^\d+$/) && // Not just numbers
          part.length > 2) {
        return part;
      }
    }
    
    // Fallback to first non-empty part
    return parts.find(part => part && part.length > 2) || 'Unknown Area';
  }

  /**
   * Fetch model results for a specific area
   */
  static async fetchModelResultsByArea(area: string): Promise<ModelResultsResponse> {
    try {
      const modelResultsRef = collection(db, 'model_results');
      const q = query(modelResultsRef, orderBy('createdAt', 'desc'));
      
      const querySnapshot = await getDocs(q);
      const results: ModelResult[] = [];
      
      querySnapshot.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
        const data = doc.data();
        const location = data.location || {};
        const address = location.address || data.address || 'Unknown Address';
        
        // Check if this result belongs to the specified area
        if (this.extractAreaFromAddress(address) === area) {
          // Handle confidence_scores array - calculate average if it's an array
          let confidenceScore = 0;
          if (data.confidence_scores && Array.isArray(data.confidence_scores)) {
            const sum = data.confidence_scores.reduce((acc: number, score: number) => acc + score, 0);
            confidenceScore = data.confidence_scores.length > 0 ? sum / data.confidence_scores.length : 0;
          } else if (data.confidence_score) {
            confidenceScore = data.confidence_score;
          }
          
          results.push({
            id: doc.id,
            latitude: location.latitude || data.latitude || 0,
            longitude: location.longitude || data.longitude || 0,
            confidence_score: confidenceScore,
            accuracy: location.accuracy || data.accuracy || 0,
            address: address,
            timestamp: data.createdAt || data.timestamp || new Date().toISOString(),
            model_version: data.model_version,
            image_url: data.image_url
          });
        }
      });

      // Calculate average confidence
      const averageConfidence = results.length > 0 
        ? results.reduce((sum, result) => sum + result.confidence_score, 0) / results.length
        : 0;

      return {
        results,
        totalCount: results.length,
        averageConfidence,
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error fetching model results by area:', error);
      throw new Error('Failed to fetch model results by area from Firebase');
    }
  }

  /**
   * Fetch model results with pagination
   */
  static async fetchModelResultsPaginated(
    pageSize: number = 100
  ): Promise<ModelResultsResponse> {
    try {
      const modelResultsRef = collection(db, 'model_results');
      const q = query(
        modelResultsRef, 
        orderBy('createdAt', 'desc'),
        limit(pageSize)
      );

      const querySnapshot = await getDocs(q);
      const results: ModelResult[] = [];
      
      querySnapshot.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
        const data = doc.data();
        
        // Extract location object fields
        const location = data.location || {};
        
        // Handle confidence_scores array - calculate average if it's an array
        let confidenceScore = 0;
        if (data.confidence_scores && Array.isArray(data.confidence_scores)) {
          // Calculate average of confidence_scores array
          const sum = data.confidence_scores.reduce((acc: number, score: number) => acc + score, 0);
          confidenceScore = data.confidence_scores.length > 0 ? sum / data.confidence_scores.length : 0;
        } else if (data.confidence_score) {
          // Fallback to single confidence_score if array doesn't exist
          confidenceScore = data.confidence_score;
        }
        
        results.push({
          id: doc.id,
          latitude: location.latitude || data.latitude || 0,
          longitude: location.longitude || data.longitude || 0,
          confidence_score: confidenceScore,
          accuracy: location.accuracy || data.accuracy || 0,
          address: location.address || data.address || 'Unknown Address',
          timestamp: data.createdAt || data.timestamp || new Date().toISOString(),
          model_version: data.model_version,
          image_url: data.image_url
        });
      });

      const averageConfidence = results.length > 0 
        ? results.reduce((sum, result) => sum + result.confidence_score, 0) / results.length
        : 0;


      return {
        results,
        totalCount: results.length,
        averageConfidence,
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error fetching paginated model results:', error);
      throw new Error('Failed to fetch paginated model results from Firebase');
    }
  }

  // ==================== STAFF MANAGEMENT ====================

  /**
   * Fetch all staff members from the staff collection
   */
  static async fetchStaff(): Promise<SafaiKarmi[]> {
    try {
      const staffRef = collection(db, 'staff');
      const q = query(staffRef, orderBy('joinDate', 'desc'));
      
      const querySnapshot = await getDocs(q);
      const staff: SafaiKarmi[] = [];
      
      querySnapshot.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
        const data = doc.data();
        staff.push({
          id: doc.id,
          name: data.name,
          phone: data.phone,
          workingArea: data.workingArea,
          status: data.status,
          joinDate: data.joinDate,
          lastActive: data.lastActive,
          totalCollections: data.totalCollections || 0,
          rating: data.rating || 5
        });
      });

      return staff;
    } catch (error) {
      console.error('Error fetching staff:', error);
      throw new Error('Failed to fetch staff from Firebase');
    }
  }

  /**
   * Add a new staff member to the staff collection
   */
  static async addStaff(karmiData: Omit<SafaiKarmi, 'id'>): Promise<string> {
    try {
      const staffRef = collection(db, 'staff');
      const docRef = await addDoc(staffRef, {
        ...karmiData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      return docRef.id;
    } catch (error) {
      console.error('Error adding staff:', error);
      throw new Error('Failed to add staff to Firebase');
    }
  }

  /**
   * Update an existing staff member
   */
  static async updateStaff(id: string, karmiData: Omit<SafaiKarmi, 'id'>): Promise<void> {
    try {
      const staffDoc = doc(db, 'staff', id);
      await updateDoc(staffDoc, {
        ...karmiData,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error updating staff:', error);
      throw new Error('Failed to update staff in Firebase');
    }
  }

  /**
   * Delete a staff member
   */
  static async deleteStaff(id: string): Promise<void> {
    try {
      const staffDoc = doc(db, 'staff', id);
      await deleteDoc(staffDoc);
    } catch (error) {
      console.error('Error deleting staff:', error);
      throw new Error('Failed to delete staff from Firebase');
    }
  }

  /**
   * Get a single staff member by ID
   */
  static async getStaffById(id: string): Promise<SafaiKarmi | null> {
    try {
      const staffDoc = doc(db, 'staff', id);
      const docSnap = await getDoc(staffDoc);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          name: data.name,
          phone: data.phone,
          workingArea: data.workingArea,
          status: data.status,
          joinDate: data.joinDate,
          lastActive: data.lastActive,
          totalCollections: data.totalCollections || 0,
          rating: data.rating || 5
        };
      } else {
        return null;
      }
    } catch (error) {
      console.error('Error getting staff by ID:', error);
      throw new Error('Failed to get staff from Firebase');
    }
  }

  /**
   * Migrate hardcoded staff data to Firebase (one-time operation)
   */
  static async migrateStaffData(): Promise<void> {
    try {
      const hardcodedStaff: Omit<SafaiKarmi, 'id'>[] = [
        {
          name: 'Ram Prasad Yadav',
          phone: '+91 98765 43210',
          workingArea: 'Sector 1 - Salt Lake',
          status: 'Active',
          joinDate: '2023-01-15',
          lastActive: '2 hours ago',
          totalCollections: 1247,
          rating: 4.8
        },
        {
          name: 'Sunita Devi',
          phone: '+91 98765 43211',
          workingArea: 'Sector 2 - Salt Lake',
          status: 'Active',
          joinDate: '2023-02-20',
          lastActive: '1 hour ago',
          totalCollections: 1156,
          rating: 4.9
        },
        {
          name: 'Mohammad Ali',
          phone: '+91 98765 43212',
          workingArea: 'Park Street Area',
          status: 'On Leave',
          joinDate: '2022-11-10',
          lastActive: '3 days ago',
          totalCollections: 2103,
          rating: 4.7
        },
        {
          name: 'Priya Kumari',
          phone: '+91 98765 43213',
          workingArea: 'New Market Area',
          status: 'Active',
          joinDate: '2023-03-05',
          lastActive: '30 minutes ago',
          totalCollections: 892,
          rating: 4.6
        },
        {
          name: 'Biswajit Mondal',
          phone: '+91 98765 43214',
          workingArea: 'Howrah Station Area',
          status: 'Active',
          joinDate: '2022-08-12',
          lastActive: '45 minutes ago',
          totalCollections: 1876,
          rating: 4.9
        },
        {
          name: 'Rekha Singh',
          phone: '+91 98765 43215',
          workingArea: 'Ballygunge Area',
          status: 'Inactive',
          joinDate: '2023-01-08',
          lastActive: '1 week ago',
          totalCollections: 567,
          rating: 4.2
        },
        {
          name: 'Amit Kumar',
          phone: '+91 98765 43216',
          workingArea: 'Tollygunge Area',
          status: 'Active',
          joinDate: '2023-04-15',
          lastActive: '1 hour ago',
          totalCollections: 743,
          rating: 4.5
        },
        {
          name: 'Kavita Sharma',
          phone: '+91 98765 43217',
          workingArea: 'Garia Area',
          status: 'Active',
          joinDate: '2022-12-03',
          lastActive: '2 hours ago',
          totalCollections: 1345,
          rating: 4.8
        }
      ];

      // Check if staff collection already has data
      const existingStaff = await this.fetchStaff();
      if (existingStaff.length > 0) {
        console.log('Staff data already exists in Firebase. Skipping migration.');
        return;
      }

      // Add each staff member to Firebase
      for (const staffMember of hardcodedStaff) {
        await this.addStaff(staffMember);
      }

      console.log('Successfully migrated staff data to Firebase');
    } catch (error) {
      console.error('Error migrating staff data:', error);
      throw new Error('Failed to migrate staff data to Firebase');
    }
  }

  // ==================== CITIZEN MANAGEMENT ====================

  /**
   * Fetch all citizens from the civilian collection
   */
  static async fetchCitizens(): Promise<Citizen[]> {
    try {
      const citizensRef = collection(db, 'civilian');
      const q = query(citizensRef, orderBy('timestamp', 'desc'));
      
      const querySnapshot = await getDocs(q);
      const citizens: Citizen[] = [];
      
      querySnapshot.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
        const data = doc.data();
        citizens.push({
          id: doc.id,
          name: data.name || 'Unknown',
          imageUrl: data.imageUrl || '',
          location: {
            latitude: data.location?.latitude || 0,
            longitude: data.location?.longitude || 0,
            accuracy: data.location?.accuracy,
            address: data.location?.address
          },
          description: data.description || '',
          timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : new Date(data.timestamp),
          status: data.status || 'pending',
          email: data.email,
          phone: data.phone,
          area: data.area,
          language: data.language || 'en',
          notifications: data.notifications || true,
          totalReports: data.totalReports || 0,
          verifiedReports: data.verifiedReports || 0
        });
      });

      return citizens;
    } catch (error) {
      console.error('Error fetching citizens:', error);
      throw new Error('Failed to fetch citizens from Firebase');
    }
  }

  /**
   * Add a new citizen to the civilian collection
   */
  static async addCitizen(citizenData: Omit<Citizen, 'id'>): Promise<string> {
    try {
      const citizensRef = collection(db, 'civilian');
      const docRef = await addDoc(citizensRef, {
        ...citizenData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      return docRef.id;
    } catch (error) {
      console.error('Error adding citizen:', error);
      throw new Error('Failed to add citizen to Firebase');
    }
  }

  /**
   * Update an existing citizen
   */
  static async updateCitizen(id: string, citizenData: Omit<Citizen, 'id'>): Promise<void> {
    try {
      const citizenDoc = doc(db, 'civilian', id);
      await updateDoc(citizenDoc, {
        ...citizenData,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error updating citizen:', error);
      throw new Error('Failed to update citizen in Firebase');
    }
  }

  /**
   * Delete a citizen
   */
  static async deleteCitizen(id: string): Promise<void> {
    try {
      const citizenDoc = doc(db, 'civilian', id);
      await deleteDoc(citizenDoc);
    } catch (error) {
      console.error('Error deleting citizen:', error);
      throw new Error('Failed to delete citizen from Firebase');
    }
  }

  /**
   * Get a single citizen by ID
   */
  static async getCitizenById(id: string): Promise<Citizen | null> {
    try {
      const citizenDoc = doc(db, 'civilian', id);
      const docSnap = await getDoc(citizenDoc);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          name: data.name || 'Unknown',
          imageUrl: data.imageUrl || '',
          location: {
            latitude: data.location?.latitude || 0,
            longitude: data.location?.longitude || 0,
            accuracy: data.location?.accuracy,
            address: data.location?.address
          },
          description: data.description || '',
          timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : new Date(data.timestamp),
          status: data.status || 'pending',
          email: data.email,
          phone: data.phone,
          area: data.area,
          language: data.language || 'en',
          notifications: data.notifications || true,
          totalReports: data.totalReports || 0,
          verifiedReports: data.verifiedReports || 0
        };
      } else {
        return null;
      }
    } catch (error) {
      console.error('Error getting citizen by ID:', error);
      throw new Error('Failed to get citizen from Firebase');
    }
  }

  /**
   * Get citizen statistics
   */
  static async getCitizenStats(): Promise<CitizenStats> {
    try {
      const citizens = await this.fetchCitizens();
      
      const totalCitizens = citizens.length;
      const pendingCitizens = citizens.filter(c => c.status === 'pending').length;
      const inProgressCitizens = citizens.filter(c => c.status === 'in_progress').length;
      const resolvedCitizens = citizens.filter(c => c.status === 'resolved').length;
      const totalReports = citizens.reduce((sum, c) => sum + (c.totalReports || 0), 0);
      const verifiedReports = citizens.reduce((sum, c) => sum + (c.verifiedReports || 0), 0);
      const averageReportsPerCitizen = totalCitizens > 0 ? totalReports / totalCitizens : 0;

      return {
        totalCitizens,
        pendingCitizens,
        inProgressCitizens,
        resolvedCitizens,
        totalReports,
        verifiedReports,
        averageReportsPerCitizen
      };
    } catch (error) {
      console.error('Error getting citizen stats:', error);
      throw new Error('Failed to get citizen statistics from Firebase');
    }
  }

  // ==================== CLOUDINARY ANALYSIS RESULTS ====================

  /**
   * Fetch citizen report details from cloudinary_analysis_results collection
   */
  static async fetchCloudinaryAnalysisResults(): Promise<CloudinaryAnalysis[]> {
    try {
      const cloudinaryRef = collection(db, 'cloudinary_analysis_results');
      const q = query(cloudinaryRef, orderBy('timestamp', 'desc'));
      
      const querySnapshot = await getDocs(q);
      const results: CloudinaryAnalysis[] = [];
      
      querySnapshot.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
        const data = doc.data();
        results.push({
          id: doc.id,
          imageId: data.imageId,
          imageUrl: data.imageUrl,
          status: data.status,
          confidence_scores: data.confidence_scores || [],
          detection_details: data.detection_details || [],
          detection_count: data.detection_count || 0,
          average_confidence: data.average_confidence || 0,
          max_confidence: data.max_confidence || 0,
          min_confidence: data.min_confidence || 0,
          timestamp: data.timestamp || data.saved_at || new Date().toISOString(),
          saved_at: data.saved_at,
          source: data.source
        });
      });

      return results;
    } catch (error) {
      console.error('Error fetching cloudinary analysis results:', error);
      throw new Error('Failed to fetch cloudinary analysis results from Firebase');
    }
  }

  /**
   * Get cloudinary analysis result by ID
   */
  static async getCloudinaryAnalysisById(id: string): Promise<CloudinaryAnalysis | null> {
    try {
      const cloudinaryDoc = doc(db, 'cloudinary_analysis_results', id);
      const docSnap = await getDoc(cloudinaryDoc);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          createdAt: data.createdAt || new Date().toISOString(),
          timestamp: data.timestamp || data.createdAt || new Date().toISOString()
        };
      } else {
        return null;
      }
    } catch (error) {
      console.error('Error getting cloudinary analysis by ID:', error);
      throw new Error('Failed to get cloudinary analysis from Firebase');
    }
  }

  /**
   * Update cloudinary analysis result status
   */
  static async updateCloudinaryAnalysisStatus(id: string, status: string): Promise<void> {
    try {
      const cloudinaryDoc = doc(db, 'cloudinary_analysis_results', id);
      await updateDoc(cloudinaryDoc, {
        status: status,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error updating cloudinary analysis status:', error);
      throw new Error('Failed to update cloudinary analysis status in Firebase');
    }
  }
}
