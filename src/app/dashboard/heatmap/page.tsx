'use client';

import { useEffect, useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { 
  MapPin, 
  Activity, 
  RefreshCw, 
  Map, 
  Satellite, 
  AlertCircle, 
  CheckCircle, 
  Trash2,
  Search,
  UserCheck,
  Camera,
  User,
  Eye,
  X,
  Compass,
  SlidersHorizontal,
  Layers,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { ModelResult } from '@/types/garbage-detection';
import { Citizen } from '@/types/citizen';
import { SafaiKarmi } from '@/types/staff';
import { HeatmapProcessingService, ProcessedModelResult } from '@/services/heatmapProcessingService';
import { AutomatedCleanupService } from '@/services/automatedCleanupService';
import { FirebaseService } from '@/services/firebaseService';
import SafaiDispatchModal, { DispatchTarget } from '@/components/SafaiDispatchModal';

// Import Leaflet CSS
import 'leaflet/dist/leaflet.css';
import '@/styles/leaflet.css';

// Dynamically import the map component to avoid SSR issues
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
);

const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
);

const LayerGroup = dynamic(
  () => import('react-leaflet').then((mod) => mod.LayerGroup),
  { ssr: false }
);

const GeodesicAreasLayer = dynamic(
  () => import('@/components/GeodesicAreasLayer'),
  { ssr: false }
);

const DEFAULT_CENTER = [22.5726, 88.3639] as [number, number];

const TILE_LAYERS = {
  terrain: {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
    minZoom: 10,
  },
  satellite: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: '&copy; <a href="https://www.esri.com/">Esri</a>',
    maxZoom: 19,
    minZoom: 10,
  },
  satelliteWithLabels: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}",
    attribution: '&copy; <a href="https://www.esri.com/">Esri</a>',
    maxZoom: 19,
    minZoom: 10,
  }
};

type MapType = 'terrain' | 'satellite' | 'satelliteWithLabels';
type IncidentFilter = 'all' | 'cctv' | 'citizen';
type StatusFilter = 'all' | 'high' | 'pending' | 'in_progress' | 'resolved';

