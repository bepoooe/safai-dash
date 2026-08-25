import { collection, getDocs, query, orderBy, limit, DocumentData, QueryDocumentSnapshot, addDoc, updateDoc, deleteDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ModelResult, ModelResultsResponse, AreaData } from '@/types/garbage-detection';
import { SafaiKarmi } from '@/types/staff';
import { Citizen, CitizenStats } from '@/types/citizen';
import { CloudinaryAnalysis } from '@/types/cloudinary';

export class FirebaseService {
  /**
   * Helper to extract a clean, human-readable address from various document formats
   */
  static extractCleanAddress(data: DocumentData): string {
    const gpsLocation = data.gps_location || data.location || {};
    
    // Candidate address fields in order of preference
    const candidates = [
      gpsLocation.address,
      data.address,
      data.location_name,
      data.formatted_address,
      data.geocoded_address,
      data.area,
      data.workingArea,
      // Composed from location subfields
      [gpsLocation.road, gpsLocation.suburb || gpsLocation.neighbourhood, gpsLocation.city, gpsLocation.state]
        .filter((part): part is string => typeof part === 'string' && part.trim().length > 0)
        .join(', '),
      [data.road, data.suburb || data.neighbourhood, data.city, data.state]
        .filter((part): part is string => typeof part === 'string' && part.trim().length > 0)
        .join(', ')
    ];

    for (const candidate of candidates) {
      if (
        typeof candidate === 'string' &&
        candidate.trim().length > 0 &&
        !candidate.toLowerCase().includes('unknown') &&
        candidate.trim().toLowerCase() !== 'null' &&
        candidate.trim().toLowerCase() !== 'undefined'
      ) {
        return candidate.trim();
      }
    }

    // Fallback: derive coordinate label if valid coordinates exist
    const latitude = Number(gpsLocation.latitude ?? data.latitude ?? 0) || 0;
    const longitude = Number(gpsLocation.longitude ?? data.longitude ?? 0) || 0;

    if (latitude !== 0 && longitude !== 0) {
      return `Kolkata (${latitude.toFixed(4)}°N, ${longitude.toFixed(4)}°E)`;
    }

    return 'Kolkata Metropolitan Area';
  }

  /**
   * Normalize any raw model_results Firestore document into a typed ModelResult
   */
  static normalizeModelResultDoc(id: string, data: DocumentData): ModelResult {
    const gpsLocation = data.gps_location || data.location || {};
    const detectionSummary = data.detection_summary || {};

    const latitude = Number(gpsLocation.latitude ?? data.latitude ?? 0) || 0;
    const longitude = Number(gpsLocation.longitude ?? data.longitude ?? 0) || 0;

    const address = this.extractCleanAddress(data);

    // Calculate confidence score from multiple possible sources
    let confidenceScore = 0;
    if (detectionSummary.average_confidence !== undefined && detectionSummary.average_confidence !== null) {
      confidenceScore = Number(detectionSummary.average_confidence);
    } else if (Array.isArray(data.confidence_scores) && data.confidence_scores.length > 0) {
      const validScores = data.confidence_scores.filter((s: unknown) => typeof s === 'number' && !isNaN(s as number));
      confidenceScore = validScores.length > 0
        ? (validScores as number[]).reduce((a, b) => a + b, 0) / validScores.length
        : 0;
    } else if (data.confidence_score !== undefined && data.confidence_score !== null) {
      confidenceScore = Number(data.confidence_score);
    } else if (data.confidence !== undefined && data.confidence !== null) {
      confidenceScore = Number(data.confidence);
    } else if (data.average_confidence !== undefined && data.average_confidence !== null) {
      confidenceScore = Number(data.average_confidence);
    }

    if (isNaN(confidenceScore)) confidenceScore = 0;

    // Accuracy
    let accuracy: number | string = 0;
    const rawAccuracy = gpsLocation.accuracy ?? data.accuracy;
    if (typeof rawAccuracy === 'string') {
      const num = parseFloat(rawAccuracy.replace(/[^\d.]/g, ''));
      accuracy = !isNaN(num) ? num : rawAccuracy;
    } else if (typeof rawAccuracy === 'number' && !isNaN(rawAccuracy)) {
      accuracy = rawAccuracy;
    }

    // Timestamp
    let timestamp = new Date().toISOString();
    const rawTime = data.timestamp ?? data.saved_at ?? data.createdAt ?? data.date ?? data.updatedAt;
    if (rawTime) {
      if (typeof rawTime === 'object' && 'toDate' in rawTime && typeof rawTime.toDate === 'function') {
        timestamp = rawTime.toDate().toISOString();
      } else if (typeof rawTime === 'object' && typeof rawTime.seconds === 'number') {
        timestamp = new Date(rawTime.seconds * 1000).toISOString();
      } else if (typeof rawTime === 'string') {
        const parsed = new Date(rawTime);
        if (!isNaN(parsed.getTime())) {
          timestamp = parsed.toISOString();
        }
      } else if (typeof rawTime === 'number') {
        timestamp = new Date(rawTime).toISOString();
      }
    }

    // Status
    let status = detectionSummary.status || data.status;
    if (!status || status === 'UNKNOWN') {
      if (confidenceScore >= 0.8) status = 'HIGH_OVERFLOW';
      else if (confidenceScore >= 0.6) status = 'MEDIUM-HIGH_OVERFLOW';
      else if (confidenceScore >= 0.4) status = 'MEDIUM_OVERFLOW';
      else if (confidenceScore >= 0.2) status = 'LOW_OVERFLOW';
      else status = 'CLEAN';
    }

    const overflowScore = Number(detectionSummary.overflow_score ?? data.overflow_score ?? (confidenceScore * 100)) || 0;
    const totalDetections = Number(detectionSummary.total_detections ?? data.total_detections ?? data.detection_count ?? (confidenceScore > 0 ? 1 : 0)) || 0;

    return {
      id,
      latitude,
      longitude,
      confidence_score: confidenceScore,
      accuracy,
      address,
      timestamp,
      model_version: data.source || data.model_version || data.modelVersion || 'YOLOv8-SafaiSaathi',
      image_url: data.image_url || data.imageUrl || data.image || data.photo_url || data.photoUrl,
      status,
      overflow_score: overflowScore,
      total_detections: totalDetections,
      workStatus: data.workStatus,
      assignedAt: data.assignedAt,
      updatedAt: data.updatedAt
    };
  }

