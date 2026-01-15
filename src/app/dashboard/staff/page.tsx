'use client';

import { useState, useEffect, useCallback } from 'react';
import { Users, Plus, Search, Filter, MapPin, Phone, User, CheckCircle, AlertTriangle, RefreshCw, Briefcase, Square, X } from 'lucide-react';
import { SafaiKarmi, AssignedWork } from '@/types/staff';
import SafaiKarmiModal from '@/components/SafaiKarmiModal';
import WhatsAppNotificationButton from '@/components/WhatsAppNotificationButton';
import { FirebaseService } from '@/services/firebaseService';
import { AssignmentService } from '@/services/assignmentService';
import { runStaffMigration } from '@/scripts/migrateStaffData';
import { db } from '@/lib/firebase';

export default function StaffPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [karmis, setKarmis] = useState<SafaiKarmi[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit' | 'view'>('add');
  const [selectedKarmi, setSelectedKarmi] = useState<SafaiKarmi | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [migrationStatus, setMigrationStatus] = useState<string | null>(null);
  const [, setAssignmentStats] = useState({
    totalAssignments: 0,
    pendingAssignments: 0,
    completedAssignments: 0,
    staffWithWork: 0,
    unassignedDetections: 0
  });
  const [selectedKarmiWork, setSelectedKarmiWork] = useState<AssignedWork[] | null>(null);
  const [showWorkModal, setShowWorkModal] = useState(false);

  // Auto-assign work for unassigned detections
  const autoAssignWork = useCallback(async () => {
    try {
      console.log('🔄 Auto-assigning work for staff members...');
      
      // Get all unassigned detections
      const unassignedDetections = await AssignmentService.getUnassignedDetections();
      console.log(`Found ${unassignedDetections.length} unassigned detections`);
      
      if (unassignedDetections.length === 0) {
        console.log('No unassigned detections found');
        return;
      }

      // Get all staff members
      const staffMembers = karmis.filter(k => k.status === 'Active');
      console.log(`Found ${staffMembers.length} active staff members`);

      if (staffMembers.length === 0) {
        console.log('No active staff members found');
        return;
      }

      let assignedCount = 0;

      // Process each unassigned detection
      for (const detectionId of unassignedDetections) {
        try {
          // Get detection details
          const { doc, getDoc } = await import('firebase/firestore');
          const detectionRef = doc(db, 'model_results', detectionId);
          const detectionDoc = await getDoc(detectionRef);
          
          if (!detectionDoc.exists()) continue;
          
          const detectionData = detectionDoc.data();
          const address = detectionData.location?.address || detectionData.address || '';
          
          if (!address) continue;
          
          const lowerAddress = address.toLowerCase();
          console.log(`Processing detection: ${address}`);
          
          // Find matching staff member
          let matchedStaff = null;
          
          for (const staff of staffMembers) {
            if (!staff.workingArea) continue;
            
            const workingAreaWords = staff.workingArea
              .toLowerCase()
              .split(/\s+/)
              .filter(word => word.length > 0);
            
            // Check if ALL words from working area are in the address
            const allWordsMatch = workingAreaWords.every(word => 
              lowerAddress.includes(word)
            );
            
            if (allWordsMatch) {
              matchedStaff = staff;
              console.log(`✅ Matched staff ${staff.name} (${staff.workingArea}) for detection at ${address}`);
              break;
            }
          }
          
          // Assign the detection to matched staff with WhatsApp notification
          if (matchedStaff) {
            const success = await AssignmentService.assignWorkWithNotification(
              detectionId,
              matchedStaff.id,
              matchedStaff.workingArea
            );
            
            if (success) {
              assignedCount++;
              console.log(`✅ Assigned detection ${detectionId} to staff ${matchedStaff.name} with notification`);
            } else {
              console.log(`❌ Failed to assign detection ${detectionId} to staff ${matchedStaff.name}`);
            }
          } else {
            console.log(`❌ No matching staff found for detection at ${address}`);
          }
          
        } catch (detectionError) {
          console.error(`Error processing detection ${detectionId}:`, detectionError);
        }
      }
      
      if (assignedCount > 0) {
        console.log(`🎉 Successfully assigned ${assignedCount} detections`);
        // Reload staff data to show new assignments
        await loadStaffData();
      } else {
        console.log('No assignments were made');
      }
      
    } catch (error) {
      console.error('Error in auto-assignment:', error);
    }
  }, [karmis]);

  // Load staff data from Firebase
  useEffect(() => {
    loadStaffData();
  }, []);

  // Auto-assign work when staff data loads
  useEffect(() => {
    if (karmis.length > 0) {
      autoAssignWork();
    }
  }, [karmis.length, autoAssignWork]);

  const loadStaffData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // First try to load staff with assigned work
      try {
        const staffData = await AssignmentService.getStaffWithAssignedWork();
        setKarmis(staffData);
        
        // Load assignment statistics
        const stats = await AssignmentService.getAssignmentStats();
        setAssignmentStats(stats);
        
        // If no data exists, show migration option
        if (staffData.length === 0) {
          setMigrationStatus('No staff data found. Click "Migrate Data" to add the initial staff members.');
        }
      } catch (assignmentError) {
        console.warn('Assignment service failed, falling back to basic staff data:', assignmentError);
        
        // Fallback to basic staff data without assignments
        const staffData = await FirebaseService.fetchStaff();
        setKarmis(staffData);
        
        // Set default assignment stats
        setAssignmentStats({
          totalAssignments: 0,
          pendingAssignments: 0,
          completedAssignments: 0,
          staffWithWork: 0,
          unassignedDetections: 0
        });
        
        // If no data exists, show migration option
        if (staffData.length === 0) {
          setMigrationStatus('No staff data found. Click "Migrate Data" to add the initial staff members.');
        }
      }
    } catch (err) {
      console.error('Error loading staff data:', err);
      setError('Failed to load staff data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleMigrateData = async () => {
    try {
      setLoading(true);
      const result = await runStaffMigration();
      if (result.success) {
        setMigrationStatus('Data migrated successfully!');
        await loadStaffData(); // Reload data after migration
      } else {
        setError(result.message);
      }
    } catch (err) {
      console.error('Migration error:', err);
      setError('Migration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Filter safai karmis based on search and status
  const filteredKarmis = karmis.filter(karmi => {
    const matchesSearch = karmi.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         karmi.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         karmi.workingArea.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' || karmi.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Calculate stats
  const totalKarmis = karmis.length;
  const activeKarmis = karmis.filter(k => k.status === 'Active').length;
  const totalAssignedWork = karmis.reduce((sum, k) => sum + (k.totalAssignedWork || 0), 0);
  const pendingWork = karmis.reduce((sum, k) => sum + (k.pendingWork || 0), 0);

  const stats = [
    {
      name: 'Total Safai Karmis',
      value: totalKarmis.toString(),
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      name: 'Active Workers',
      value: activeKarmis.toString(),
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      name: 'Assigned Work',
      value: totalAssignedWork.toString(),
      icon: Briefcase,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
    },
    {
      name: 'Pending Work',
      value: pendingWork.toString(),
      icon: Square,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active':
        return 'bg-green-100 text-green-800';
      case 'On Leave':
        return 'bg-yellow-100 text-yellow-800';
      case 'Inactive':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 4.5) return 'text-green-600';
    if (rating >= 4.0) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Modal handlers
  const handleAddKarmi = () => {
    setModalMode('add');
    setSelectedKarmi(null);
    setIsModalOpen(true);
  };

  const handleEditKarmi = (karmi: SafaiKarmi) => {
    setModalMode('edit');
    setSelectedKarmi(karmi);
    setIsModalOpen(true);
  };

  const handleViewKarmi = (karmi: SafaiKarmi) => {
    setModalMode('view');
    setSelectedKarmi(karmi);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedKarmi(null);
  };

  // Assigned work handlers
  const handleViewAssignedWork = async (karmi: SafaiKarmi) => {
    try {
      setLoading(true);
      const assignedWork = await AssignmentService.getAssignedWorkForStaff(karmi.id);
      setSelectedKarmiWork(assignedWork);
      setShowWorkModal(true);
    } catch (err) {
      console.error('Error loading assigned work:', err);
      setError('Failed to load assigned work. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseWorkModal = () => {
    setShowWorkModal(false);
    setSelectedKarmiWork(null);
  };

  const handleUpdateWorkStatus = async (detectionId: string, status: 'pending' | 'in_progress' | 'completed' | 'cancelled') => {
    try {
      await AssignmentService.updateWorkStatus(detectionId, status);
      // Reload data to reflect changes
      await loadStaffData();
      // Update the work modal if it's open
      if (selectedKarmiWork) {
        const updatedWork = selectedKarmiWork.map(work => 
          work.detectionId === detectionId ? { ...work, status } : work
        );
        setSelectedKarmiWork(updatedWork);
      }
    } catch (err) {
      console.error('Error updating work status:', err);
      setError('Failed to update work status. Please try again.');
    }
  };


  // Save new karmi
  const handleSaveKarmi = async (karmiData: Omit<SafaiKarmi, 'id'>) => {
    try {
      setLoading(true);
      const newKarmiData = {
        ...karmiData,
        lastActive: 'Just now'
      };
      await FirebaseService.addStaff(newKarmiData);
      await loadStaffData(); // Reload data from Firebase
    } catch (err) {
      console.error('Error saving karmi:', err);
      setError('Failed to save safai karmi. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Update existing karmi
  const handleUpdateKarmi = async (id: string, karmiData: Omit<SafaiKarmi, 'id'>) => {
    try {
      setLoading(true);
      const updatedKarmiData = {
        ...karmiData,
        lastActive: 'Just now'
      };
      await FirebaseService.updateStaff(id, updatedKarmiData);
      await loadStaffData(); // Reload data from Firebase
    } catch (err) {
      console.error('Error updating karmi:', err);
      setError('Failed to update safai karmi. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Remove karmi
  const handleRemoveKarmi = async (id: string) => {
    if (window.confirm('Are you sure you want to remove this safai karmi?')) {
      try {
        setLoading(true);
        await FirebaseService.deleteStaff(id);
        await loadStaffData(); // Reload data from Firebase
      } catch (err) {
        console.error('Error removing karmi:', err);
        setError('Failed to remove safai karmi. Please try again.');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Safai Karmi Management</h1>
          <p className="text-gray-600 mt-1">
            Manage and monitor waste collection workers across Kolkata
          </p>
        </div>
        <div className="flex space-x-3">
          {migrationStatus && (
            <button 
              onClick={handleMigrateData}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Migrate Data
            </button>
          )}
          <button 
            onClick={autoAssignWork}
            disabled={loading}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <Briefcase className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Assign Work
          </button>
          <button 
            onClick={handleAddKarmi}
            disabled={loading}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Safai Karmi
          </button>
        </div>
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

      {/* Migration Status */}
      {migrationStatus && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <RefreshCw className="h-5 w-5 text-blue-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">Migration Status</h3>
              <div className="mt-2 text-sm text-blue-700">
                <p>{migrationStatus}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {stats.map((stat) => (
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
                placeholder="Search by name, ID, or working area..."
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
              <option value="Active">Active</option>
              <option value="On Leave">On Leave</option>
              <option value="Inactive">Inactive</option>
            </select>
            <button className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
              <Filter className="h-4 w-4 mr-2" />
              More Filters
            </button>
          </div>
        </div>
      </div>

      {/* Safai Karmis table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Safai Karmis ({filteredKarmis.length})
          </h3>
        </div>
        
        {loading ? (
          <div className="px-6 py-12 text-center">
            <RefreshCw className="h-8 w-8 text-gray-400 mx-auto mb-4 animate-spin" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Loading staff data...</h3>
            <p className="text-gray-500">Please wait while we fetch the latest information.</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {filteredKarmis.map((karmi) => (
            <li key={karmi.id}>
              <div className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
                <div className="flex items-center">
                  <div className="flex-shrink-0 h-12 w-12">
                    <div className="h-12 w-12 rounded-full bg-indigo-500 flex items-center justify-center">
                      <span className="text-sm font-medium text-white">
                        {karmi.name.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <div className="flex items-center">
                      <p className="text-sm font-medium text-gray-900">{karmi.name}</p>
                      <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(karmi.status)}`}>
                        {karmi.status}
                      </span>
                    </div>
                    <div className="flex items-center mt-1 space-x-4">
                      <div className="flex items-center text-sm text-gray-500">
                        <User className="h-4 w-4 mr-1" />
                        {karmi.id}
                      </div>
                      <div className="flex items-center text-sm text-gray-500">
                        <Phone className="h-4 w-4 mr-1" />
                        {karmi.phone}
                      </div>
                      <div className="flex items-center text-sm text-gray-500">
                        <MapPin className="h-4 w-4 mr-1" />
                        {karmi.workingArea}
                      </div>
                      {(karmi.totalAssignedWork || 0) > 0 && (
                        <div className="flex items-center text-sm text-indigo-600">
                          <Briefcase className="h-4 w-4 mr-1" />
                          {karmi.totalAssignedWork} assigned
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-6">
                  <div className="text-right">
                    <div className="flex items-center justify-end mb-1">
                      <span className="text-sm font-medium text-gray-900">
                        {karmi.totalCollections.toLocaleString()} collections
                      </span>
                      <span className={`ml-2 text-sm font-medium ${getRatingColor(karmi.rating)}`}>
                        ⭐ {karmi.rating}
                      </span>
                    </div>
                    <div className="flex items-center justify-end space-x-4 text-sm text-gray-500">
                      <span>Last active: {karmi.lastActive}</span>
                      {(karmi.pendingWork || 0) > 0 && (
                        <span className="text-orange-600 font-medium">
                          {karmi.pendingWork} pending
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">Joined: {new Date(karmi.joinDate).toLocaleDateString()}</p>
                  </div>
                  <div className="flex space-x-2">
                    {(karmi.totalAssignedWork || 0) > 0 && (
                      <button 
                        onClick={() => handleViewAssignedWork(karmi)}
                        className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                      >
                        View Work
                      </button>
                    )}
                    <button 
                      onClick={() => handleEditKarmi(karmi)}
                      className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
                    >
                      Edit
                    </button>
                    <button 
                      onClick={() => handleViewKarmi(karmi)}
                      className="text-green-600 hover:text-green-900 text-sm font-medium"
                    >
                      View Details
                    </button>
                    <button 
                      onClick={() => handleRemoveKarmi(karmi.id)}
                      className="text-red-600 hover:text-red-900 text-sm font-medium"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            </li>
          ))}
          </ul>
        )}
        
        {!loading && filteredKarmis.length === 0 && (
          <div className="px-6 py-12 text-center">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No safai karmis found</h3>
            <p className="text-gray-500">
              {karmis.length === 0 
                ? 'No staff members have been added yet. Click "Add Safai Karmi" to get started.'
                : 'Try adjusting your search or filter criteria.'
              }
            </p>
          </div>
        )}
      </div>

      {/* Modal */}
      <SafaiKarmiModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveKarmi}
        onUpdate={handleUpdateKarmi}
        karmi={selectedKarmi}
        mode={modalMode}
      />

      {/* Assigned Work Modal */}
      {showWorkModal && selectedKarmiWork && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-2/3 shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-medium text-gray-900">
                Assigned Work ({selectedKarmiWork.length} tasks)
              </h3>
              <button
                onClick={handleCloseWorkModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4 max-h-96 overflow-y-auto">
              {selectedKarmiWork.map((work) => (
                <div key={work.detectionId} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <MapPin className="h-4 w-4 text-gray-500" />
                        <span className="text-sm font-medium text-gray-900">{work.address}</span>
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          work.status === 'completed' ? 'bg-green-100 text-green-800' :
                          work.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                          work.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {work.status}
                        </span>
                      </div>
                      <div className="text-sm text-gray-500 space-y-1">
                        <p>Confidence: {(work.confidenceScore * 100).toFixed(1)}%</p>
                        <p>Assigned: {new Date(work.assignedAt).toLocaleString()}</p>
                        <p>Location: {work.latitude.toFixed(4)}, {work.longitude.toFixed(4)}</p>
                      </div>
                    </div>
                    <div className="flex space-x-2 ml-4">
                      {work.status === 'pending' && (
                        <button
                          onClick={() => handleUpdateWorkStatus(work.detectionId, 'in_progress')}
                          className="px-3 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100"
                        >
                          Start
                        </button>
                      )}
                      {work.status === 'in_progress' && (
                        <button
                          onClick={() => handleUpdateWorkStatus(work.detectionId, 'completed')}
                          className="px-3 py-1 text-xs font-medium text-green-600 bg-green-50 rounded-md hover:bg-green-100"
                        >
                          Complete
                        </button>
                      )}
                      {(work.status === 'pending' || work.status === 'in_progress') && (
                        <button
                          onClick={() => handleUpdateWorkStatus(work.detectionId, 'cancelled')}
                          className="px-3 py-1 text-xs font-medium text-red-600 bg-red-50 rounded-md hover:bg-red-100"
                        >
                          Cancel
                        </button>
                      )}
                      
                      {/* WhatsApp Notification Button */}
                      {selectedKarmiWork && (
                        <WhatsAppNotificationButton
                          staff={karmis.find(k => k.assignedWork?.some(w => w.detectionId === work.detectionId)) || karmis[0]}
                          work={work}
                          type={work.status === 'completed' ? 'work_completed' : 'work_assignment'}
                          className="text-xs"
                          showPreview={false}
                        />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {selectedKarmiWork.length === 0 && (
              <div className="text-center py-8">
                <Briefcase className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No assigned work</h3>
                <p className="text-gray-500">This staff member has no assigned work at the moment.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
