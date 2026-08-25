'use client';

import { useState, useEffect } from 'react';
import { X, UserCheck, Phone, MapPin, Star, AlertCircle, CheckCircle, Send, Search, Sparkles } from 'lucide-react';
import { SafaiKarmi } from '@/types/staff';
import { FirebaseService } from '@/services/firebaseService';
import { simpleWhatsAppService } from '@/services/simpleWhatsAppService';

export interface DispatchTarget {
  id: string;
  type: 'cctv' | 'citizen';
  address: string;
  latitude: number;
  longitude: number;
  area?: string;
  confidence_score?: number;
  description?: string;
  imageUrl?: string;
  citizenName?: string;
  currentStatus?: string;
  currentStaffName?: string;
}

interface SafaiDispatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  target: DispatchTarget | null;
  onSuccess: (targetId: string, targetType: 'cctv' | 'citizen', staff: SafaiKarmi) => void;
}

export default function SafaiDispatchModal({
  isOpen,
  onClose,
  target,
  onSuccess
}: SafaiDispatchModalProps) {
  const [staffList, setStaffList] = useState<SafaiKarmi[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(true);
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sendWhatsApp, setSendWhatsApp] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const loadStaff = async () => {
      try {
        setLoadingStaff(true);
        setError(null);
        const data = await FirebaseService.fetchStaff();
        // Default to active staff
        const activeOnly = data.filter(s => s.status === 'Active');
        setStaffList(activeOnly.length > 0 ? activeOnly : data);
        
        // Auto-select best matching staff by area if available
        if (target?.address || target?.area) {
          const targetAreaStr = (target.area || target.address).toLowerCase();
          const match = activeOnly.find(s => 
            s.workingArea && targetAreaStr.includes(s.workingArea.toLowerCase())
          );
          if (match) {
            setSelectedStaffId(match.id);
          } else if (activeOnly.length > 0) {
            setSelectedStaffId(activeOnly[0].id);
          }
        } else if (activeOnly.length > 0) {
          setSelectedStaffId(activeOnly[0].id);
        }
      } catch (err) {
        console.error('Failed to load staff for dispatch modal:', err);
        setError('Failed to fetch Safai Karmi workforce.');
      } finally {
        setLoadingStaff(false);
      }
    };

    loadStaff();
  }, [isOpen, target]);

  if (!isOpen || !target) return null;

  const filteredStaff = staffList.filter(s => {
    const term = searchTerm.toLowerCase();
    return s.name.toLowerCase().includes(term) ||
           s.workingArea.toLowerCase().includes(term) ||
           s.phone.includes(term);
  });

  const selectedStaff = staffList.find(s => s.id === selectedStaffId);

  const handleDispatch = async () => {
    if (!selectedStaff) {
      setError('Please select a Safai Karmi to dispatch.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      if (target.type === 'cctv') {
        await FirebaseService.dispatchStaffToDetection(target.id, selectedStaff.id, selectedStaff.name);
      } else {
        await FirebaseService.dispatchStaffToCitizenReport(target.id, selectedStaff.id, selectedStaff.name);
      }

      // If WhatsApp notification option is selected, trigger message
      if (sendWhatsApp) {
        try {
          const workData = {
            detectionId: target.id,
            address: target.address,
            latitude: target.latitude,
            longitude: target.longitude,
            confidenceScore: target.confidence_score || 0.8,
            assignedAt: new Date().toISOString(),
            status: 'pending' as const
          };
          await simpleWhatsAppService.sendWorkAssignmentNotification(selectedStaff, workData);
        } catch (e) {
          console.warn('WhatsApp alert trigger skipped or completed:', e);
        }
      }

      onSuccess(target.id, target.type, selectedStaff);
      onClose();
    } catch (err) {
      console.error('Error executing dispatch:', err);
      setError('Failed to complete worker deployment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-[#ded5c5] w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#8a4220] to-[#ba7861] px-5 py-4 text-white flex items-center justify-between flex-shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-white/15 rounded-xl">
              <UserCheck className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold leading-tight">Deploy Safai Karmi</h2>
              <p className="text-xs text-amber-100">
                {target.type === 'cctv' ? 'AI CCTV Garbage Hotspot' : 'Citizen Garbage Report'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* Target Summary Card */}
          <div className="bg-[#fdfbf7] border border-[#ded5c5] rounded-xl p-3.5 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <span className="inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#ded8c4] text-[#4a3b32] mb-1">
                  Target Location
                </span>
                <p className="text-xs sm:text-sm font-semibold text-[#1f1712] line-clamp-2">
                  {target.address}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <span className="text-[11px] font-mono font-medium text-[#7a6a58]">
                  {target.latitude.toFixed(4)}°, {target.longitude.toFixed(4)}°
                </span>
              </div>
            </div>

            {target.description && (
              <p className="text-xs text-[#594d3b] bg-white/80 p-2 rounded-lg border border-[#e8e0d2] italic">
                &ldquo;{target.description}&rdquo;
              </p>
            )}

            {target.currentStaffName && (
              <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                <span>Currently assigned to: <strong>{target.currentStaffName}</strong></span>
              </div>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-xl flex items-center gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Workforce Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#1f1712] uppercase tracking-wider">
                Select Field Worker ({staffList.length} Active)
              </label>
              {target.area && (
                <span className="text-[11px] text-[#964b28] font-medium flex items-center gap-1">
                  <Sparkles className="h-3 w-3" /> Area: {target.area}
                </span>
              )}
            </div>

            {/* Search worker */}
            <div className="relative">
              <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search worker by name or ward..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#fdfbf7] border border-[#ded5c5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#964b28]"
              />
            </div>

            {/* Worker List */}
            {loadingStaff ? (
              <div className="py-6 text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#964b28] mx-auto"></div>
                <p className="text-xs text-gray-500 mt-2">Loading active Safai Karmis...</p>
              </div>
            ) : filteredStaff.length === 0 ? (
              <div className="py-4 text-center text-xs text-gray-500 bg-gray-50 rounded-xl">
                No matching Safai Karmis found.
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {filteredStaff.map((staff) => {
                  const isSelected = selectedStaffId === staff.id;
                  const isAreaMatch = target.area && staff.workingArea.toLowerCase().includes(target.area.toLowerCase());

                  return (
                    <div
                      key={staff.id}
                      onClick={() => setSelectedStaffId(staff.id)}
                      className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between gap-2 ${
                        isSelected
                          ? 'border-[#964b28] bg-[#f9f1ea] shadow-xs'
                          : 'border-[#ded5c5] bg-white hover:bg-[#fdfbf7]'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                          isSelected ? 'bg-[#964b28] text-white' : 'bg-[#ded8c4] text-[#4a3b32]'
                        }`}>
                          {staff.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-bold text-[#1f1712] truncate">{staff.name}</p>
                            {isAreaMatch && (
                              <span className="text-[9px] font-bold bg-[#ded8c4] text-[#594d3b] px-1.5 py-0.2 rounded">
                                Ward Match
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-[#7a6a58]">
                            <span className="flex items-center gap-0.5 truncate">
                              <MapPin className="h-3 w-3 flex-shrink-0" />
                              {staff.workingArea}
                            </span>
                            <span className="flex items-center gap-0.5 flex-shrink-0">
                              <Phone className="h-3 w-3" />
                              {staff.phone}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <div className="flex items-center gap-0.5 justify-end text-amber-600 font-bold text-xs">
                          <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                          <span>{staff.rating || 5.0}</span>
                        </div>
                        <span className="text-[10px] text-gray-500">
                          {staff.totalCollections || 0} tasks
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* WhatsApp Alert Checkbox */}
          <div className="pt-2 border-t border-[#ded5c5]">
            <label className="flex items-center space-x-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={sendWhatsApp}
                onChange={(e) => setSendWhatsApp(e.target.checked)}
                className="rounded border-[#ded5c5] text-[#964b28] focus:ring-[#964b28] h-4 w-4"
              />
              <span className="text-xs font-medium text-[#4a3b32] flex items-center gap-1">
                <Send className="h-3 w-3 text-green-600" />
                Notify worker via WhatsApp with task coordinates & details
              </span>
            </label>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-[#fdfbf7] px-5 py-3.5 border-t border-[#ded5c5] flex items-center justify-end space-x-2.5 flex-shrink-0">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-bold text-[#4a3b32] bg-white border border-[#ded5c5] rounded-xl hover:bg-[#f5ede2] transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleDispatch}
            disabled={isSubmitting || !selectedStaffId}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#964b28] hover:bg-[#7e3e1f] rounded-xl shadow-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white"></div>
                <span>Deploying...</span>
              </>
            ) : (
              <>
                <CheckCircle className="h-3.5 w-3.5" />
                <span>Confirm & Dispatch</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