  /**
   * Fetch all documents from the model_results collection safely
   */
  static async fetchModelResults(): Promise<ModelResultsResponse> {
    try {
      const modelResultsRef = collection(db, 'model_results');
      const querySnapshot = await getDocs(modelResultsRef);
      const results: ModelResult[] = [];
      
      querySnapshot.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
        results.push(this.normalizeModelResultDoc(doc.id, doc.data()));
      });

      // Sort in memory by timestamp descending
      results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

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
   * Extract area name from address string
   */
  static extractAreaFromAddress(address: string): string {
    if (!address || typeof address !== 'string') return 'Kolkata Metropolitan Area';
    
    // Split address by comma and take the first meaningful part
    const parts = address.split(',').map(part => part.trim()).filter(Boolean);
    
    const ignorePatterns = [
      /^india$/i,
      /^west\s*bengal$/i,
      /^\d+$/, // Numeric pin codes
      /^wb$/i,
      /^kolkata$/i,
      /^calcutta$/i
    ];
    
    // Look for first part that doesn't match country/state/generic names
    for (const part of parts) {
      if (part && !ignorePatterns.some(pattern => pattern.test(part)) && part.length > 2) {
        return part;
      }
    }
    
    if (address.includes('(') && address.includes(')')) {
      return address;
    }
    
    return parts[0] || 'Kolkata Metropolitan Area';
  }

