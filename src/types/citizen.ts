// Citizen interface based on Firebase civilian collection structure
export interface Citizen {
  id: string;
  name: string;
  imageUrl: string;
  location: {
    latitude: number;
    longitude: number;
    accuracy?: number;
    address?: string;
  };
  description: string;
  timestamp: Date;
  status: 'pending' | 'in_progress' | 'resolved';
  email?: string;
  phone?: string;
  area?: string;
  language?: 'en' | 'hi' | 'bn';
  notifications?: boolean;
  totalReports?: number;
  verifiedReports?: number;
}

// Citizen statistics interface
export interface CitizenStats {
  totalCitizens: number;
  pendingCitizens: number;
  inProgressCitizens: number;
  resolvedCitizens: number;
  totalReports: number;
  verifiedReports: number;
  averageReportsPerCitizen: number;
}

// API response interface for future backend integration
export interface CitizenApiResponse {
  citizens: Citizen[];
  stats: CitizenStats;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Filter options interface
export interface CitizenFilters {
  status?: 'pending' | 'in_progress' | 'resolved' | 'All';
  area?: string;
  language?: 'en' | 'hi' | 'bn' | 'All';
  searchTerm?: string;
  sortBy?: 'name' | 'timestamp' | 'totalReports' | 'status';
  sortOrder?: 'asc' | 'desc';
}
