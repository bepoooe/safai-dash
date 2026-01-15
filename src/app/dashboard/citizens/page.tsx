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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Citizen Reports</h1>
          <p className="text-gray-600 mt-1">
            Manage and monitor citizen reports and feedback
          </p>
        </div>
        <button 
          onClick={loadCitizensData}
          disabled={loading}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {statsCards.map((stat) => (
          <div key={stat.name} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Search and filters */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
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
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <option value="All">All Status</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
            </select>
            <button className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
              <Filter className="h-4 w-4 mr-2" />
              More Filters
            </button>
          </div>
        </div>
      </div>

      {/* Citizens table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
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
                  <div className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-16 w-16">
                        {citizen.imageUrl ? (
                          <Image
                            src={citizen.imageUrl}
                            alt={citizen.name}
                            width={64}
                            height={64}
                            className="h-16 w-16 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="h-16 w-16 rounded-lg bg-gray-200 flex items-center justify-center">
                            <ImageIcon className="h-8 w-8 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div className="ml-4">
                        <div className="flex items-center">
                          <p className="text-sm font-medium text-gray-900">{citizen.name}</p>
                          <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(citizen.status)}`}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {citizen.status.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="flex items-center mt-1 space-x-4">
                          <div className="flex items-center text-sm text-gray-500">
                            <MapPin className="h-4 w-4 mr-1" />
                            {citizen.location?.address || `${citizen.location?.latitude?.toFixed(4)}, ${citizen.location?.longitude?.toFixed(4)}`}
                          </div>
                          <div className="flex items-center text-sm text-gray-500">
                            <Clock className="h-4 w-4 mr-1" />
                            {citizen.timestamp.toLocaleDateString()}
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                          {citizen.description}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <div className="text-sm text-gray-500">
                          {citizen.timestamp.toLocaleTimeString()}
                        </div>
                        {citizen.location?.accuracy && (
                          <div className="text-xs text-gray-400">
                            Accuracy: {citizen.location.accuracy.toFixed(1)}m
                          </div>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => handleViewCitizen(citizen)}
                          className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {citizen.status === 'in_progress' && (
                          <button
                            onClick={() => handleUpdateStatus(citizen.id, 'resolved')}
                            className="text-green-600 hover:text-green-900 text-sm font-medium"
                          >
                            Resolve
                          </button>
                        )}
                        <button 
                          onClick={() => handleDeleteCitizen(citizen.id)}
                          className="text-red-600 hover:text-red-900 text-sm font-medium"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
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
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-2/3 shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-medium text-gray-900">
                Citizen Report Details
              </h3>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Citizen Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Citizen Name</h4>
                  <p className="mt-1 text-sm text-gray-900">{selectedCitizen.name}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Status</h4>
                  <span className={`mt-1 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedCitizen.status)}`}>
                    {selectedCitizen.status.replace('_', ' ')}
                  </span>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Location</h4>
                  <p className="mt-1 text-sm text-gray-900">
                    {selectedCitizen.location?.address || 
                     `${selectedCitizen.location?.latitude?.toFixed(6)}, ${selectedCitizen.location?.longitude?.toFixed(6)}`}
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Submitted</h4>
                  <p className="mt-1 text-sm text-gray-900">
                    {selectedCitizen.timestamp.toLocaleString()}
                  </p>
                </div>
                {selectedCitizen.location?.accuracy && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Location Accuracy</h4>
                    <p className="mt-1 text-sm text-gray-900">
                      {selectedCitizen.location.accuracy.toFixed(1)} meters
                    </p>
                  </div>
                )}
              </div>

              {/* Description */}
              <div>
                <h4 className="text-sm font-medium text-gray-500">Description</h4>
                <p className="mt-1 text-sm text-gray-900">{selectedCitizen.description}</p>
              </div>

              {/* Cloudinary Analysis Results */}
              {cloudinaryAnalysis.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-3">AI Analysis Results</h4>
                  <div className="space-y-3">
                    {cloudinaryAnalysis.slice(0, 3).map((analysis, index) => (
                      <div key={analysis.id || index} className="bg-gray-50 p-4 rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <h5 className="text-sm font-medium text-gray-900">
                            Analysis #{index + 1}
                          </h5>
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-1 text-xs font-semibold rounded ${
                              analysis.status === 'CLEAN' ? 'bg-green-100 text-green-800' :
                              analysis.status === 'LOW_OVERFLOW' ? 'bg-yellow-100 text-yellow-800' :
                              analysis.status === 'HIGH_OVERFLOW' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {analysis.status}
                            </span>
                            <span className="text-xs text-gray-500">
                              {new Date(analysis.timestamp).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 mb-3">
                          <div>
                            <p className="text-xs text-gray-600 mb-1">Detection Count:</p>
                            <p className="text-sm font-medium">{analysis.detection_count}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600 mb-1">Avg Confidence:</p>
                            <p className="text-sm font-medium">{analysis.average_confidence ? (analysis.average_confidence * 100).toFixed(1) : 'N/A'}%</p>
                          </div>
                        </div>
                        
                        {analysis.confidence_scores && analysis.confidence_scores.length > 0 && (
                          <div className="mb-2">
                            <p className="text-xs text-gray-600 mb-1">Confidence Scores:</p>
                            <div className="flex space-x-2">
                              {analysis.confidence_scores.map((score: number, i: number) => (
                                <span 
                                  key={i}
                                  className={`px-2 py-1 text-xs rounded ${
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
                            <p className="text-xs text-gray-600 mb-1">Detection Details:</p>
                            <div className="space-y-1">
                              {analysis.detection_details.map((detail, i: number) => (
                                <div key={i} className="text-xs bg-white p-2 rounded border">
                                  <div className="flex justify-between">
                                    <span className="font-medium">{detail.class_name}</span>
                                    <span className="text-gray-600">{(detail.confidence * 100).toFixed(1)}%</span>
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
                    <p className="text-xs text-gray-500 mt-2">
                      Showing 3 of {cloudinaryAnalysis.length} analysis results
                    </p>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                {selectedCitizen.status === 'in_progress' && (
                  <button
                    onClick={() => {
                      handleUpdateStatus(selectedCitizen.id, 'resolved');
                      handleCloseModal();
                    }}
                    className="px-4 py-2 text-sm font-medium text-green-600 bg-green-50 rounded-md hover:bg-green-100"
                  >
                    Mark as Resolved
                  </button>
                )}
                <button
                  onClick={handleCloseModal}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-50 rounded-md hover:bg-gray-100"
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
