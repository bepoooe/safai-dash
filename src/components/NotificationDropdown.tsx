'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Bell, 
  UserCheck, 
  MapPin, 
  Camera, 
  ExternalLink, 
  Clock, 
  CheckCheck, 
  ChevronRight, 
  Radio, 
  Sparkles,
  X
} from 'lucide-react';
import Link from 'next/link';
import { FirebaseService } from '@/services/firebaseService';

export interface AppNotification {
  id: string;
  type: 'dispatch' | 'cctv' | 'citizen';
  title: string;
  subtitle: string;
  address: string;
  timestamp: string;
  status?: string;
  score?: number;
  linkUrl: string;
  linkLabel: string;
}

export default function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'dispatch' | 'cctv' | 'citizen'>('all');
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load notifications
  const fetchLatestNotifications = async () => {
    try {
      setLoading(true);
      const [modelRes, citizenList] = await Promise.all([
        FirebaseService.fetchModelResults().catch(() => ({ results: [], totalCount: 0, averageConfidence: 0, lastUpdated: '' })),
        FirebaseService.fetchCitizens().catch(() => [])
      ]);

      const items: AppNotification[] = [];

      // 1. Dispatches & CCTV Detections
      modelRes.results.forEach((item) => {
        // If dispatched
        if (item.workStatus === 'in_progress' || item.workStatus === 'completed') {
          items.push({
            id: `dispatch-${item.id}`,
            type: 'dispatch',
            title: 'Safai Karmi Deployed',
            subtitle: item.workStatus === 'completed' ? 'Cleanup work verified & completed' : 'Safai Karmi active on-site',
            address: item.address,
            timestamp: item.assignedAt || item.timestamp,
            status: item.workStatus,
            score: item.confidence_score,
            linkUrl: '/dashboard/staff',
            linkLabel: 'View Workforce'
          });
        }

        // CCTV Detection Alert
        items.push({
          id: `cctv-${item.id}`,
          type: 'cctv',
          title: item.confidence_score >= 0.6 ? 'High Garbage Overflow Detected' : 'Garbage Hotspot Detected',
          subtitle: `AI Model CCTV stream (${(item.confidence_score * 100).toFixed(0)}% confidence)`,
          address: item.address,
          timestamp: item.timestamp,
          status: item.status,
          score: item.confidence_score,
          linkUrl: '/dashboard/heatmap',
          linkLabel: 'View Heatmap'
        });
      });

      // 2. Citizen Reports & Dispatches
      citizenList.forEach((citizen) => {
        if (citizen.assignedStaffName) {
          items.push({
            id: `citizen-dispatch-${citizen.id}`,
            type: 'dispatch',
            title: `Karmi Assigned: ${citizen.assignedStaffName}`,
            subtitle: `Assigned to citizen report by ${citizen.name}`,
            address: citizen.location?.address || 'Kolkata',
            timestamp: citizen.assignedAt || citizen.timestamp.toISOString(),
            status: citizen.status,
            linkUrl: '/dashboard/citizens',
            linkLabel: 'View Citizen Reports'
          });
        }

        items.push({
          id: `citizen-${citizen.id}`,
          type: 'citizen',
          title: 'Citizen Report Submitted',
          subtitle: `Reported by ${citizen.name} · ${citizen.description.slice(0, 45)}...`,
          address: citizen.location?.address || 'Kolkata Metropolitan Area',
          timestamp: citizen.timestamp.toISOString(),
          status: citizen.status,
          linkUrl: '/dashboard/citizens',
          linkLabel: 'View Citizen Reports'
        });
      });

      // Sort newest first
      items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
      // Limit to 30 items
      setNotifications(items.slice(0, 30));
    } catch (err) {
      console.error('Error loading notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLatestNotifications();
    const interval = setInterval(fetchLatestNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // Close when clicked outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = useMemo(() => {
    return notifications.filter(n => !readIds.has(n.id)).length;
  }, [notifications, readIds]);

  const filteredNotifications = useMemo(() => {
    if (filter === 'all') return notifications;
    return notifications.filter(n => n.type === filter);
  }, [notifications, filter]);

  const markAllAsRead = () => {
    setReadIds(new Set(notifications.map(n => n.id)));
  };

  const markAsRead = (id: string) => {
    setReadIds(prev => new Set(prev).add(id));
  };

  const formatTimeAgo = (timeStr: string) => {
    try {
      const date = new Date(timeStr);
      const diffMs = Date.now() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      return `${diffDays}d ago`;
    } catch {
      return 'Recently';
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative rounded-xl p-2 text-[#6b5c4e] transition hover:bg-[#f5ede2] hover:text-[#241c15] focus:outline-none"
        aria-label="Open notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#964b28] px-1 text-[10px] font-black text-white shadow-xs">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notifications Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-[340px] sm:w-[400px] rounded-2xl border border-[#ded5c5] bg-white shadow-2xl z-[9999] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="bg-[#fdfbf7] p-3.5 border-b border-[#ded5c5] flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#964b28] text-white">
                <Radio className="h-4 w-4 animate-pulse" />
              </span>
              <div>
                <h3 className="text-xs sm:text-sm font-black text-[#1f1712] uppercase tracking-wider">
                  Live Operations Feed
                </h3>
                <p className="text-[10px] text-[#7a6a58]">
                  {unreadCount} unread alert{unreadCount !== 1 ? 's' : ''}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-[11px] font-bold text-[#964b28] hover:text-[#7e3e1f] flex items-center gap-1"
                  title="Mark all as read"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Mark read</span>
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center p-2 gap-1 border-b border-[#ded5c5] bg-[#faf6f0] overflow-x-auto">
            <button
              onClick={() => setFilter('all')}
              className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition shrink-0 ${
                filter === 'all' ? 'bg-[#964b28] text-white shadow-2xs' : 'text-[#594d3b] hover:bg-white'
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              onClick={() => setFilter('dispatch')}
              className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition shrink-0 flex items-center gap-1 ${
                filter === 'dispatch' ? 'bg-[#964b28] text-white shadow-2xs' : 'text-[#594d3b] hover:bg-white'
              }`}
            >
              <span>🚀</span> Dispatches
            </button>
            <button
              onClick={() => setFilter('cctv')}
              className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition shrink-0 flex items-center gap-1 ${
                filter === 'cctv' ? 'bg-[#964b28] text-white shadow-2xs' : 'text-[#594d3b] hover:bg-white'
              }`}
            >
              <span>📹</span> CCTV Alerts
            </button>
            <button
              onClick={() => setFilter('citizen')}
              className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition shrink-0 flex items-center gap-1 ${
                filter === 'citizen' ? 'bg-[#964b28] text-white shadow-2xs' : 'text-[#594d3b] hover:bg-white'
              }`}
            >
              <span>👤</span> Citizens
            </button>
          </div>

          {/* Notifications Scroll List */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-[#f0e8dc]">
            {loading && notifications.length === 0 ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#964b28] mx-auto"></div>
                <p className="text-xs text-gray-500 mt-2 font-medium">Fetching real-time updates...</p>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500 space-y-1">
                <Sparkles className="h-6 w-6 text-gray-400 mx-auto mb-1" />
                <p className="text-xs font-bold text-gray-700">No operational alerts</p>
                <p className="text-[11px] text-gray-500">All garbage detections and dispatches are clear.</p>
              </div>
            ) : (
              filteredNotifications.map((notif) => {
                const isRead = readIds.has(notif.id);

                return (
                  <div
                    key={notif.id}
                    onClick={() => markAsRead(notif.id)}
                    className={`p-3 transition-colors hover:bg-[#fdfbf7] flex items-start space-x-3 cursor-pointer ${
                      !isRead ? 'bg-[#fbf7f0]' : 'bg-white'
                    }`}
                  >
                    {/* Icon */}
                    <div className="mt-0.5 flex-shrink-0">
                      {notif.type === 'dispatch' ? (
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-100 text-orange-700 border border-orange-200">
                          <UserCheck className="h-4 w-4" />
                        </div>
                      ) : notif.type === 'cctv' ? (
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-100 text-red-700 border border-red-200">
                          <Camera className="h-4 w-4" />
                        </div>
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-100 text-blue-700 border border-blue-200">
                          <MapPin className="h-4 w-4" />
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-1">
                        <p className={`text-xs font-black truncate leading-tight ${
                          !isRead ? 'text-[#1f1712]' : 'text-[#4a3b32]'
                        }`}>
                          {notif.title}
                        </p>
                        <span className="text-[10px] text-[#7a6a58] flex items-center gap-0.5 shrink-0">
                          <Clock className="h-2.5 w-2.5" />
                          {formatTimeAgo(notif.timestamp)}
                        </span>
                      </div>

                      <p className="text-[11px] text-[#6b5c4e] line-clamp-1">
                        {notif.subtitle}
                      </p>

                      <div className="flex items-center justify-between pt-0.5">
                        <span className="text-[10px] font-medium text-[#7a6a58] truncate max-w-[180px] flex items-center gap-1">
                          <MapPin className="h-2.5 w-2.5 text-gray-400 shrink-0" />
                          {notif.address}
                        </span>

                        <Link
                          href={notif.linkUrl}
                          onClick={() => setIsOpen(false)}
                          className="inline-flex items-center gap-0.5 text-[10px] font-bold text-[#964b28] hover:text-[#7e3e1f] hover:underline"
                        >
                          <span>{notif.linkLabel}</span>
                          <ChevronRight className="h-3 w-3" />
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="bg-[#fdfbf7] p-2.5 border-t border-[#ded5c5] flex items-center justify-between text-[11px]">
            <Link
              href="/dashboard/heatmap"
              onClick={() => setIsOpen(false)}
              className="text-[#964b28] font-bold hover:underline flex items-center gap-1"
            >
              <span>Live Heatmap</span>
              <ExternalLink className="h-3 w-3" />
            </Link>
            <Link
              href="/dashboard/citizens"
              onClick={() => setIsOpen(false)}
              className="text-[#594d3b] font-bold hover:underline"
            >
              Citizen Reports
            </Link>
            <Link
              href="/dashboard/staff"
              onClick={() => setIsOpen(false)}
              className="text-[#594d3b] font-bold hover:underline"
            >
              Workforce
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

