'use client';

import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { ModelResult } from '@/types/garbage-detection';

interface GeodesicAreasLayerProps {
  results: ModelResult[];
}

export default function GeodesicAreasLayer({ results }: GeodesicAreasLayerProps) {
  const map = useMap();
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  // Function to get color based on confidence score
  const getColorByConfidence = (confidence: number): string => {
    if (confidence >= 0.8) return '#dc2626'; // red - high confidence
    if (confidence >= 0.6) return '#ea580c'; // orange - medium-high confidence
    if (confidence >= 0.4) return '#f59e0b'; // amber - medium confidence
    if (confidence >= 0.2) return '#84cc16'; // lime - low confidence
    return '#16a34a'; // green - very low confidence
  };

  // Function to calculate radius based on accuracy (100-200 meters)
  const getRadiusFromAccuracy = (accuracy: number | string): number => {
    let radius = 150; // default radius
    
    if (typeof accuracy === 'string') {
      // Extract number from string like "±78 meters" or "78m"
      const match = accuracy.match(/(\d+)/);
      if (match) {
        radius = parseInt(match[1]);
      }
    } else if (typeof accuracy === 'number') {
      radius = accuracy;
    }
    
    // Ensure radius is within 100-200m range
    radius = Math.max(100, Math.min(200, radius));
    
    return radius;
  };

  // Function to format timestamp to human-readable format
  const formatTimestamp = (timestamp: string): string => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch {
      return 'Unknown Date';
    }
  };

  useEffect(() => {
    if (!map || !results.length) return;

    // Remove existing layer group if it exists
    if (layerGroupRef.current) {
      map.removeLayer(layerGroupRef.current);
    }

    // Create new layer group
    const layerGroup = L.layerGroup();
    layerGroupRef.current = layerGroup;

    // Add circles for each result
    results.forEach((result) => {
      const { latitude, longitude, confidence_score, accuracy, address, timestamp } = result;
      
      // Skip invalid coordinates
      if (!latitude || !longitude || latitude === 0 || longitude === 0) {
        return;
      }

      const radius = getRadiusFromAccuracy(accuracy);
      const color = getColorByConfidence(confidence_score);
      
      // Create circle
      const circle = L.circle([latitude, longitude], {
        radius: radius,
        color: color,
        weight: 2,
        opacity: 0.8,
        fillColor: color,
        fillOpacity: 0.3
      });

      // Create tooltip content with improved formatting
      const tooltipContent = `
        <div class="p-3 min-w-[180px]">
          <div class="font-semibold text-sm mb-2 text-gray-800">🗑️ Garbage Detection</div>
          <div class="space-y-1 text-xs">
            <div class="flex justify-between">
              <span class="text-gray-600">Confidence:</span>
              <span class="font-medium text-gray-800">${(confidence_score * 100).toFixed(1)}%</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">Accuracy:</span>
              <span class="font-medium text-gray-800">${typeof accuracy === 'string' ? accuracy : `±${accuracy}m`}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">Created:</span>
              <span class="font-medium text-gray-800 text-xs">${formatTimestamp(timestamp)}</span>
            </div>
            <div class="mt-2 pt-2 border-t border-gray-200">
              <span class="text-gray-600 text-xs">📍 ${address}</span>
            </div>
          </div>
        </div>
      `;

      // Add tooltip
      circle.bindTooltip(tooltipContent, {
        permanent: false,
        direction: 'top',
        offset: [0, -10],
        className: 'custom-tooltip'
      });

      // Add popup with more details
      const popupContent = `
        <div class="p-4 min-w-[250px]">
          <div class="font-semibold text-lg mb-3 text-gray-800">🗑️ Garbage Detection Details</div>
          <div class="space-y-3 text-sm">
            <div class="flex justify-between items-center">
              <span class="text-gray-600">Confidence Score:</span>
              <span class="font-medium text-lg ${confidence_score >= 0.8 ? 'text-red-600' : confidence_score >= 0.6 ? 'text-orange-600' : confidence_score >= 0.4 ? 'text-amber-600' : confidence_score >= 0.2 ? 'text-lime-600' : 'text-green-600'}">${(confidence_score * 100).toFixed(1)}%</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">GPS Accuracy:</span>
              <span class="font-medium">${typeof accuracy === 'string' ? accuracy : `±${accuracy}m`}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">Detection Radius:</span>
              <span class="font-medium">${radius}m</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">Created At:</span>
              <span class="font-medium text-xs">${formatTimestamp(timestamp)}</span>
            </div>
            <div class="mt-3 pt-3 border-t border-gray-200">
              <span class="text-gray-600 block mb-2">📍 Address:</span>
              <span class="text-sm bg-gray-100 p-2 rounded block">${address}</span>
            </div>
            <div class="mt-2">
              <span class="text-gray-600 block mb-1">🌐 Coordinates:</span>
              <span class="text-xs text-gray-500 font-mono">${latitude.toFixed(6)}, ${longitude.toFixed(6)}</span>
            </div>
          </div>
        </div>
      `;

      circle.bindPopup(popupContent);

      // Add to layer group
      layerGroup.addLayer(circle);
    });

    // Add layer group to map
    layerGroup.addTo(map);

    // Fit map to show all points if there are results
    if (results.length > 0) {
      const validResults = results.filter(r => r.latitude && r.longitude && r.latitude !== 0 && r.longitude !== 0);
      if (validResults.length > 0) {
        const group = L.featureGroup();
        validResults.forEach(result => {
          group.addLayer(L.marker([result.latitude, result.longitude]));
        });
        map.fitBounds(group.getBounds().pad(0.1));
      }
    }

    // Cleanup function
    return () => {
      if (layerGroupRef.current) {
        map.removeLayer(layerGroupRef.current);
        layerGroupRef.current = null;
      }
    };
  }, [map, results]);

  return null;
}
