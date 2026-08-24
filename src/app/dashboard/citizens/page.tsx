'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { UserCheck, Search, Filter, MapPin, Clock, CheckCircle, AlertTriangle, RefreshCw, Eye, Trash2, X, Image as ImageIcon } from 'lucide-react';
import { Citizen } from '@/types/citizen';
import { FirebaseService } from '@/services/firebaseService';
import { CloudinaryAnalysis } from '@/types/cloudinary';

export default function CitizensPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [citizens, setCitizens] = useState<Citizen[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCitizen, setSelectedCitizen] = useState<Citizen | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [cloudinaryAnalysis, setCloudinaryAnalysis] = useState<CloudinaryAnalysis[]>([]);
  const [stats, setStats] = useState({
    totalCitizens: 0,
    pendingCitizens: 0,
    inProgressCitizens: 0,
    resolvedCitizens: 0,
    totalReports: 0,
    verifiedReports: 0,
    averageReportsPerCitizen: 0
  });

  // Load citizens data from Firebase
  useEffect(() => {
    loadCitizensData();
    loadCloudinaryAnalysis();
  }, []);

  const loadCitizensData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [citizensData, statsData] = await Promise.all([
        FirebaseService.fetchCitizens(),
        FirebaseService.getCitizenStats()
      ]);
      
      setCitizens(citizensData);
      setStats(statsData);
    } catch (err) {
      console.error('Error loading citizens data:', err);
      setError('Failed to load citizens data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadCloudinaryAnalysis = async () => {
    try {
      const analysisData = await FirebaseService.fetchCloudinaryAnalysisResults();
      setCloudinaryAnalysis(analysisData);
    } catch (err) {
      console.error('Error loading cloudinary analysis:', err);
    }
  };

  // Filter citizens based on search and status
  const filteredCitizens = citizens.filter(citizen => {
    const matchesSearch = citizen.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         citizen.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (citizen.location?.address && citizen.location.address.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'All' || citizen.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'resolved':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return Clock;
      case 'in_progress':
        return RefreshCw;
      case 'resolved':
        return CheckCircle;
      default:
        return AlertTriangle;
    }
  };

  const handleViewCitizen = (citizen: Citizen) => {
    setSelectedCitizen(citizen);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedCitizen(null);
  };

  const handleUpdateStatus = async (id: string, newStatus: 'pending' | 'in_progress' | 'resolved') => {
    try {
      setLoading(true);
      const citizen = citizens.find(c => c.id === id);
      if (citizen) {
        await FirebaseService.updateCitizen(id, { ...citizen, status: newStatus });
        await loadCitizensData(); // Reload data
      }
    } catch (err) {
      console.error('Error updating citizen status:', err);
      setError('Failed to update citizen status. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCitizen = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this citizen report?')) {
      try {
        setLoading(true);
        await FirebaseService.deleteCitizen(id);
        await loadCitizensData(); // Reload data
      } catch (err) {
        console.error('Error deleting citizen:', err);
        setError('Failed to delete citizen. Please try again.');
      } finally {
        setLoading(false);
      }
    }
  };

  const statsCards = [
    {
      name: 'Total Citizens',
      value: stats.totalCitizens.toString(),
      icon: UserCheck,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      name: 'Pending Reports',
      value: stats.pendingCitizens.toString(),
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
    },
    {
      name: 'In Progress',
      value: stats.inProgressCitizens.toString(),
      icon: RefreshCw,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      name: 'Resolved',
      value: stats.resolvedCitizens.toString(),
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Citizen Reports</h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">
            Manage and monitor citizen reports and feedback
          </p>
        </div>
        <button 
          onClick={loadCitizensData}
          disabled={loading}
          className="inline-flex items-center self-start sm:self-auto px-3 py-2 sm:px-4 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-[#964b28] hover:bg-[#7e3e1f] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#964b28] disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
              <div className="mt-4">
                <button
                  onClick={() => setError(null)}
                  className="bg-red-50 px-2 py-1.5 rounded-md text-sm font-medium text-red-800 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-red-50 focus:ring-red-600"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {statsCards.map((stat) => (
          <div key={stat.name} className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className={`p-2 sm:p-3 rounded-lg ${stat.bgColor} flex-shrink-0`}>
                <stat.icon className={`h-5 w-5 sm:h-6 sm:w-6 ${stat.color}`} />
              </div>
              <div className="ml-3">
                <p className="text-xs font-medium text-gray-600 leading-tight">{stat.name}</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Search and filters */}
      <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search by name, description, or address..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="flex-1 sm:flex-none inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <option value="All">All Status</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
            </select>
            <button className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
              <Filter className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">More Filters</span>
            </button>
          </div>
        </div>
      </div>

      {/* Citizens list */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg border border-gray-200">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
          <h3 className="text-base sm:text-lg font-medium text-gray-900">
            Citizen Reports ({filteredCitizens.length})
          </h3>
        </div>
        
        {loading ? (
          <div className="px-6 py-12 text-center">
            <RefreshCw className="h-8 w-8 text-gray-400 mx-auto mb-4 animate-spin" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Loading citizen data...</h3>
            <p className="text-gray-500">Please wait while we fetch the latest information.</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {filteredCitizens.map((citizen) => {
              const StatusIcon = getStatusIcon(citizen.status);
              return (
                <li key={citizen.id}>
                  <div className="px-4 sm:px-6 py-4 hover:bg-gray-50">
                    <div className="flex items-start gap-3">
                      {/* Thumbnail */}
                      <div className="flex-shrink-0">
                        {citizen.imageUrl ? (
                          <Image
                            src={citizen.imageUrl}
                            alt={citizen.name}
                            width={48}
                            height={48}
                            className="h-12 w-12 sm:h-16 sm:w-16 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="h-12 w-12 sm:h-16 sm:w-16 rounded-lg bg-gray-200 flex items-center justify-center">
                            <ImageIcon className="h-6 w-6 sm:h-8 sm:w-8 text-gray-400" />
                          </div>
                        )}
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 mb-1">
                          <p className="text-sm font-medium text-gray-900">{citizen.name}</p>
                          <span className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusColor(citizen.status)}`}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {citizen.status.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500 mb-1">
                          <div className="flex items-center">
                            <MapPin className="h-3.5 w-3.5 mr-1 flex-shrink-0" />
                            <span className="truncate max-w-[200px]">{citizen.location?.address || `${citizen.location?.latitude?.toFixed(4)}, ${citizen.location?.longitude?.toFixed(4)}`}</span>
                          </div>
                          <div className="flex items-center">
                            <Clock className="h-3.5 w-3.5 mr-1 flex-shrink-0" />
                            {citizen.timestamp.toLocaleDateString()}
                          </div>
                        </div>
                        <p className="text-xs sm:text-sm text-gray-600 line-clamp-2">{citizen.description}</p>
                      </div>
                      {/* Actions */}
                      <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 flex-shrink-0">
                        <div className="text-xs text-gray-500 text-right">
                          {citizen.timestamp.toLocaleTimeString()}
                          {citizen.location?.accuracy && (
                            <div className="text-gray-400">±{citizen.location.accuracy.toFixed(1)}m</div>
                          )}
                        </div>
                        <div className="flex gap-1.5">
                          <button 
                            onClick={() => handleViewCitizen(citizen)}
                            className="p-1.5 rounded-md text-[#964b28] hover:bg-[#f0e2d8]/60 hover:text-[#7e3e1f] transition-colors"
                            aria-label="View citizen"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          {citizen.status === 'in_progress' && (
                            <button
                              onClick={() => handleUpdateStatus(citizen.id, 'resolved')}
                              className="text-white bg-[#ba7861] hover:bg-[#a6644f] text-xs font-semibold px-2.5 py-1 rounded-md transition-colors shadow-xs"
                            >
                              Resolve
                            </button>
                          )}
                          <button 
                            onClick={() => handleDeleteCitizen(citizen.id)}
                            className="p-1.5 rounded-md text-red-600 hover:bg-red-50 hover:text-red-900 transition-colors"
                            aria-label="Delete citizen"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        
        {!loading && filteredCitizens.length === 0 && (
          <div className="px-6 py-12 text-center">
            <UserCheck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No citizen reports found</h3>
            <p className="text-gray-500">
              {citizens.length === 0 
                ? 'No citizen reports have been submitted yet.'
                : 'Try adjusting your search or filter criteria.'
              }
            </p>
          </div>
        )}
      </div>

      {/* Citizen Details Modal */}
      {showModal && selectedCitizen && (
        <div className="fixed inset-0 bg-[#241c15]/60 overflow-y-auto h-full w-full z-50 p-4 backdrop-blur-xs">
          <div className="relative mx-auto my-4 sm:my-8 max-w-2xl shadow-xl rounded-2xl bg-white border border-[#ded5c5]">
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[#ded5c5]">
              <h3 className="text-base sm:text-lg font-bold text-[#1f1712]">
                Citizen Report Details
              </h3>
              <button
                onClick={handleCloseModal}
                className="text-[#9c8e7e] hover:text-[#1f1712] flex-shrink-0"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-4 sm:p-5 space-y-6 max-h-[70vh] overflow-y-auto">
              {/* Photo */}
              {selectedCitizen.imageUrl ? (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#7a6a58] mb-2">Submitted Photo</h4>
                  <div className="relative rounded-xl overflow-hidden bg-gray-100 border border-[#ded5c5]">
                    <Image
                      src={selectedCitizen.imageUrl}
                      alt={`Photo submitted by ${selectedCitizen.name}`}
                      width={800}
                      height={500}
                      className="w-full object-cover max-h-72 sm:max-h-96"
                    />
                    <a
                      href={selectedCitizen.imageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute bottom-2 right-2 inline-flex items-center gap-1.5 bg-[#241c15]/80 hover:bg-[#241c15] text-white text-xs font-semibold px-3 py-1.5 rounded-full backdrop-blur-sm transition-colors shadow-sm"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      View Full Size
                    </a>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 p-4 bg-[#fdfbf7] rounded-xl border border-dashed border-[#ded5c5]">
                  <ImageIcon className="h-8 w-8 text-[#9c8e7e] flex-shrink-0" />
                  <p className="text-sm text-[#7a6a58]">No photo was submitted with this report.</p>
                </div>
              )}

              {/* Citizen Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#7a6a58]">Citizen Name</h4>
                  <p className="mt-1 text-sm font-semibold text-[#1f1712]">{selectedCitizen.name}</p>
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#7a6a58]">Status</h4>
                  <span className={`mt-1 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedCitizen.status)}`}>
                    {selectedCitizen.status.replace('_', ' ')}
                  </span>
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#7a6a58]">Location</h4>
                  <p className="mt-1 text-sm text-[#1f1712] break-words">
                    {selectedCitizen.location?.address || 
                     `${selectedCitizen.location?.latitude?.toFixed(6)}, ${selectedCitizen.location?.longitude?.toFixed(6)}`}
                  </p>
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#7a6a58]">Submitted</h4>
                  <p className="mt-1 text-sm text-[#1f1712]">
                    {selectedCitizen.timestamp.toLocaleString()}
                  </p>
                </div>
                {selectedCitizen.location?.accuracy && (
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#7a6a58]">Location Accuracy</h4>
                    <p className="mt-1 text-sm text-[#1f1712]">
                      {selectedCitizen.location.accuracy.toFixed(1)} meters
                    </p>
                  </div>
                )}
              </div>

              {/* Description */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#7a6a58]">Description</h4>
                <p className="mt-1 text-sm text-[#4a3b32]">{selectedCitizen.description}</p>
              </div>

              {/* Cloudinary Analysis Results */}
              {cloudinaryAnalysis.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#7a6a58] mb-3">AI Analysis Results</h4>
                  <div className="space-y-3">
                    {cloudinaryAnalysis.slice(0, 3).map((analysis, index) => (
                      <div key={analysis.id || index} className="bg-[#fdfbf7] p-4 rounded-xl border border-[#ded5c5]">
                        <div className="flex flex-wrap justify-between items-start mb-2 gap-2">
                          <h5 className="text-sm font-bold text-[#1f1712]">
                            Analysis #{index + 1}
                          </h5>
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-1 text-xs font-semibold rounded ${
                              analysis.status === 'CLEAN' ? 'bg-green-100 text-green-800' :
                              analysis.status === 'LOW_OVERFLOW' ? 'bg-yellow-100 text-yellow-800' :
                              analysis.status === 'HIGH_OVERFLOW' ? 'bg-red-100 text-red-800' :
                              'bg-[#f0e2d8] text-[#8a4220]'
                            }`}>
                              {analysis.status}
                            </span>
                            <span className="text-xs text-[#7a6a58]">
                              {new Date(analysis.timestamp).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 mb-3">
                          <div>
                            <p className="text-xs text-[#7a6a58] mb-1">Detection Count:</p>
                            <p className="text-sm font-bold text-[#1f1712]">{analysis.detection_count}</p>
                          </div>
                          <div>
                            <p className="text-xs text-[#7a6a58] mb-1">Avg Confidence:</p>
                            <p className="text-sm font-bold text-[#1f1712]">{analysis.average_confidence ? (analysis.average_confidence * 100).toFixed(1) : 'N/A'}%</p>
                          </div>
                        </div>
                        
                        {analysis.confidence_scores && analysis.confidence_scores.length > 0 && (
                          <div className="mb-2">
                            <p className="text-xs text-[#7a6a58] mb-1">Confidence Scores:</p>
                            <div className="flex flex-wrap gap-2">
                              {analysis.confidence_scores.map((score: number, i: number) => (
                                <span 
                                  key={i}
                                  className={`px-2 py-1 text-xs rounded font-semibold ${
                                    score > 0.7 ? 'bg-green-100 text-green-800' :
                                    score > 0.4 ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-red-100 text-red-800'
                                  }`}
                                >
                                  {(score * 100).toFixed(1)}%
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {analysis.detection_details && analysis.detection_details.length > 0 && (
                          <div className="mb-2">
                            <p className="text-xs text-[#7a6a58] mb-1">Detection Details:</p>
                            <div className="space-y-1">
                              {analysis.detection_details.map((detail, i: number) => (
                                <div key={i} className="text-xs bg-white p-2 rounded-lg border border-[#ded5c5]">
                                  <div className="flex justify-between">
                                    <span className="font-semibold text-[#1f1712]">{detail.class_name}</span>
                                    <span className="text-[#7a6a58]">{(detail.confidence * 100).toFixed(1)}%</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                      </div>
                    ))}
                  </div>
                  
                  {cloudinaryAnalysis.length > 3 && (
                    <p className="text-xs text-[#7a6a58] mt-2">
                      Showing 3 of {cloudinaryAnalysis.length} analysis results
                    </p>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap justify-end gap-2 pt-4 border-t border-[#ded5c5]">
                {selectedCitizen.status === 'in_progress' && (
                  <button
                    onClick={() => {
                      handleUpdateStatus(selectedCitizen.id, 'resolved');
                      handleCloseModal();
                    }}
                    className="px-4 py-2 text-sm font-semibold text-white bg-[#964b28] rounded-xl hover:bg-[#7e3e1f] transition-colors shadow-sm"
                  >
                    Mark as Resolved
                  </button>
                )}
                <button
                  onClick={handleCloseModal}
                  className="px-4 py-2 text-sm font-semibold text-[#4a3b32] bg-[#ded8c4]/60 rounded-xl hover:bg-[#ded8c4] transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