export default function HeatmapPage() {
  const [modelResults, setModelResults] = useState<ProcessedModelResult[]>([]);
  const [citizens, setCitizens] = useState<Citizen[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [mapType, setMapType] = useState<MapType>('terrain');
  const [showLabels, setShowLabels] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Stats
  const [totalDataPoints, setTotalDataPoints] = useState(0);
  const [averageConfidence, setAverageConfidence] = useState(0);
  const [mapCenter, setMapCenter] = useState<[number, number]>(DEFAULT_CENTER);
  const [removedCount, setRemovedCount] = useState(0);

  // Layers Visibility
  const [showCctvLayer, setShowCctvLayer] = useState(true);
  const [showCitizenLayer, setShowCitizenLayer] = useState(true);

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [incidentFilter, setIncidentFilter] = useState<IncidentFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  // Navigation & Selection
  const [selectedTarget, setSelectedTarget] = useState<{ id: string; type: 'cctv' | 'citizen'; lat: number; lng: number } | null>(null);
  const [mobileTab, setMobileTab] = useState<'map' | 'list'>('map');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Dispatch Modal
  const [dispatchTarget, setDispatchTarget] = useState<DispatchTarget | null>(null);
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);

  // Photo Lightbox
  const [lightboxPhoto, setLightboxPhoto] = useState<{ url: string; caption: string } | null>(null);

  // Notifications
  const [toastNotification, setToastNotification] = useState<{
    show: boolean;
    message: string;
    type: 'success' | 'info';
  }>({ show: false, message: '', type: 'info' });

  // Auto-refresh data every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refreshData();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // Initial Data Load
  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setIsLoading(true);
    setMapLoaded(false);
    setError(null);

    try {
      const [processedData, citizenData] = await Promise.all([
        HeatmapProcessingService.getProcessedHeatmapData(),
        FirebaseService.fetchCitizens().catch(() => [])
      ]);

      setModelResults(processedData.results);
      setCitizens(citizenData);
      setTotalDataPoints(processedData.totalCount);
      setAverageConfidence(processedData.averageConfidence);
      setRemovedCount(processedData.removedCount);

      // Center map on first valid data point
      if (processedData.results.length > 0) {
        const first = processedData.results[0];
        setMapCenter([first.latitude, first.longitude]);
      } else if (citizenData.length > 0 && citizenData[0].location?.latitude) {
        setMapCenter([citizenData[0].location.latitude, citizenData[0].location.longitude]);
      }

      setLastUpdated(new Date());
      setIsLoading(false);
      setTimeout(() => setMapLoaded(true), 400);
    } catch (err) {
      console.error('Error loading heatmap & citizen data:', err);
      setError('Failed to load live data from Firebase. Please try again.');
      setIsLoading(false);
    }
  };

  const refreshData = async () => {
    setError(null);
    try {
      // Run cleanup routine
      const cleanupStats = await AutomatedCleanupService.performAutomaticCleanup();
      if (cleanupStats.removedDetections > 0) {
        showToast(`🧹 Database cleanup completed! Removed ${cleanupStats.removedDetections} cleaned points.`, 'success');
      }

      const [processedData, citizenData] = await Promise.all([
        HeatmapProcessingService.getProcessedHeatmapData(),
        FirebaseService.fetchCitizens().catch(() => [])
      ]);

      setModelResults(processedData.results);
      setCitizens(citizenData);
      setTotalDataPoints(processedData.totalCount);
      setAverageConfidence(processedData.averageConfidence);
      setRemovedCount(processedData.removedCount);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error refreshing data:', err);
      setError('Failed to refresh data from Firebase.');
    }
  };

  const showToast = (message: string, type: 'success' | 'info' = 'info') => {
    setToastNotification({ show: true, message, type });
    setTimeout(() => {
      setToastNotification(prev => ({ ...prev, show: false }));
    }, 4500);
  };

  // Dispatch Handlers
  const handleOpenDispatch = (target: DispatchTarget) => {
    setDispatchTarget(target);
    setIsDispatchModalOpen(true);
  };

  const handleDispatchSuccess = (targetId: string, targetType: 'cctv' | 'citizen', staff: SafaiKarmi) => {
    showToast(`🚀 Safai Karmi ${staff.name} deployed to target area!`, 'success');

    // Instant local state updates
    if (targetType === 'cctv') {
      setModelResults(prev => prev.map(item => {
        if (item.id === targetId) {
          return {
            ...item,
            workStatus: 'in_progress',
            assignedAt: new Date().toISOString()
          };
        }
        return item;
      }));
    } else {
      setCitizens(prev => prev.map(item => {
        if (item.id === targetId) {
          return {
            ...item,
            status: 'in_progress',
            assignedStaffId: staff.id,
            assignedStaffName: staff.name,
            assignedAt: new Date().toISOString()
          };
        }
        return item;
      }));
    }
  };

  // Filtered List Items
  const filteredIncidents = useMemo(() => {
    const term = searchTerm.toLowerCase();

    // 1. CCTV Incidents
    const cctvList = (incidentFilter === 'citizen' ? [] : modelResults)
      .filter(item => {
        const matchesSearch = 
          item.address.toLowerCase().includes(term) ||
          item.id.toLowerCase().includes(term);

        if (!matchesSearch) return false;

        if (statusFilter === 'high') return item.confidence_score >= 0.6;
        if (statusFilter === 'pending') return !item.workStatus || item.workStatus === 'pending';
        if (statusFilter === 'in_progress') return item.workStatus === 'in_progress';
        if (statusFilter === 'resolved') return item.workStatus === 'completed' || item.confidence_score === 0;
        return true;
      })
      .map(item => ({
        id: item.id,
        type: 'cctv' as const,
        title: item.address,
        latitude: item.latitude,
        longitude: item.longitude,
        accuracy: item.accuracy,
        confidence: item.confidence_score,
        status: item.workStatus || 'pending',
        timestamp: item.timestamp,
        assignedStaffName: undefined,
        description: undefined,
        imageUrl: item.image_url,
        citizenName: undefined
      }));

    // 2. Citizen Incidents
    const citizenList = (incidentFilter === 'cctv' ? [] : citizens)
      .filter(item => {
        const matchesSearch = 
          (item.location?.address || '').toLowerCase().includes(term) ||
          item.name.toLowerCase().includes(term) ||
          item.description.toLowerCase().includes(term) ||
          item.id.toLowerCase().includes(term);

        if (!matchesSearch) return false;

        if (statusFilter === 'high') return item.status === 'pending';
        if (statusFilter === 'pending') return item.status === 'pending';
        if (statusFilter === 'in_progress') return item.status === 'in_progress';
        if (statusFilter === 'resolved') return item.status === 'resolved';
        return true;
      })
      .map(item => ({
        id: item.id,
        type: 'citizen' as const,
        title: item.location?.address || 'Citizen Reported Location',
        latitude: item.location?.latitude || 0,
        longitude: item.location?.longitude || 0,
        accuracy: item.location?.accuracy,
        confidence: undefined,
        status: item.status,
        timestamp: item.timestamp.toISOString(),
        assignedStaffName: item.assignedStaffName,
        description: item.description,
        imageUrl: item.imageUrl,
        citizenName: item.name
      }));

    const combined = [...cctvList, ...citizenList];
    // Sort newest first
    return combined.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [modelResults, citizens, searchTerm, incidentFilter, statusFilter]);

  // Selected item object lookup
  const currentSelectedItem = useMemo(() => {
    if (!selectedTarget) return null;
    return filteredIncidents.find(i => i.id === selectedTarget.id && i.type === selectedTarget.type) || null;
  }, [selectedTarget, filteredIncidents]);

  const handleSelectIncident = (item: { id: string; type: 'cctv' | 'citizen'; latitude: number; longitude: number }) => {
    setSelectedTarget({
      id: item.id,
      type: item.type,
      lat: item.latitude,
      lng: item.longitude
    });
    // On mobile, switch back to map view so user immediately sees the focused point
    setMobileTab('map');
  };

  const highRiskCount = modelResults.filter(r => r.confidence_score >= 0.6).length;
  const inProgressCount = modelResults.filter(r => r.workStatus === 'in_progress').length +
                          citizens.filter(c => c.status === 'in_progress').length;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Top Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white/95 rounded-2xl p-4 sm:p-5 border border-[#ded5c5] shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-[#1f1712] tracking-tight">
            Garbage Hotspot Heatmap & Field Dispatch
          </h1>
          <p className="text-xs sm:text-sm font-medium text-[#6b5c4e] mt-0.5">
            Real-time geospatial intelligence, AI CCTV detections, citizen reports & Safai Karmi deployment.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={async () => {
              try {
                const cleanupStats = await AutomatedCleanupService.performAutomaticCleanup();
                if (cleanupStats.removedDetections > 0) {
                  showToast(`🧹 Manual cleanup complete! Removed ${cleanupStats.removedDetections} cleaned points.`, 'success');
                } else {
                  showToast('ℹ️ All database points are active and up to date.', 'info');
                }
                refreshData();
              } catch (err) {
                console.error('Manual cleanup failed:', err);
              }
            }}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#ded8c4] hover:bg-[#d0c9b2] text-[#4a3b32] rounded-xl text-xs font-bold transition shadow-xs disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Clean Database</span>
          </button>

          <button
            onClick={refreshData}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#964b28] hover:bg-[#7e3e1f] text-white rounded-xl text-xs font-bold transition shadow-xs disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Live Sync</span>
          </button>
        </div>
      </div>

      {/* Toast Notification */}
      {toastNotification.show && (
        <div className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 shadow-sm animate-in fade-in slide-in-from-top-2 duration-200 ${
          toastNotification.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-blue-50 border-blue-200 text-blue-800'
        }`}>
          <div className="flex items-center gap-2 text-xs font-semibold">
            {toastNotification.type === 'success' ? <CheckCircle className="h-4 w-4 text-green-600" /> : <Activity className="h-4 w-4 text-blue-600" />}
            <span>{toastNotification.message}</span>
          </div>
          <button
            onClick={() => setToastNotification(prev => ({ ...prev, show: false }))}
            className="text-xs font-bold text-gray-500 hover:text-gray-800 p-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-3.5 rounded-xl flex items-center gap-2 text-xs font-medium">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3.5">
        <div className="bg-white border border-[#ded5c5] rounded-xl p-3 sm:p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-[#7a6a58] font-bold uppercase tracking-wider">
            <span>Total Hotspots</span>
            <MapPin className="h-4 w-4 text-[#964b28]" />
          </div>
          <p className="mt-1.5 text-xl sm:text-2xl font-black text-[#1f1712]">
            {totalDataPoints + citizens.length}
          </p>
          <p className="text-[11px] text-[#7a6a58] mt-0.5">
            {modelResults.length} CCTV · {citizens.length} Citizens
          </p>
        </div>

        <div className="bg-white border border-[#ded5c5] rounded-xl p-3 sm:p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-red-700 font-bold uppercase tracking-wider">
            <span>High Severity</span>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </div>
          <p className="mt-1.5 text-xl sm:text-2xl font-black text-red-700">
            {highRiskCount}
          </p>
          <p className="text-[11px] text-red-600/80 mt-0.5">
            Requires immediate dispatch
          </p>
        </div>

        <div className="bg-white border border-[#ded5c5] rounded-xl p-3 sm:p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-orange-700 font-bold uppercase tracking-wider">
            <span>In Progress / Dispatched</span>
            <UserCheck className="h-4 w-4 text-orange-600" />
          </div>
          <p className="mt-1.5 text-xl sm:text-2xl font-black text-orange-700">
            {inProgressCount}
          </p>
          <p className="text-[11px] text-orange-600/80 mt-0.5">
            Safai Karmis active on-site
          </p>
        </div>

        <div className="bg-white border border-[#ded5c5] rounded-xl p-3 sm:p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-emerald-700 font-bold uppercase tracking-wider">
            <span>Cleaned Areas</span>
            <CheckCircle className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-1.5 text-xl sm:text-2xl font-black text-emerald-700">
            {removedCount + citizens.filter(c => c.status === 'resolved').length}
          </p>
          <p className="text-[11px] text-emerald-600/80 mt-0.5">
            Auto-cleaned database points
          </p>
        </div>
      </div>

      {/* Mobile Tab Switcher */}
      <div className="lg:hidden flex bg-[#ded8c4] p-1 rounded-xl shadow-xs">
        <button
          onClick={() => setMobileTab('map')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition ${
            mobileTab === 'map' ? 'bg-[#964b28] text-white shadow-xs' : 'text-[#4a3b32] hover:bg-white/40'
          }`}
        >
          <Map className="h-3.5 w-3.5" />
          <span>Interactive Map</span>
        </button>
        <button
          onClick={() => setMobileTab('list')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition ${
            mobileTab === 'list' ? 'bg-[#964b28] text-white shadow-xs' : 'text-[#4a3b32] hover:bg-white/40'
          }`}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          <span>Detected Regions ({filteredIncidents.length})</span>
        </button>
      </div>

      {/* Main Interactive Workspace: 2-Panel Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left Panel: Detected Regions & Incidents Explorer */}
        <div className={`lg:col-span-4 space-y-3 ${
          mobileTab === 'list' ? 'block' : 'hidden lg:block'
        } ${isSidebarCollapsed ? 'lg:hidden' : 'lg:block'}`}>
          <div className="bg-white rounded-2xl border border-[#ded5c5] shadow-xs p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-[#1f1712] uppercase tracking-wider flex items-center gap-1.5">
                <Compass className="h-4 w-4 text-[#964b28]" />
                Detected Regions
              </h2>
              <span className="text-xs font-semibold px-2 py-0.5 bg-[#fdfbf7] text-[#7a6a58] border border-[#ded5c5] rounded-full">
                {filteredIncidents.length} Found
              </span>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by area, ward, or ID..."
                className="w-full pl-8 pr-7 py-2 text-xs bg-[#fdfbf7] border border-[#ded5c5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#964b28]"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Source Tabs */}
            <div className="flex bg-[#fdfbf7] p-1 rounded-xl border border-[#ded5c5] gap-1">
              <button
                onClick={() => setIncidentFilter('all')}
                className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition ${
                  incidentFilter === 'all' ? 'bg-[#964b28] text-white shadow-xs' : 'text-[#594d3b] hover:bg-white'
                }`}
              >
                All ({modelResults.length + citizens.length})
              </button>
              <button
                onClick={() => setIncidentFilter('cctv')}
                className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition flex items-center justify-center gap-1 ${
                  incidentFilter === 'cctv' ? 'bg-[#964b28] text-white shadow-xs' : 'text-[#594d3b] hover:bg-white'
                }`}
              >
                <span>📹</span> CCTV ({modelResults.length})
              </button>
              <button
                onClick={() => setIncidentFilter('citizen')}
                className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition flex items-center justify-center gap-1 ${
                  incidentFilter === 'citizen' ? 'bg-[#964b28] text-white shadow-xs' : 'text-[#594d3b] hover:bg-white'
                }`}
              >
                <span>👤</span> Citizen ({citizens.length})
              </button>
            </div>

            {/* Status Filter Pills */}
            <div className="flex flex-wrap gap-1 pt-1">
              {(['all', 'high', 'pending', 'in_progress', 'resolved'] as StatusFilter[]).map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border capitalize transition ${
                    statusFilter === st
                      ? 'bg-[#ded8c4] border-[#ba7861] text-[#1f1712]'
                      : 'bg-white border-[#ded5c5] text-[#7a6a58] hover:bg-[#fdfbf7]'
                  }`}
                >
                  {st === 'all' ? 'All Status' : st === 'high' ? '🔥 High Risk' : st.replace('_', ' ')}
                </button>
              ))}
            </div>

            {/* Incidents Scrollable List */}
            <div className="space-y-2.5 max-h-[580px] overflow-y-auto pr-1">
              {filteredIncidents.length === 0 ? (
                <div className="text-center py-10 bg-[#fdfbf7] rounded-xl border border-dashed border-[#ded5c5]">
                  <Compass className="h-7 w-7 text-gray-400 mx-auto mb-2" />
                  <p className="text-xs font-bold text-gray-700">No matching hotspots found</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">Try clearing your search or status filter</p>
                </div>
              ) : (
                filteredIncidents.map((incident) => {
                  const isSelected = selectedTarget?.id === incident.id && selectedTarget?.type === incident.type;
                  const isCctv = incident.type === 'cctv';

                  return (
                    <div
                      key={`${incident.type}-${incident.id}`}
                      onClick={() => handleSelectIncident(incident)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer space-y-2 ${
                        isSelected
                          ? 'border-[#964b28] bg-[#fbf3ed] ring-1 ring-[#964b28] shadow-xs'
                          : 'border-[#ded5c5] bg-white hover:bg-[#fdfbf7]'
                      }`}
                    >
                      {/* Top Meta */}
                      <div className="flex items-center justify-between gap-1.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md flex items-center gap-1 ${
                            isCctv ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {isCctv ? '📹 AI CCTV' : '👤 Citizen'}
                          </span>
                          {incident.confidence !== undefined && (
                            <span className="text-[10px] font-bold text-[#7a6a58]">
                              {(incident.confidence * 100).toFixed(0)}% Conf
                            </span>
                          )}
                        </div>

                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          incident.status === 'in_progress' ? 'bg-orange-100 text-orange-800' :
                          incident.status === 'resolved' || incident.status === 'completed' ? 'bg-green-100 text-green-800' :
                          'bg-amber-100 text-amber-800'
                        }`}>
                          {incident.status.replace('_', ' ')}
                        </span>
                      </div>

                      {/* Title & Address */}
                      <div>
                        <p className="text-xs font-bold text-[#1f1712] line-clamp-2 leading-snug">
                          {incident.title}
                        </p>
                        {incident.citizenName && (
                          <p className="text-[11px] text-[#7a6a58] mt-0.5 flex items-center gap-1">
                            <User className="h-3 w-3" /> Reported by {incident.citizenName}
                          </p>
                        )}
                      </div>

                      {/* Coordinates & Accuracy */}
                      <div className="flex items-center justify-between text-[10px] text-[#7a6a58] font-mono">
                        <span>{incident.latitude.toFixed(4)}°, {incident.longitude.toFixed(4)}°</span>
                        <span>{typeof incident.accuracy === 'string' ? incident.accuracy : `±${incident.accuracy || 100}m`}</span>
                      </div>

                      {/* Thumbnail & Description Preview if Citizen */}
                      {incident.imageUrl && (
                        <div className="relative rounded-lg overflow-hidden h-16 bg-gray-100 border border-[#ded5c5]">
                          <img
                            src={incident.imageUrl}
                            alt="Incident capture"
                            className="w-full h-full object-cover"
                          />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setLightboxPhoto({
                                url: incident.imageUrl!,
                                caption: `${incident.title} - ${incident.citizenName ? `Reported by ${incident.citizenName}` : 'Detection'}`
                              });
                            }}
                            className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/60 text-white text-[9px] font-semibold flex items-center gap-0.5"
                          >
                            <Eye className="h-2.5 w-2.5" /> Enlarge
                          </button>
                        </div>
                      )}

                      {incident.assignedStaffName && (
                        <div className="text-[10px] font-bold text-orange-800 bg-orange-50 px-2 py-1 rounded-lg border border-orange-200 flex items-center gap-1">
                          <UserCheck className="h-3 w-3" /> Dispatched: {incident.assignedStaffName}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center justify-between pt-1 border-t border-[#ded5c5] gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectIncident(incident);
                          }}
                          className="text-[11px] font-bold text-[#964b28] hover:text-[#7e3e1f] flex items-center gap-1"
                        >
                          <Compass className="h-3 w-3" /> Focus Map
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDispatch({
                              id: incident.id,
                              type: incident.type,
                              address: incident.title,
                              latitude: incident.latitude,
                              longitude: incident.longitude,
                              confidence_score: incident.confidence,
                              description: incident.description,
                              imageUrl: incident.imageUrl,
                              citizenName: incident.citizenName,
                              currentStatus: incident.status,
                              currentStaffName: incident.assignedStaffName
                            });
                          }}
                          className="px-2.5 py-1 text-[11px] font-bold bg-[#964b28] hover:bg-[#7e3e1f] text-white rounded-lg transition shadow-2xs flex items-center gap-1"
                        >
                          <UserCheck className="h-3 w-3" /> Deploy Karmi
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Panel: Interactive Heatmap Canvas & Floating Controls */}
        <div className={`space-y-4 ${
          isSidebarCollapsed ? 'lg:col-span-12' : 'lg:col-span-8'
        } ${mobileTab === 'map' ? 'block' : 'hidden lg:block'}`}>
          <div className="bg-white rounded-2xl border border-[#ded5c5] shadow-xs overflow-hidden">
            {/* Map Action Bar */}
            <div className="p-3 sm:p-4 border-b border-[#ded5c5] flex flex-wrap items-center justify-between gap-2.5 bg-[#fdfbf7]">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                  className="hidden lg:flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold bg-white border border-[#ded5c5] text-[#4a3b32] rounded-xl hover:bg-[#f5ede2] transition shadow-xs"
                >
                  {isSidebarCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
                  <span>{isSidebarCollapsed ? 'Show Regions List' : 'Collapse List'}</span>
                </button>

                <div className="flex items-center gap-1 bg-white p-0.5 rounded-xl border border-[#ded5c5]">
                  <button
                    onClick={() => setShowCctvLayer(!showCctvLayer)}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg transition flex items-center gap-1 ${
                      showCctvLayer ? 'bg-[#964b28] text-white' : 'text-gray-500 hover:bg-gray-100'
                    }`}
                  >
                    <span>📹</span>
                    <span className="hidden sm:inline">CCTV</span>
                  </button>
                  <button
                    onClick={() => setShowCitizenLayer(!showCitizenLayer)}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg transition flex items-center gap-1 ${
                      showCitizenLayer ? 'bg-[#964b28] text-white' : 'text-gray-500 hover:bg-gray-100'
                    }`}
                  >
                    <span>👤</span>
                    <span className="hidden sm:inline">Citizens</span>
                  </button>
                </div>
              </div>

              {/* Map Type Switcher */}
              <div className="flex items-center bg-white rounded-xl border border-[#ded5c5] p-0.5">
                <button
                  onClick={() => setMapType('terrain')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition flex items-center gap-1 ${
                    mapType === 'terrain' ? 'bg-[#964b28] text-white' : 'text-[#594d3b] hover:bg-[#fdfbf7]'
                  }`}
                >
                  <Map className="h-3.5 w-3.5" />
                  <span>Terrain</span>
                </button>
                <button
                  onClick={() => setMapType('satellite')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition flex items-center gap-1 ${
                    mapType === 'satellite' ? 'bg-[#964b28] text-white' : 'text-[#594d3b] hover:bg-[#fdfbf7]'
                  }`}
                >
                  <Satellite className="h-3.5 w-3.5" />
                  <span>Satellite</span>
                </button>
                <button
                  onClick={() => {
                    setMapType('satelliteWithLabels');
                    setShowLabels(true);
                  }}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition flex items-center gap-1 ${
                    mapType === 'satelliteWithLabels' ? 'bg-[#964b28] text-white' : 'text-[#594d3b] hover:bg-[#fdfbf7]'
                  }`}
                >
                  <Layers className="h-3.5 w-3.5" />
                  <span>Hybrid</span>
                </button>
              </div>
            </div>

            {/* Map Canvas */}
            <div className="h-[480px] sm:h-[580px] w-full relative bg-gray-100">
              {isLoading ? (
                <div className="h-full flex items-center justify-center bg-[#fdfbf7]">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#964b28] mx-auto"></div>
                    <p className="mt-3 text-xs font-bold text-[#4a3b32]">Loading GIS Map & Live Detections...</p>
                  </div>
                </div>
              ) : (
                <div className="h-full w-full relative">
                  {!mapLoaded && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/10 backdrop-blur-xs">
                      <div className="text-center bg-white/90 p-3 rounded-xl border border-[#ded5c5] shadow-md">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#964b28] mx-auto"></div>
                        <p className="mt-2 text-xs font-bold text-[#1f1712]">Rendering GIS Layers...</p>
                      </div>
                    </div>
                  )}

                  <MapContainer
                    center={mapCenter}
                    zoom={12}
                    style={{ height: '100%', width: '100%', position: 'absolute', top: 0, left: 0, zIndex: 1 }}
                    zoomControl={true}
                    scrollWheelZoom={true}
                    doubleClickZoom={true}
                    dragging={true}
                    touchZoom={true}
                    whenReady={() => {
                      setTimeout(() => setMapLoaded(true), 300);
                    }}
                  >
                    <LayerGroup>
                      <TileLayer
                        key={`${mapType}-base`}
                        url={TILE_LAYERS[mapType].url}
                        attribution={TILE_LAYERS[mapType].attribution}
                        maxZoom={TILE_LAYERS[mapType].maxZoom}
                        minZoom={TILE_LAYERS[mapType].minZoom}
                      />
                      {(mapType === 'satellite' || mapType === 'satelliteWithLabels') && showLabels && (
                        <TileLayer
                          key={`${mapType}-labels`}
                          url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}"
                          attribution="&copy; Esri"
                          maxZoom={19}
                          minZoom={10}
                          opacity={0.8}
                        />
                      )}
                    </LayerGroup>

                    {mapLoaded && (
                      <GeodesicAreasLayer
                        results={modelResults}
                        citizens={citizens}
                        showCctv={showCctvLayer}
                        showCitizens={showCitizenLayer}
                        selectedTarget={selectedTarget}
                        onSelectTarget={(target) => setSelectedTarget(target)}
                        onDeployStaff={(target) => handleOpenDispatch(target)}
                      />
                    )}
                  </MapContainer>

                  {/* Bottom Peek Card for Currently Focused Incident */}
                  {currentSelectedItem && (
                    <div className="absolute bottom-3 left-3 right-3 sm:left-4 sm:right-auto sm:max-w-sm z-[999] bg-white/95 backdrop-blur-md rounded-2xl border border-[#ded5c5] shadow-xl p-3.5 animate-in slide-in-from-bottom-3 duration-200">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${
                            currentSelectedItem.type === 'cctv' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {currentSelectedItem.type === 'cctv' ? '📹 AI CCTV Hotspot' : '👤 Citizen Report'}
                          </span>
                          <p className="text-xs font-bold text-[#1f1712] mt-1 line-clamp-2">
                            {currentSelectedItem.title}
                          </p>
                        </div>
                        <button
                          onClick={() => setSelectedTarget(null)}
                          className="text-gray-400 hover:text-gray-600 p-0.5"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-[#7a6a58] mt-2 pt-2 border-t border-[#ded5c5]">
                        <span className="font-mono">{currentSelectedItem.latitude.toFixed(4)}°, {currentSelectedItem.longitude.toFixed(4)}°</span>
                        <span className="font-bold uppercase text-[10px] text-orange-700">
                          {currentSelectedItem.status}
                        </span>
                      </div>

                      <div className="mt-2.5 flex items-center gap-2">
                        <button
                          onClick={() => handleOpenDispatch({
                            id: currentSelectedItem.id,
                            type: currentSelectedItem.type,
                            address: currentSelectedItem.title,
                            latitude: currentSelectedItem.latitude,
                            longitude: currentSelectedItem.longitude,
                            confidence_score: currentSelectedItem.confidence,
                            description: currentSelectedItem.description,
                            imageUrl: currentSelectedItem.imageUrl,
                            citizenName: currentSelectedItem.citizenName,
                            currentStatus: currentSelectedItem.status,
                            currentStaffName: currentSelectedItem.assignedStaffName
                          })}
                          className="w-full py-1.5 px-3 bg-[#964b28] hover:bg-[#7e3e1f] text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center justify-center gap-1.5"
                        >
                          <UserCheck className="h-3.5 w-3.5" />
                          <span>Deploy Safai Karmi to this Location</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Map Legend */}
            <div className="p-3.5 sm:p-4 bg-[#fdfbf7] border-t border-[#ded5c5]">
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center space-x-3 flex-wrap gap-y-1">
                  <span className="font-bold text-[#1f1712]">AI CCTV Severity:</span>
                  <div className="flex items-center space-x-1.5">
                    <span className="w-3 h-3 rounded-full bg-red-600 inline-block"></span>
                    <span className="text-[#594d3b]">High (&ge;80%)</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="w-3 h-3 rounded-full bg-orange-500 inline-block"></span>
                    <span className="text-[#594d3b]">Med-High (60-80%)</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="w-3 h-3 rounded-full bg-amber-400 inline-block"></span>
                    <span className="text-[#594d3b]">Medium (40-60%)</span>
                  </div>
                </div>

                <div className="flex items-center space-x-3 flex-wrap gap-y-1">
                  <span className="font-bold text-[#1f1712]">Citizen Reports:</span>
                  <div className="flex items-center space-x-1.5">
                    <span className="w-3 h-3 rounded-full bg-blue-600 inline-block"></span>
                    <span className="text-[#594d3b]">Pending</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="w-3 h-3 rounded-full bg-orange-600 inline-block"></span>
                    <span className="text-[#594d3b]">In Progress</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="w-3 h-3 rounded-full bg-emerald-600 inline-block"></span>
                    <span className="text-[#594d3b]">Resolved</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Safai Karmi Dispatch Modal */}
      <SafaiDispatchModal
        isOpen={isDispatchModalOpen}
        onClose={() => setIsDispatchModalOpen(false)}
        target={dispatchTarget}
        onSuccess={handleDispatchSuccess}
      />

      {/* Citizen Photo Lightbox Modal */}
      {lightboxPhoto && (
        <div 
          onClick={() => setLightboxPhoto(null)}
          className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div 
            onClick={(e) => e.stopPropagation()} 
            className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl border border-[#ded5c5]"
          >
            <div className="p-3 bg-[#fdfbf7] border-b border-[#ded5c5] flex items-center justify-between">
              <span className="text-xs font-bold text-[#1f1712] truncate flex items-center gap-1.5">
                <Camera className="h-4 w-4 text-[#964b28]" />
                {lightboxPhoto.caption}
              </span>
              <button
                onClick={() => setLightboxPhoto(null)}
                className="p-1 rounded-lg text-gray-500 hover:bg-gray-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-2 max-h-[70vh] flex items-center justify-center bg-black">
              <img
                src={lightboxPhoto.url}
                alt="Citizen Evidence"
                className="max-h-[65vh] w-auto object-contain rounded"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
