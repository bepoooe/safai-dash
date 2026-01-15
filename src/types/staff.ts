// Assigned work interface
export interface AssignedWork {
  detectionId: string;
  address: string;
  latitude: number;
  longitude: number;
  confidenceScore: number;
  assignedAt: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
}

// Safai Karmi (Worker) interface
export interface SafaiKarmi {
  id: string;
  name: string;
  phone: string;
  workingArea: string;
  status: 'Active' | 'On Leave' | 'Inactive';
  joinDate: string;
  lastActive: string;
  totalCollections: number;
  rating: number;
  assignedWork?: AssignedWork[];
  totalAssignedWork?: number;
  completedWork?: number;
  pendingWork?: number;
}

// Staff statistics interface
export interface StaffStats {
  totalKarmis: number;
  activeKarmis: number;
  onLeaveKarmis: number;
  inactiveKarmis: number;
  totalCollections: number;
  averageRating: number;
}

// API response interface for future backend integration
export interface StaffApiResponse {
  karmis: SafaiKarmi[];
  stats: StaffStats;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Filter options interface
export interface StaffFilters {
  status?: 'Active' | 'On Leave' | 'Inactive' | 'All';
  workingArea?: string;
  searchTerm?: string;
  sortBy?: 'name' | 'joinDate' | 'totalCollections' | 'rating';
  sortOrder?: 'asc' | 'desc';
}