  /**
   * Fetch unique areas from model results
   */
  static async fetchUniqueAreas(): Promise<AreaData[]> {
    try {
      const { results } = await this.fetchModelResults();
      const areaMap = new Map<string, { count: number; latestDetection: string }>();
      
      results.forEach((item) => {
        const area = this.extractAreaFromAddress(item.address);
        
        if (areaMap.has(area)) {
          const existing = areaMap.get(area)!;
          areaMap.set(area, {
            count: existing.count + 1,
            latestDetection: new Date(existing.latestDetection) > new Date(item.timestamp)
              ? existing.latestDetection 
              : item.timestamp
          });
        } else {
          areaMap.set(area, {
            count: 1,
            latestDetection: item.timestamp
          });
        }
      });

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
   * Fetch model results for a specific area
   */
  static async fetchModelResultsByArea(area: string): Promise<ModelResultsResponse> {
    try {
      const { results } = await this.fetchModelResults();
      const filtered = results.filter(r => this.extractAreaFromAddress(r.address) === area);

      const averageConfidence = filtered.length > 0 
        ? filtered.reduce((sum, result) => sum + result.confidence_score, 0) / filtered.length
        : 0;

      return {
        results: filtered,
        totalCount: filtered.length,
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
      const { results, totalCount, averageConfidence, lastUpdated } = await this.fetchModelResults();
      const paginatedResults = results.slice(0, pageSize);

      return {
        results: paginatedResults,
        totalCount,
        averageConfidence,
        lastUpdated
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
      const sanitized = this.sanitizeFirestoreData({
        ...karmiData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      const docRef = await addDoc(staffRef, sanitized);
      return docRef.id;
    } catch (error) {
      console.error('Error adding staff:', error);
      throw new Error('Failed to add staff to Firebase');
    }
  }

  /**
   * Update an existing staff member
   */
  static async updateStaff(id: string, karmiData: Partial<SafaiKarmi>): Promise<void> {
    try {
      const staffDoc = doc(db, 'staff', id);
      const sanitized = this.sanitizeFirestoreData({
        ...karmiData,
        updatedAt: new Date().toISOString()
      });
      await updateDoc(staffDoc, sanitized);
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
      const querySnapshot = await getDocs(citizensRef);
      const citizens: Citizen[] = [];
      
      querySnapshot.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
        const data = doc.data();
        const address = this.extractCleanAddress(data);
        const lat = data.location?.latitude ?? data.latitude ?? data.gps_location?.latitude ?? 0;
        const lng = data.location?.longitude ?? data.longitude ?? data.gps_location?.longitude ?? 0;
        const accuracy = data.location?.accuracy ?? data.accuracy ?? data.gps_location?.accuracy;

        let timestamp: Date;
        if (data.timestamp?.toDate) {
          timestamp = data.timestamp.toDate();
        } else if (data.timestamp) {
          timestamp = new Date(data.timestamp);
        } else if (data.createdAt) {
          timestamp = new Date(data.createdAt);
        } else {
          timestamp = new Date();
        }

        citizens.push({
          id: doc.id,
          name: data.name || 'Anonymous Citizen',
          imageUrl: data.imageUrl || data.image_url || data.image || '',
          location: {
            latitude: Number(lat) || 0,
            longitude: Number(lng) || 0,
            accuracy: accuracy,
            address: address
          },
          description: data.description || 'Garbage dumping report submitted by citizen',
          timestamp: isNaN(timestamp.getTime()) ? new Date() : timestamp,
          status: data.status || 'pending',
          email: data.email,
          phone: data.phone,
          area: data.area || this.extractAreaFromAddress(address),
          language: data.language || 'en',
          notifications: data.notifications ?? true,
          totalReports: data.totalReports || 1,
          verifiedReports: data.verifiedReports || (data.status === 'resolved' ? 1 : 0)
        });
      });

      // Sort in memory by timestamp descending
      citizens.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      return citizens;
    } catch (error) {
      console.error('Error fetching citizens:', error);
      throw new Error('Failed to fetch citizens from Firebase');
    }
  }

  /**
   * Helper to strip all undefined values before sending data to Firestore
   */
  static sanitizeFirestoreData<T extends Record<string, unknown>>(data: T): Record<string, unknown> {
    const cleaned: Record<string, unknown> = {};
    Object.keys(data).forEach((key) => {
      const val = data[key];
      if (val !== undefined) {
        if (val !== null && typeof val === 'object' && !(val instanceof Date) && !Array.isArray(val)) {
          cleaned[key] = this.sanitizeFirestoreData(val as Record<string, unknown>);
        } else {
          cleaned[key] = val;
        }
      }
    });
    return cleaned;
  }

  /**
   * Add a new citizen to the civilian collection
   */
  static async addCitizen(citizenData: Omit<Citizen, 'id'>): Promise<string> {
    try {
      const citizensRef = collection(db, 'civilian');
      const sanitized = this.sanitizeFirestoreData({
        ...citizenData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      const docRef = await addDoc(citizensRef, sanitized);
      return docRef.id;
    } catch (error) {
      console.error('Error adding citizen:', error);
      throw new Error('Failed to add citizen to Firebase');
    }
  }

  /**
   * Update an existing citizen
   */
  static async updateCitizen(id: string, citizenData: Partial<Citizen>): Promise<void> {
    try {
      const citizenDoc = doc(db, 'civilian', id);
      const sanitized = this.sanitizeFirestoreData({
        ...citizenData,
        updatedAt: new Date().toISOString()
      });
      await updateDoc(citizenDoc, sanitized);
    } catch (error) {
      console.error('Error updating citizen:', error);
      throw new Error('Failed to update citizen in Firebase');
    }
  }

  /**
   * Update only citizen status
   */
  static async updateCitizenStatus(id: string, status: 'pending' | 'in_progress' | 'resolved'): Promise<void> {
    try {
      const citizenDoc = doc(db, 'civilian', id);
      await updateDoc(citizenDoc, {
        status: status,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error updating citizen status:', error);
      throw new Error('Failed to update citizen status in Firebase');
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
   * Dispatch/Assign staff member to a garbage detection
   */
  static async dispatchStaffToDetection(detectionId: string, staffId: string, staffName: string): Promise<void> {
    try {
      const detectionRef = doc(db, 'model_results', detectionId);
      await updateDoc(detectionRef, {
        staffId: staffId,
        staffName: staffName,
        workStatus: 'in_progress',
        assignedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error dispatching staff to detection:', error);
      throw new Error('Failed to dispatch staff to detection');
    }
  }

  /**
   * Dispatch/Assign staff member to a citizen report
   */
  static async dispatchStaffToCitizenReport(reportId: string, staffId: string, staffName: string): Promise<void> {
    try {
      const reportRef = doc(db, 'civilian', reportId);
      await updateDoc(reportRef, {
        assignedStaffId: staffId,
        assignedStaffName: staffName,
        status: 'in_progress',
        assignedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error dispatching staff to citizen report:', error);
      throw new Error('Failed to dispatch staff to citizen report');
    }
  }
}
