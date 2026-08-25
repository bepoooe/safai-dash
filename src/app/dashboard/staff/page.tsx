'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Users, 
  Plus, 
  Search, 
  Filter, 
  MapPin, 
  Phone, 
  User, 
  CheckCircle, 
  AlertTriangle, 
  RefreshCw, 
  Briefcase, 
  Square, 
  X,
  Navigation,
  ExternalLink,
  Clock,
  Play,
  Star,
  Check,
  Ban,
  Sparkles
} from 'lucide-react';
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
  const [viewWorkKarmi, setViewWorkKarmi] = useState<SafaiKarmi | null>(null);
  const [workModalFilter, setWorkModalFilter] = useState<'all' | 'pending' | 'in_progress' | 'completed' | 'cancelled'>('all');
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
      setViewWorkKarmi(karmi);
      setWorkModalFilter('all');
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
    setViewWorkKarmi(null);
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
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Safai Karmi Management</h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">
            Manage and monitor waste collection workers across Kolkata
          </p>
        </div>
        <div className="flex flex-wrap gap-2 flex-shrink-0">
          {migrationStatus && (
            <button 
              onClick={handleMigrateData}
              disabled={loading}
              className="inline-flex items-center px-3 py-2 sm:px-4 border border-[#ded5c5] text-sm font-medium rounded-md shadow-sm text-[#4a3b32] bg-[#ded8c4] hover:bg-[#d0c6b0] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#964b28] disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 mr-1 sm:mr-2 ${loading ? 'animate-spin' : ''}`} />
              Migrate
            </button>
          )}
          <button 
            onClick={autoAssignWork}
            disabled={loading}
            className="inline-flex items-center px-3 py-2 sm:px-4 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-[#ba7861] hover:bg-[#a6644f] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#ba7861] disabled:opacity-50"
          >
            <Briefcase className={`h-4 w-4 mr-1 sm:mr-2 ${loading ? 'animate-spin' : ''}`} />
            Assign Work
          </button>
          <button 
            onClick={handleAddKarmi}
            disabled={loading}
            className="inline-flex items-center px-3 py-2 sm:px-4 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-[#964b28] hover:bg-[#7e3e1f] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#964b28] disabled:opacity-50"
          >
            <Plus className="h-4 w-4 mr-1 sm:mr-2" />
            Add Karmi
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
        <div className="bg-[#f0e2d8] border border-[#dfccc1] rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <RefreshCw className="h-5 w-5 text-[#8a4220]" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-bold text-[#8a4220]">Migration Status</h3>
              <div className="mt-2 text-sm text-[#4a3b32]">
                <p>{migrationStatus}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {stats.map((stat) => (
          <div key={stat.name} className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-[#ded5c5]">
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
      <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-[#ded5c5]">
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
                className="block w-full pl-10 pr-3 py-2 border border-[#ded5c5] rounded-md leading-5 bg-[#fdfbf7] placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-[#964b28] focus:border-[#964b28] sm:text-sm"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="flex-1 sm:flex-none inline-flex items-center px-3 py-2 border border-[#ded5c5] text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-[#fdfbf7] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#964b28]"
            >
              <option value="All">All Status</option>
              <option value="Active">Active</option>
              <option value="On Leave">On Leave</option>
              <option value="Inactive">Inactive</option>
            </select>
            <button className="inline-flex items-center px-3 py-2 border border-[#ded5c5] text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-[#fdfbf7] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#964b28]">
              <Filter className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">More Filters</span>
            </button>
          </div>
        </div>
      </div>

      {/* Safai Karmis list */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg border border-[#ded5c5]">
        <div className="px-4 sm:px-6 py-4 border-b border-[#ded5c5]">
          <h3 className="text-base sm:text-lg font-medium text-gray-900">
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
          <ul className="divide-y divide-[#ded5c5]">
            {filteredKarmis.map((karmi) => (
            <li key={karmi.id}>
              <div className="px-4 sm:px-6 py-4 hover:bg-[#fdfbf7]">
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className="flex-shrink-0 h-10 w-10 sm:h-12 sm:w-12">
                    <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-[#964b28] flex items-center justify-center">
                      <span className="text-sm font-bold text-white">
                        {karmi.name.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 mb-1">
                      <p className="text-sm font-bold text-gray-900">{karmi.name}</p>
                      <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusColor(karmi.status)}`}>
                        {karmi.status}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500 mb-2">
                      <div className="flex items-center">
                        <User className="h-3.5 w-3.5 mr-1 flex-shrink-0" />
                        {karmi.id}
                      </div>
                      <div className="flex items-center">
                        <Phone className="h-3.5 w-3.5 mr-1 flex-shrink-0" />
                        {karmi.phone}
                      </div>
                      <div className="flex items-center">
                        <MapPin className="h-3.5 w-3.5 mr-1 flex-shrink-0" />
                        {karmi.workingArea}
                      </div>
                      {(karmi.totalAssignedWork || 0) > 0 && (
                        <div className="flex items-center text-[#964b28] font-medium">
                          <Briefcase className="h-3.5 w-3.5 mr-1 flex-shrink-0" />
                          {karmi.totalAssignedWork} assigned
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                      <span className="font-medium text-gray-900">{karmi.totalCollections.toLocaleString()} collections</span>
                      <span className={`font-medium ${getRatingColor(karmi.rating)}`}>⭐ {karmi.rating}</span>
                      <span>Last active: {karmi.lastActive}</span>
                      {(karmi.pendingWork || 0) > 0 && (
                        <span className="text-orange-600 font-medium">{karmi.pendingWork} pending</span>
                      )}
                    </div>
                  </div>
                </div>
                {/* Action buttons */}
                <div className="flex flex-wrap gap-2 mt-3 pl-0 sm:pl-[60px]">
                  {(karmi.totalAssignedWork || 0) > 0 && (
                    <button 
                      onClick={() => handleViewAssignedWork(karmi)}
                      className="text-[#964b28] hover:text-[#7e3e1f] text-xs sm:text-sm font-semibold px-2.5 py-1 rounded-md hover:bg-[#f0e2d8]/60 transition-colors"
                    >
                      View Work
                    </button>
                  )}
                  <button 
                    onClick={() => handleEditKarmi(karmi)}
                    className="text-[#ba7861] hover:text-[#a6644f] text-xs sm:text-sm font-semibold px-2.5 py-1 rounded-md hover:bg-[#f0e2d8]/60 transition-colors"
                  >
                    Edit
                  </button>
                  <button 
                    onClick={() => handleViewKarmi(karmi)}
                    className="text-[#594d3b] hover:text-[#3d3326] text-xs sm:text-sm font-semibold px-2.5 py-1 rounded-md hover:bg-[#ded8c4]/50 transition-colors"
                  >
                    View
                  </button>
                  <button 
                    onClick={() => handleRemoveKarmi(karmi.id)}
                    className="text-red-600 hover:text-red-900 text-xs sm:text-sm font-semibold px-2.5 py-1 rounded-md hover:bg-red-50 transition-colors"
                  >
                    Remove
                  </button>
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

      {/* Modern Upgraded Assigned Work Modal */}
      {showWorkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="relative my-4 w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-[#ded5c5] overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-[#8a4220] to-[#ba7861] p-4 sm:p-5 text-white flex-shrink-0">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white/20 border-2 border-white/40 flex items-center justify-center text-white font-black text-sm sm:text-base flex-shrink-0">
                    {viewWorkKarmi?.name.charAt(0) || 'K'}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base sm:text-lg font-black leading-tight truncate">
                        {viewWorkKarmi?.name || 'Safai Karmi'}
                      </h3>
                      {viewWorkKarmi?.rating && (
                        <span className="inline-flex items-center gap-0.5 text-[11px] font-bold bg-white/20 px-2 py-0.5 rounded-full">
                          <Star className="h-3 w-3 fill-amber-300 text-amber-300" />
                          {viewWorkKarmi.rating}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-amber-100 mt-1 font-medium">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                        {viewWorkKarmi?.workingArea || 'Assigned Ward'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Phone className="h-3.5 w-3.5 flex-shrink-0" />
                        {viewWorkKarmi?.phone || 'No Phone'}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleCloseWorkModal}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors flex-shrink-0"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Task Summary KPI Grid */}
            {selectedKarmiWork && selectedKarmiWork.length > 0 && (
              <div className="grid grid-cols-4 gap-2 p-3 sm:p-4 bg-[#fdfbf7] border-b border-[#ded5c5] flex-shrink-0">
                <div className="p-2 rounded-xl bg-white border border-[#ded5c5] text-center shadow-2xs">
                  <p className="text-[10px] font-bold uppercase text-[#7a6a58]">Total</p>
                  <p className="text-base sm:text-lg font-black text-[#1f1712]">{selectedKarmiWork.length}</p>
                </div>
                <div className="p-2 rounded-xl bg-amber-50 border border-amber-200 text-center shadow-2xs">
                  <p className="text-[10px] font-bold uppercase text-amber-800">Pending</p>
                  <p className="text-base sm:text-lg font-black text-amber-900">
                    {selectedKarmiWork.filter(w => w.status === 'pending').length}
                  </p>
                </div>
                <div className="p-2 rounded-xl bg-orange-50 border border-orange-200 text-center shadow-2xs">
                  <p className="text-[10px] font-bold uppercase text-orange-800">In Progress</p>
                  <p className="text-base sm:text-lg font-black text-orange-900">
                    {selectedKarmiWork.filter(w => w.status === 'in_progress').length}
                  </p>
                </div>
                <div className="p-2 rounded-xl bg-green-50 border border-green-200 text-center shadow-2xs">
                  <p className="text-[10px] font-bold uppercase text-green-800">Completed</p>
                  <p className="text-base sm:text-lg font-black text-green-900">
                    {selectedKarmiWork.filter(w => w.status === 'completed').length}
                  </p>
                </div>
              </div>
            )}

            {/* Modal Filter Tabs */}
            {selectedKarmiWork && selectedKarmiWork.length > 0 && (
              <div className="flex items-center gap-1.5 px-4 sm:px-5 py-2 border-b border-[#ded5c5] bg-white overflow-x-auto flex-shrink-0">
                {(['all', 'pending', 'in_progress', 'completed'] as const).map((tab) => {
                  const count = tab === 'all' 
                    ? selectedKarmiWork.length 
                    : selectedKarmiWork.filter(w => w.status === tab).length;

                  return (
                    <button
                      key={tab}
                      onClick={() => setWorkModalFilter(tab)}
                      className={`px-3 py-1 text-xs font-bold rounded-lg transition capitalize shrink-0 ${
                        workModalFilter === tab
                          ? 'bg-[#964b28] text-white shadow-2xs'
                          : 'text-[#7a6a58] hover:bg-[#fdfbf7]'
                      }`}
                    >
                      {tab === 'all' ? 'All Tasks' : tab.replace('_', ' ')} ({count})
                    </button>
                  );
                })}
              </div>
            )}

            {/* Scrollable Tasks Body */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-3 flex-1 bg-[#faf8f4]">
              {selectedKarmiWork && selectedKarmiWork
                .filter(w => workModalFilter === 'all' || w.status === workModalFilter)
                .map((work) => {
                  const statusBadgeClass = 
                    work.status === 'completed' ? 'bg-green-100 text-green-800 border-green-200' :
                    work.status === 'in_progress' ? 'bg-orange-100 text-orange-800 border-orange-200' :
                    work.status === 'cancelled' ? 'bg-red-100 text-red-800 border-red-200' :
                    'bg-amber-100 text-amber-800 border-amber-200';

                  const mapNavUrl = `https://www.google.com/maps/dir/?api=1&destination=${work.latitude},${work.longitude}`;

                  return (
                    <div 
                      key={work.detectionId} 
                      className="bg-white border border-[#ded5c5] rounded-xl p-3.5 sm:p-4 shadow-xs space-y-3 hover:border-[#ba7861] transition"
                    >
                      {/* Top Row: Location & Status */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-[#ded8c4] text-[#4a3b32]">
                              Garbage Hotspot
                            </span>
                            <span className="text-[10px] font-bold text-[#7a6a58] flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(work.assignedAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-xs sm:text-sm font-bold text-[#1f1712] leading-snug">
                            {work.address}
                          </p>
                        </div>

                        <span className={`px-2.5 py-1 text-[10px] font-extrabold uppercase rounded-full border ${statusBadgeClass} shrink-0`}>
                          {work.status.replace('_', ' ')}
                        </span>
                      </div>

                      {/* Coordinates & Google Maps Link */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#f0e8dc] text-xs">
                        <div className="flex items-center gap-3 text-[#7a6a58] font-mono text-[11px]">
                          <span>{work.latitude.toFixed(4)}°N, {work.longitude.toFixed(4)}°E</span>
                          {work.confidenceScore > 0 && (
                            <span className="font-sans font-bold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded">
                              {(work.confidenceScore * 100).toFixed(0)}% Severity
                            </span>
                          )}
                        </div>

                        <a
                          href={mapNavUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-[#964b28] hover:text-[#7e3e1f] hover:underline"
                        >
                          <Navigation className="h-3 w-3" />
                          <span>Google Maps Route</span>
                          <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      </div>

                      {/* Action Controls */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#f0e8dc]">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {work.status === 'pending' && (
                            <button
                              onClick={() => handleUpdateWorkStatus(work.detectionId, 'in_progress')}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-white bg-[#964b28] hover:bg-[#7e3e1f] rounded-lg shadow-2xs transition"
                            >
                              <Play className="h-3 w-3" />
                              <span>Start Task</span>
                            </button>
                          )}
                          {work.status === 'in_progress' && (
                            <button
                              onClick={() => handleUpdateWorkStatus(work.detectionId, 'completed')}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-white bg-green-600 hover:bg-green-700 rounded-lg shadow-2xs transition"
                            >
                              <Check className="h-3 w-3" />
                              <span>Mark Complete</span>
                            </button>
                          )}
                          {(work.status === 'pending' || work.status === 'in_progress') && (
                            <button
                              onClick={() => handleUpdateWorkStatus(work.detectionId, 'cancelled')}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition"
                            >
                              <Ban className="h-3 w-3" />
                              <span>Cancel</span>
                            </button>
                          )}
                        </div>

                        {/* WhatsApp Notification Button */}
                        <div>
                          <WhatsAppNotificationButton
                            staff={viewWorkKarmi || karmis[0]}
                            work={work}
                            type={work.status === 'completed' ? 'work_completed' : 'work_assignment'}
                            className="text-xs"
                            showPreview={false}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}

              {(!selectedKarmiWork || selectedKarmiWork.length === 0) && (
                <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-[#ded5c5]">
                  <Briefcase className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                  <h4 className="text-sm font-bold text-[#1f1712]">No Assigned Tasks</h4>
                  <p className="text-xs text-[#7a6a58] mt-0.5 max-w-xs mx-auto">
                    This Safai Karmi currently has no active cleanup deployments assigned.
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3.5 bg-[#fdfbf7] border-t border-[#ded5c5] flex items-center justify-end flex-shrink-0">
              <button
                onClick={handleCloseWorkModal}
                className="px-4 py-2 text-xs font-bold text-[#4a3b32] bg-white border border-[#ded5c5] rounded-xl hover:bg-[#f5ede2] transition shadow-2xs"
              >
                Close Work View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
