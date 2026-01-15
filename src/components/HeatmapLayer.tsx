'use client';

import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { HeatmapPoint, HeatmapConfig } from '@/types/heatmap';

// Install leaflet.heat plugin
import 'leaflet.heat';

interface HeatmapLayerProps extends HeatmapConfig {
  points: HeatmapPoint[];
}

export default function HeatmapLayer({ 
  points, 
  radius = 20, 
  max = 100, 
  minOpacity = 0.3, 
  blur = 15,
  gradient 
}: HeatmapLayerProps) {
  const map = useMap();
  const heatmapLayerRef = useRef<L.Layer | null>(null);

  useEffect(() => {
    if (!map || !points.length) return;

    // Remove existing heatmap layer if it exists
    if (heatmapLayerRef.current) {
      map.removeLayer(heatmapLayerRef.current);
    }

    try {
      // Convert points to the format expected by leaflet.heat
      const heatmapPoints = points.map(point => [
        point.lat,
        point.lng,
        point.intensity / max // Normalize intensity
      ]);

      // Create heatmap layer
      const heatmapLayer = (L as unknown as { 
        heatLayer: (points: number[][], options: {
          radius: number;
          max: number;
          minOpacity: number;
          blur: number;
          gradient?: Record<number, string>;
        }) => L.Layer 
      }).heatLayer(heatmapPoints, {
        radius,
        max,
        minOpacity,
        blur,
        gradient
      });

      // Store reference
      heatmapLayerRef.current = heatmapLayer;

      // Add to map
      heatmapLayer.addTo(map);

      // Fit map to show all points if there are points
      if (points.length > 0) {
        const group = L.featureGroup();
        points.forEach(point => {
          group.addLayer(L.marker([point.lat, point.lng]));
        });
        map.fitBounds(group.getBounds().pad(0.1));
      }

    } catch (error) {
      console.error('Error creating heatmap layer:', error);
    }

    // Cleanup function
    return () => {
      if (heatmapLayerRef.current) {
        map.removeLayer(heatmapLayerRef.current);
        heatmapLayerRef.current = null;
      }
    };
  }, [map, points, radius, max, minOpacity, blur, gradient]);

  return null;
}
