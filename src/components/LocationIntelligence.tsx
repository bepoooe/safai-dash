'use client';

import { useState, useEffect } from 'react';
import { MapPin, ChevronDown, ChevronUp, Activity, AlertTriangle, CheckCircle, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { FirebaseService } from '@/services/firebaseService';
import { ModelResult, AreaData } from '@/types/garbage-detection';

interface LocationIntelligenceProps {
  className?: string;
}

export default function LocationIntelligence({ className = '' }: LocationIntelligenceProps) {
  const [areas, setAreas] = useState<AreaData[]>([]);
  const [selectedArea, setSelectedArea] = useState<string>('');
  const [areaResults, setAreaResults] = useState<ModelResult[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination state for Recent Detection Events
  const [currentPage, setCurrentPage] = useState(1);
  const eventsPerPage = 2;

  // Fetch areas on component mount
  useEffect(() => {
    const fetchAreas = async () => {
      try {
        setLoading(true);
        const areasData = await FirebaseService.fetchUniqueAreas();
        setAreas(areasData);
        
        // Auto-select the first area (most detections)
        if (areasData.length > 0) {
          setSelectedArea(areasData[0].area);
        }
      } catch (err) {
        setError('Failed to fetch areas');
        console.error('Error fetching areas:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAreas();
  }, []);

  // Fetch results for selected area
  useEffect(() => {
    if (selectedArea) {
      const fetchAreaResults = async () => {
        try {
          const response = await FirebaseService.fetchModelResultsByArea(selectedArea);
          setAreaResults(response.results);
          // Reset pagination when area changes
          setCurrentPage(1);
        } catch (err) {
          console.error('Error fetching area results:', err);
        }
      };

      fetchAreaResults();
    }
  }, [selectedArea]);
  
  // Calculate pagination for Recent Detection Events
  const totalPages = Math.ceil(areaResults.length / eventsPerPage);
  const startIndex = (currentPage - 1) * eventsPerPage;
  const endIndex = startIndex + eventsPerPage;
  const currentEvents = areaResults.slice(startIndex, endIndex);
  
  const handlePreviousPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  };
  
  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages));
  };

  const formatTimestamp = (timestamp: string): string => {
    try {
      if (!timestamp || timestamp === '' || timestamp === 'Invalid Date') {
        return 'No date available';
      }
      
      // Handle Firebase Timestamp objects (if they come as objects)
      if (typeof timestamp === 'object' && timestamp !== null && 'toDate' in timestamp) {
        const firebaseTimestamp = timestamp as { toDate: () => Date };
        timestamp = firebaseTimestamp.toDate().toISOString();
      }
      
      // Handle ISO string format from Firebase
      const date = new Date(timestamp);
      
      // Check if the date is valid
      if (isNaN(date.getTime())) {
        console.warn('Invalid timestamp received:', timestamp);
        return 'Invalid date format';
      }
      
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZone: 'Asia/Kolkata'
      });
    } catch (error) {
      console.error('Error formatting timestamp:', timestamp, error);
      return 'Date unavailable';
    }
  };

  const getStatusFromConfidence = (confidence: number): { status: string; color: string; bgColor: string; borderColor: string } => {
    // Convert confidence to percentage for easier comparison
    const confidencePercent = confidence * 100;
    
    if (confidencePercent >= 80) {
      return { 
        status: 'HIGH OVERFLOW', 
        color: 'text-red-800', 
        bgColor: 'bg-red-100',
        borderColor: 'border-red-500'
      };
    }
    if (confidencePercent >= 60) {
      return { 
        status: 'MEDIUM-HIGH OVERFLOW', 
        color: 'text-orange-800', 
        bgColor: 'bg-orange-100',
        borderColor: 'border-orange-500'
      };
    }
    if (confidencePercent >= 40) {
      return { 
        status: 'MEDIUM OVERFLOW', 
        color: 'text-amber-800', 
        bgColor: 'bg-amber-100',
        borderColor: 'border-amber-500'
      };
    }
    if (confidencePercent >= 20) {
      return { 
        status: 'LOW OVERFLOW', 
        color: 'text-lime-800', 
        bgColor: 'bg-lime-100',
        borderColor: 'border-lime-500'
      };
    }
    return { 
      status: 'VERY LOW OVERFLOW', 
      color: 'text-green-800', 
      bgColor: 'bg-green-100',
      borderColor: 'border-green-500'
    };
  };

  const calculateAreaStats = () => {
    if (areaResults.length === 0) return null;

    const totalDetections = areaResults.length;
    const averageConfidence = areaResults.reduce((sum, result) => sum + result.confidence_score, 0) / totalDetections;
    const maxConfidence = Math.max(...areaResults.map(r => r.confidence_score));
    const minConfidence = Math.min(...areaResults.map(r => r.confidence_score));
    const latestDetection = areaResults[0]?.timestamp || '';
    const status = getStatusFromConfidence(averageConfidence);

    return {
      totalDetections,
      averageConfidence,
      maxConfidence,
      minConfidence,
      latestDetection,
      status
    };
  };

  const stats = calculateAreaStats();
  const selectedAreaData = areas.find(area => area.area === selectedArea);

  if (loading) {
    return (
      <div className={`bg-white shadow-lg rounded-lg overflow-hidden ${className}`}>
        <div className="p-6">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white shadow-lg rounded-lg overflow-hidden ${className}`}>
        <div className="p-6">
          <div className="text-red-600 text-center">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
            <p>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white/95 shadow-md rounded-2xl border border-[#ded5c5] overflow-hidden ${className}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-[#8a4220] to-[#ba7861] px-4 sm:px-6 py-4">
        <div className="flex items-center space-x-3">
          <MapPin className="h-7 w-7 sm:h-8 sm:w-8 text-white flex-shrink-0" />
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white">Location Intelligence</h2>
            <p className="text-amber-100 text-xs sm:text-sm">Area-specific garbage overflow analysis</p>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6">
        {/* Area Selection Dropdown */}
        <div className="mb-5 sm:mb-6">
          <label className="block text-sm font-bold text-[#1f1712] mb-2">
            Select Area
          </label>
          <div className="relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="w-full bg-[#fdfbf7] border border-[#ded5c5] rounded-xl px-4 py-3 text-left focus:outline-none focus:ring-2 focus:ring-[#964b28] focus:border-transparent flex items-center justify-between"
            >
              <span className="text-[#1f1712] truncate pr-2 font-medium">
                {selectedArea || 'Select an area...'}
                {selectedAreaData && (
                  <span className="text-gray-500 ml-2">({selectedAreaData.count} detections)</span>
                )}
              </span>
              {isDropdownOpen ? (
                <ChevronUp className="h-5 w-5 text-gray-400 flex-shrink-0" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gray-400 flex-shrink-0" />
              )}
            </button>

            {isDropdownOpen && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
                {areas.map((area) => (
                  <button
                    key={area.area}
                    onClick={() => {
                      setSelectedArea(area.area);
                      setIsDropdownOpen(false);
                    }}
                    className={`w-full px-4 py-3 text-left hover:bg-gray-50 focus:outline-none focus:bg-gray-50 ${
                      selectedArea === area.area ? 'bg-green-50 text-green-700' : 'text-gray-900'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1">
                      <span className="font-medium text-sm">{area.area}</span>
                      <div className="flex items-center space-x-2 text-xs text-gray-500">
                        <span>{area.count} detections</span>
                        <Clock className="h-3 w-3 flex-shrink-0" />
                        <span>{formatTimestamp(area.latestDetection)}</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Area Statistics */}
        {stats && (
          <div className="mb-5 sm:mb-6">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Activity className="h-5 w-5 mr-2 text-green-600 flex-shrink-0" />
              {selectedArea} - Analytics
            </h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="bg-blue-50 p-3 sm:p-4 rounded-lg border-l-4 border-blue-500">
                <div className="text-xs sm:text-sm text-blue-600 font-medium">Total Detections</div>
                <div className="text-xl sm:text-2xl font-bold text-blue-900">{stats.totalDetections}</div>
                <div className="text-xs text-blue-600">In this area</div>
              </div>
              <div className={`p-3 sm:p-4 rounded-lg border-l-4 ${stats.status.bgColor} ${stats.status.borderColor}`}>
                <div className={`text-xs sm:text-sm font-medium ${stats.status.color}`}>Avg Confidence</div>
                <div className={`text-xl sm:text-2xl font-bold ${stats.status.color}`}>{(stats.averageConfidence * 100).toFixed(1)}%</div>
                <div className={`text-xs ${stats.status.color}`}>Detection accuracy</div>
              </div>
              <div className="bg-yellow-50 p-3 sm:p-4 rounded-lg border-l-4 border-yellow-500">
                <div className="text-xs sm:text-sm text-yellow-600 font-medium">Confidence Range</div>
                <div className="text-base sm:text-xl font-bold text-yellow-900">
                  {(stats.minConfidence * 100).toFixed(0)}%–{(stats.maxConfidence * 100).toFixed(0)}%
                </div>
                <div className="text-xs text-yellow-600">Min – Max</div>
              </div>
              <div className={`p-3 sm:p-4 rounded-lg border-l-4 ${stats.status.bgColor} ${stats.status.borderColor}`}>
                <div className={`text-xs sm:text-sm font-medium ${stats.status.color}`}>Current Status</div>
                <div className={`text-sm font-bold px-2 py-1 rounded-full text-center ${stats.status.color} ${stats.status.bgColor} border ${stats.status.borderColor} mt-1`}>
                  {stats.status.status}
                </div>
                <div className={`text-xs mt-1 ${stats.status.color}`}>Risk level</div>
              </div>
            </div>
          </div>
        )}

        {/* Location Details */}
        {areaResults.length > 0 && (
          <div className="mb-5 sm:mb-6">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <MapPin className="h-5 w-5 mr-2 text-green-600 flex-shrink-0" />
              Location Details
            </h3>
            <div className="bg-gray-50 p-4 sm:p-6 rounded-lg">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Primary Detection Location</h4>
                  <p className="text-sm text-gray-700 leading-relaxed mb-4 break-words">
                    {areaResults[0]?.address || 'Address not available'}
                  </p>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Latitude:</span>
                      <span className="font-mono font-medium">{areaResults[0]?.latitude?.toFixed(6)}°</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Longitude:</span>
                      <span className="font-mono font-medium">{areaResults[0]?.longitude?.toFixed(6)}°</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">GPS Accuracy:</span>
                      <span className="font-medium">
                        {typeof areaResults[0]?.accuracy === 'string' 
                          ? areaResults[0].accuracy 
                          : `±${areaResults[0]?.accuracy}m`}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Latest Detection:</span>
                      <span className="font-medium">{formatTimestamp(stats?.latestDetection || '')}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                    <h4 className="font-medium text-gray-900">Recent Detection Events</h4>
                    {totalPages > 1 && (
                      <div className="flex items-center space-x-2 text-sm text-gray-500">
                        <span>Page {currentPage} of {totalPages}</span>
                      </div>
                    )}
                  </div>
                  <div className="space-y-3 max-h-48 overflow-y-auto">
                    {currentEvents.map((result, index) => {
                      const resultStatus = getStatusFromConfidence(result.confidence_score);
                      const globalIndex = startIndex + index;
                      return (
                        <div key={result.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 bg-white rounded-lg border gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900">Detection #{globalIndex + 1}</p>
                            <p className="text-xs text-gray-500">{formatTimestamp(result.timestamp)}</p>
                          </div>
                          <div className="flex sm:flex-col sm:text-right items-center gap-2 flex-shrink-0">
                            <span className="text-sm font-medium text-gray-900">
                              {(result.confidence_score * 100).toFixed(1)}%
                            </span>
                            <p className={`text-xs px-2 py-1 rounded-full ${resultStatus.color} ${resultStatus.bgColor}`}>
                              {resultStatus.status}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200 gap-2">
                      <button
                        onClick={handlePreviousPage}
                        disabled={currentPage === 1}
                        className="flex items-center px-2 sm:px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Prev
                      </button>
                      
                      <div className="flex items-center space-x-1 overflow-x-auto">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`px-2 sm:px-3 py-2 text-sm font-medium rounded-lg flex-shrink-0 ${
                              currentPage === page
                                ? 'bg-green-600 text-white'
                                : 'text-gray-500 hover:bg-gray-100'
                            }`}
                          >
                            {page}
                          </button>
                        ))}
                      </div>
                      
                      <button
                        onClick={handleNextPage}
                        disabled={currentPage === totalPages}
                        className="flex items-center px-2 sm:px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* No Data State */}
        {areaResults.length === 0 && selectedArea && (
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Detection Data</h3>
            <p className="text-gray-500">No garbage overflow detections found for {selectedArea}</p>
          </div>
        )}
      </div>
    </div>
  );
}
