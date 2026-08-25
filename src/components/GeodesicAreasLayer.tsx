'use client';

import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { ModelResult } from '@/types/garbage-detection';
import { Citizen } from '@/types/citizen';
import { DispatchTarget } from './SafaiDispatchModal';

interface GeodesicAreasLayerProps {
  results: ModelResult[];
  citizens?: Citizen[];
  showCctv?: boolean;
  showCitizens?: boolean;
  selectedTarget?: { id: string; type: 'cctv' | 'citizen'; lat: number; lng: number } | null;
  onSelectTarget?: (target: { id: string; type: 'cctv' | 'citizen'; lat: number; lng: number }) => void;
  onDeployStaff?: (target: DispatchTarget) => void;
}

export default function GeodesicAreasLayer({
  results,
  citizens = [],
  showCctv = true,
  showCitizens = true,
  selectedTarget,
  onSelectTarget,
  onDeployStaff
}: GeodesicAreasLayerProps) {
  const map = useMap();
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const isFirstRender = useRef(true);

  // Helper for confidence color
  const getColorByConfidence = (confidence: number): string => {
    if (confidence >= 0.8) return '#dc2626'; // High overflow - Red
    if (confidence >= 0.6) return '#ea580c'; // Med-High - Orange
    if (confidence >= 0.4) return '#f59e0b'; // Medium - Amber
    if (confidence >= 0.2) return '#84cc16'; // Low - Lime
    return '#16a34a'; // Clean - Green
  };

  const getRadiusFromAccuracy = (accuracy: number | string): number => {
    let radius = 150;
    if (typeof accuracy === 'string') {
      const match = accuracy.match(/(\d+)/);
      if (match) radius = parseInt(match[1]);
    } else if (typeof accuracy === 'number') {
      radius = accuracy;
    }
    return Math.max(80, Math.min(220, radius));
  };

  const formatTimestamp = (timestamp: string | Date): string => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Recent';
    }
  };

  // Fly to selected target when updated
  useEffect(() => {
    if (!map || !selectedTarget) return;
    if (selectedTarget.lat && selectedTarget.lng) {
      map.flyTo([selectedTarget.lat, selectedTarget.lng], 16, {
        duration: 1.2
      });
    }
  }, [map, selectedTarget]);

  useEffect(() => {
    if (!map) return;

    // Remove existing layer group
    if (layerGroupRef.current) {
      map.removeLayer(layerGroupRef.current);
    }

    const layerGroup = L.layerGroup();
    layerGroupRef.current = layerGroup;

    const allMarkers: L.Marker[] = [];

    // ================= 1. AI CCTV DETECTIONS =================
    if (showCctv && results.length > 0) {
      results.forEach((result) => {
        const { id, latitude, longitude, confidence_score, accuracy, address, timestamp, workStatus } = result;
        if (!latitude || !longitude || (latitude === 0 && longitude === 0)) return;

        const isSelected = selectedTarget?.id === id && selectedTarget?.type === 'cctv';
        const radius = getRadiusFromAccuracy(accuracy);
        const color = getColorByConfidence(confidence_score);

        // Accuracy Circle
        const circle = L.circle([latitude, longitude], {
          radius: radius,
          color: color,
          weight: isSelected ? 3 : 1.5,
          opacity: isSelected ? 0.95 : 0.75,
          fillColor: color,
          fillOpacity: isSelected ? 0.4 : 0.22
        });

        // CCTV Div Icon Marker
        const cctvIcon = L.divIcon({
          className: 'cctv-marker-icon',
          html: `
            <div style="
              width: ${isSelected ? '36px' : '30px'};
              height: ${isSelected ? '36px' : '30px'};
              background: ${color};
              color: white;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              border: ${isSelected ? '3px solid #fff' : '2px solid #fff'};
              box-shadow: 0 4px 10px rgba(0,0,0,0.35);
              font-size: ${isSelected ? '15px' : '13px'};
              cursor: pointer;
              transition: transform 0.2s;
            ">
              📹
            </div>
          `,
          iconSize: [isSelected ? 36 : 30, isSelected ? 36 : 30],
          iconAnchor: [isSelected ? 18 : 15, isSelected ? 18 : 15]
        });

        const marker = L.marker([latitude, longitude], { icon: cctvIcon });
        allMarkers.push(marker);

        // Build Popup DOM Element
        const popupDiv = document.createElement('div');
        popupDiv.className = 'p-3 min-w-[220px] max-w-[260px] text-gray-900 font-sans';
        popupDiv.innerHTML = `
          <div class="flex items-center justify-between gap-1 mb-2 pb-1.5 border-b border-gray-200">
            <span class="inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-[#964b28]">
              📹 AI CCTV Detection
            </span>
            <span class="text-[10px] px-2 py-0.5 rounded-full font-bold" style="background: ${color}20; color: ${color};">
              ${(confidence_score * 100).toFixed(0)}% Conf
            </span>
          </div>

          <div class="space-y-1.5 text-xs">
            <p class="font-bold text-gray-900 leading-snug">${address}</p>
            <div class="flex justify-between text-[11px] text-gray-500">
              <span>GPS Accuracy:</span>
              <span class="font-medium text-gray-700">${typeof accuracy === 'string' ? accuracy : `±${accuracy}m`}</span>
            </div>
            <div class="flex justify-between text-[11px] text-gray-500">
              <span>Detected:</span>
              <span class="font-medium text-gray-700">${formatTimestamp(timestamp)}</span>
            </div>
            <div class="flex justify-between text-[11px] text-gray-500">
              <span>Dispatch Status:</span>
              <span class="font-bold capitalize ${workStatus === 'in_progress' ? 'text-orange-600' : workStatus === 'completed' ? 'text-green-600' : 'text-amber-600'}">
                ${workStatus || 'Pending'}
              </span>
            </div>
          </div>

          <button
            class="deploy-btn mt-3 w-full inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-[#964b28] hover:bg-[#7e3e1f] text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
          >
            <span>👷 Deploy Safai Karmi</span>
          </button>
        `;

        const deployBtn = popupDiv.querySelector('.deploy-btn');
        if (deployBtn && onDeployStaff) {
          deployBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            onDeployStaff({
              id,
              type: 'cctv',
              address,
              latitude,
              longitude,
              confidence_score,
              currentStatus: workStatus
            });
          });
        }

        marker.bindPopup(popupDiv);
        circle.bindPopup(popupDiv);

        marker.on('click', () => {
          if (onSelectTarget) {
            onSelectTarget({ id, type: 'cctv', lat: latitude, lng: longitude });
          }
        });

        circle.on('click', () => {
          if (onSelectTarget) {
            onSelectTarget({ id, type: 'cctv', lat: latitude, lng: longitude });
          }
        });

        layerGroup.addLayer(circle);
        layerGroup.addLayer(marker);
      });
    }

    // ================= 2. CITIZEN REPORTS =================
    if (showCitizens && citizens.length > 0) {
      citizens.forEach((citizen) => {
        const { id, name, location, timestamp, status, description, imageUrl, assignedStaffName } = citizen;
        const lat = location?.latitude;
        const lng = location?.longitude;
        if (!lat || !lng || (lat === 0 && lng === 0)) return;

        const isSelected = selectedTarget?.id === id && selectedTarget?.type === 'citizen';
        const statusColor = status === 'resolved' ? '#16a34a' : status === 'in_progress' ? '#ea580c' : '#2563eb';
        const address = location.address || 'Kolkata Metropolitan Area';

        // Citizen Div Icon Marker
        const citizenIcon = L.divIcon({
          className: 'citizen-marker-icon',
          html: `
            <div style="
              width: ${isSelected ? '36px' : '30px'};
              height: ${isSelected ? '36px' : '30px'};
              background: ${statusColor};
              color: white;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              border: ${isSelected ? '3px solid #fff' : '2px solid #fff'};
              box-shadow: 0 4px 10px rgba(0,0,0,0.35);
              font-size: ${isSelected ? '15px' : '13px'};
              cursor: pointer;
              transition: transform 0.2s;
            ">
              👤
            </div>
          `,
          iconSize: [isSelected ? 36 : 30, isSelected ? 36 : 30],
          iconAnchor: [isSelected ? 18 : 15, isSelected ? 18 : 15]
        });

        const marker = L.marker([lat, lng], { icon: citizenIcon });
        allMarkers.push(marker);

        // Build Popup DOM Element
        const popupDiv = document.createElement('div');
        popupDiv.className = 'p-3 min-w-[220px] max-w-[260px] text-gray-900 font-sans';
        popupDiv.innerHTML = `
          <div class="flex items-center justify-between gap-1 mb-2 pb-1.5 border-b border-gray-200">
            <span class="inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-blue-700">
              👤 Citizen Report
            </span>
            <span class="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase" style="background: ${statusColor}20; color: ${statusColor};">
              ${status}
            </span>
          </div>

          <div class="space-y-1.5 text-xs">
            <div class="flex items-center justify-between">
              <span class="font-bold text-gray-900">${name}</span>
              <span class="text-[10px] text-gray-500">${formatTimestamp(timestamp)}</span>
            </div>
            
            <p class="font-medium text-gray-800 text-[11px] leading-snug">${address}</p>

            ${description ? `
              <p class="text-[11px] text-gray-600 bg-gray-50 p-1.5 rounded border border-gray-200 italic line-clamp-2">
                &ldquo;${description}&rdquo;
              </p>
            ` : ''}

            ${imageUrl ? `
              <div class="mt-1 rounded overflow-hidden max-h-24 bg-gray-100 border border-gray-200">
                <img src="${imageUrl}" alt="Report" class="w-full h-full object-cover" />
              </div>
            ` : ''}

            ${assignedStaffName ? `
              <div class="text-[10px] text-emerald-700 bg-emerald-50 p-1 rounded font-medium">
                Assigned: ${assignedStaffName}
              </div>
            ` : ''}
          </div>

          <button
            class="deploy-btn mt-3 w-full inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-[#964b28] hover:bg-[#7e3e1f] text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
          >
            <span>👷 Deploy Safai Karmi</span>
          </button>
        `;

        const deployBtn = popupDiv.querySelector('.deploy-btn');
        if (deployBtn && onDeployStaff) {
          deployBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            onDeployStaff({
              id,
              type: 'citizen',
              address,
              latitude: lat,
              longitude: lng,
              description,
              imageUrl,
              citizenName: name,
              currentStatus: status,
              currentStaffName: assignedStaffName
            });
          });
        }

        marker.bindPopup(popupDiv);

        marker.on('click', () => {
          if (onSelectTarget) {
            onSelectTarget({ id, type: 'citizen', lat, lng });
          }
        });

        layerGroup.addLayer(marker);
      });
    }

    layerGroup.addTo(map);

    // Initial fit bounds once on first load
    if (isFirstRender.current && allMarkers.length > 0) {
      const group = L.featureGroup(allMarkers);
      map.fitBounds(group.getBounds().pad(0.1));
      isFirstRender.current = false;
    }

    return () => {
      if (layerGroupRef.current) {
        map.removeLayer(layerGroupRef.current);
        layerGroupRef.current = null;
      }
    };
  }, [map, results, citizens, showCctv, showCitizens, selectedTarget, onSelectTarget, onDeployStaff]);

  return null;
}
