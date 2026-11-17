'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Waypoint, MissionType } from '@/types/drone';
import { MapPin, Navigation, Layers, ZoomIn, ZoomOut, Search, Crosshair, RefreshCw, X } from 'lucide-react';

interface MapViewportProps {
  missionType: MissionType;
  boundaryCoords: [number, number][]; // [lat, lng]
  onUpdateBoundaryCoords: (coords: [number, number][]) => void;
  waypoints: Waypoint[];
  onSelectWaypoint?: (wp: Waypoint) => void;
  orbitCenter?: [number, number];
  onUpdateOrbitCenter?: (center: [number, number]) => void;
  orbitRadius?: number;
}

export default function MapViewport({
  missionType,
  boundaryCoords,
  onUpdateBoundaryCoords,
  waypoints,
  onSelectWaypoint,
  orbitCenter,
  onUpdateOrbitCenter,
  orbitRadius = 30,
}: MapViewportProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const LRef = useRef<any>(null);

  // Layers and Markers
  const baseLayersRef = useRef<{ [key: string]: any }>({});
  const activeTileLayerRef = useRef<any>(null);
  const boundaryLayerRef = useRef<any>(null);
  const flightPathLayerRef = useRef<any>(null);
  const markersLayerRef = useRef<any>(null);
  const userLocationLayerRef = useRef<any>(null);

  const [activeLayerName, setActiveLayerName] = useState('googleHybrid');
  const [showLayerMenu, setShowLayerMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);

  // Initialize Leaflet map
  useEffect(() => {
    let isMounted = true;

    async function initMap() {
      if (typeof window === 'undefined' || !mapContainerRef.current) return;
      if (mapInstanceRef.current) return;

      const L = await import('leaflet');
      LRef.current = L;

      // Default center: Indonesia (-6.9932, 110.4203 - Semarang / Central Java)
      const map = L.map(mapContainerRef.current, {
        center: [-6.9932, 110.4203],
        zoom: 16,
        zoomControl: false,
        attributionControl: false,
      });

      // Free Base Layers
      const googleHybrid = L.tileLayer(
        'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
        { maxZoom: 21, subdomains: ['mt0', 'mt1', 'mt2', 'mt3'] }
      );

      const googleSat = L.tileLayer(
        'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
        { maxZoom: 21, subdomains: ['mt0', 'mt1', 'mt2', 'mt3'] }
      );

      const esriSat = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        { maxZoom: 19 }
      );

      const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      });

      const topo = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
        maxZoom: 17,
      });

      baseLayersRef.current = {
        googleHybrid,
        googleSat,
        esriSat,
        osm,
        topo,
      };

      googleHybrid.addTo(map);
      activeTileLayerRef.current = googleHybrid;

      // Layer groups
      boundaryLayerRef.current = L.layerGroup().addTo(map);
      flightPathLayerRef.current = L.layerGroup().addTo(map);
      markersLayerRef.current = L.layerGroup().addTo(map);
      userLocationLayerRef.current = L.layerGroup().addTo(map);

      mapInstanceRef.current = map;

      // Handle map clicks for adding points
      map.on('click', (e: any) => {
        const { lat, lng } = e.latlng;
        handleMapClick(lat, lng);
      });
    }

    initMap();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Map click handler (uses latest props via ref or direct)
  const boundaryCoordsRef = useRef(boundaryCoords);
  boundaryCoordsRef.current = boundaryCoords;
  const missionTypeRef = useRef(missionType);
  missionTypeRef.current = missionType;

  const handleMapClick = (lat: number, lng: number) => {
    const currentType = missionTypeRef.current;
    if (currentType === 'grid' || currentType === 'corridor' || currentType === 'waypoint') {
      const nextCoords = [...boundaryCoordsRef.current, [lat, lng] as [number, number]];
      onUpdateBoundaryCoords(nextCoords);
    } else if (currentType === 'orbit') {
      if (onUpdateOrbitCenter) {
        onUpdateOrbitCenter([lat, lng]);
      }
    }
  };

  // Change active tile layer
  const switchLayer = (layerKey: string) => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (activeTileLayerRef.current) {
      map.removeLayer(activeTileLayerRef.current);
    }

    const selected = baseLayersRef.current[layerKey];
    if (selected) {
      selected.addTo(map);
      activeTileLayerRef.current = selected;
      setActiveLayerName(layerKey);
    }
    setShowLayerMenu(false);
  };

  // Draw Boundary / Corridor / Orbit Center
  useEffect(() => {
    const map = mapInstanceRef.current;
    const L = LRef.current;
    if (!map || !L || !boundaryLayerRef.current) return;

    boundaryLayerRef.current.clearLayers();

    if (missionType === 'grid' && boundaryCoords.length > 0) {
      if (boundaryCoords.length >= 3) {
        const polygon = L.polygon(boundaryCoords, {
          color: '#38bdf8',
          weight: 2,
          fillColor: '#0284c7',
          fillOpacity: 0.25,
          dashArray: '4, 4',
        });
        boundaryLayerRef.current.addLayer(polygon);
      } else {
        const polyline = L.polyline(boundaryCoords, {
          color: '#38bdf8',
          weight: 2,
          dashArray: '4, 4',
        });
        boundaryLayerRef.current.addLayer(polyline);
      }

      // Add vertex handles
      boundaryCoords.forEach((pt, idx) => {
        const vertexIcon = L.divIcon({
          className: 'bg-sky-400 border-2 border-white rounded-full shadow-md',
          iconSize: [12, 12],
          iconAnchor: [6, 6],
        });
        const marker = L.marker(pt, { icon: vertexIcon });
        boundaryLayerRef.current.addLayer(marker);
      });
    } else if (missionType === 'corridor' && boundaryCoords.length > 0) {
      const polyline = L.polyline(boundaryCoords, {
        color: '#f59e0b',
        weight: 3,
        dashArray: '6, 6',
      });
      boundaryLayerRef.current.addLayer(polyline);

      boundaryCoords.forEach((pt) => {
        const marker = L.circleMarker(pt, {
          radius: 5,
          color: '#ffffff',
          weight: 2,
          fillColor: '#f59e0b',
          fillOpacity: 1,
        });
        boundaryLayerRef.current.addLayer(marker);
      });
    } else if (missionType === 'orbit' && orbitCenter) {
      const circle = L.circle(orbitCenter, {
        radius: orbitRadius,
        color: '#f59e0b',
        weight: 2,
        fillColor: '#f59e0b',
        fillOpacity: 0.15,
        dashArray: '5, 5',
      });
      boundaryLayerRef.current.addLayer(circle);

      const poiIcon = L.divIcon({
        className: 'custom-poi-pin',
        html: '★',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });
      const poiMarker = L.marker(orbitCenter, { icon: poiIcon });
      boundaryLayerRef.current.addLayer(poiMarker);
    }
  }, [boundaryCoords, missionType, orbitCenter, orbitRadius]);

  // Render Waypoints & Flight Track
  useEffect(() => {
    const map = mapInstanceRef.current;
    const L = LRef.current;
    if (!map || !L || !flightPathLayerRef.current || !markersLayerRef.current) return;

    flightPathLayerRef.current.clearLayers();
    markersLayerRef.current.clearLayers();

    if (waypoints.length === 0) return;

    const latlngs: [number, number][] = waypoints.map((wp) => [wp.lat, wp.lng]);

    // Vibrant Flight Path Polyline
    const flightPath = L.polyline(latlngs, {
      color: '#00ffcc',
      weight: 2.5,
      opacity: 0.9,
    });
    flightPathLayerRef.current.addLayer(flightPath);

    // Waypoint Markers
    waypoints.forEach((wp, idx) => {
      const isStart = idx === 0;
      const isEnd = idx === waypoints.length - 1;
      const pinClass = isStart ? 'custom-wp-pin start' : isEnd ? 'custom-wp-pin end' : 'custom-wp-pin';

      const icon = L.divIcon({
        className: pinClass,
        html: `<span>${idx + 1}</span>`,
        iconSize: [26, 26],
        iconAnchor: [13, 13],
      });

      const marker = L.marker([wp.lat, wp.lng], { icon });

      // Popup with WP details
      marker.bindPopup(`
        <div style="font-family: sans-serif; font-size: 11px; color: #1e293b;">
          <strong>Waypoint #${idx + 1}</strong><br/>
          Ketinggian: <b>${wp.altitude} m</b><br/>
          Kecepatan: <b>${wp.speed} m/s</b><br/>
          Heading: <b>${wp.heading || 0}°</b><br/>
          Gimbal Pitch: <b>${wp.gimbalPitch ?? -90}°</b>
        </div>
      `);

      marker.on('click', () => {
        if (onSelectWaypoint) onSelectWaypoint(wp);
      });

      markersLayerRef.current.addLayer(marker);
    });
  }, [waypoints, onSelectWaypoint]);

  // Geolocation (Lokasi Saya - GPS)
  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      alert('Browser Anda tidak mendukung Geolocation GPS');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        const { latitude, longitude, accuracy } = position.coords;
        const map = mapInstanceRef.current;
        const L = LRef.current;
        if (!map || !L) return;

        map.setView([latitude, longitude], 17);

        if (userLocationLayerRef.current) {
          userLocationLayerRef.current.clearLayers();

          // Accuracy circle
          const circle = L.circle([latitude, longitude], {
            radius: Math.min(accuracy, 100),
            color: '#38bdf8',
            fillColor: '#38bdf8',
            fillOpacity: 0.15,
            weight: 1,
          });
          userLocationLayerRef.current.addLayer(circle);

          // User Pin
          const userIcon = L.divIcon({
            className: 'w-4 h-4 bg-sky-500 border-2 border-white rounded-full shadow-lg pulse',
            iconSize: [16, 16],
            iconAnchor: [8, 8],
          });
          const marker = L.marker([latitude, longitude], { icon: userIcon });
          marker.bindPopup('<b>Lokasi Anda Saat Ini</b>').openPopup();
          userLocationLayerRef.current.addLayer(marker);
        }
      },
      (err) => {
        setLocating(false);
        alert('Gagal mengambil lokasi GPS: ' + err.message);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Zoom to fit bounds of mission
  const handleFitBounds = () => {
    const map = mapInstanceRef.current;
    const L = LRef.current;
    if (!map || !L) return;

    if (waypoints.length > 0) {
      const bounds = L.latLngBounds(waypoints.map((wp) => [wp.lat, wp.lng]));
      map.fitBounds(bounds, { padding: [50, 50] });
    } else if (boundaryCoords.length > 0) {
      const bounds = L.latLngBounds(boundaryCoords);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  };

  // Search Address / Place using OpenStreetMap Nominatim
  const handleSearchLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        searchQuery
      )}&limit=1`;
      const res = await fetch(url);
      const results = await res.json();
      if (results && results.length > 0) {
        const { lat, lon } = results[0];
        const map = mapInstanceRef.current;
        if (map) {
          map.setView([parseFloat(lat), parseFloat(lon)], 16);
        }
      } else {
        alert('Lokasi tidak ditemukan');
      }
    } catch (err: any) {
      alert('Gagal mencari lokasi: ' + err.message);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="relative w-full h-full flex-1">
      {/* Map Container Element */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Top Search Bar Overlay */}
      <div className="absolute top-3 left-3 right-3 sm:right-auto sm:w-80 z-20">
        <form onSubmit={handleSearchLocation} className="relative shadow-xl">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari lokasi (contoh: Semarang, Kebun Sawit)..."
            className="w-full bg-slate-900/90 backdrop-blur border border-slate-700/80 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-sky-500 shadow-lg"
          />
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </form>
      </div>

      {/* Floating Map Controls (Right Side) */}
      <div className="absolute top-3 right-3 z-20 flex flex-col gap-2">
        {/* Layer Switcher Button */}
        <div className="relative">
          <button
            onClick={() => setShowLayerMenu(!showLayerMenu)}
            className="w-9 h-9 bg-slate-900/90 backdrop-blur hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-xl shadow-xl flex items-center justify-center transition cursor-pointer"
            title="Ganti Jenis Peta Satelit"
          >
            <Layers className="w-4 h-4 text-sky-400" />
          </button>

          {showLayerMenu && (
            <div className="absolute right-0 mt-1 w-48 bg-slate-900/95 backdrop-blur border border-slate-700 rounded-xl shadow-2xl p-2 space-y-1 text-xs">
              <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-2 py-1">
                Pilihan Peta Gratis
              </div>
              <button
                onClick={() => switchLayer('googleHybrid')}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg transition ${
                  activeLayerName === 'googleHybrid'
                    ? 'bg-sky-500 text-white font-semibold'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                Google Satelit Hybrid
              </button>
              <button
                onClick={() => switchLayer('googleSat')}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg transition ${
                  activeLayerName === 'googleSat'
                    ? 'bg-sky-500 text-white font-semibold'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                Google Satelit Polos
              </button>
              <button
                onClick={() => switchLayer('esriSat')}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg transition ${
                  activeLayerName === 'esriSat'
                    ? 'bg-sky-500 text-white font-semibold'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                Esri World Imagery
              </button>
              <button
                onClick={() => switchLayer('osm')}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg transition ${
                  activeLayerName === 'osm'
                    ? 'bg-sky-500 text-white font-semibold'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                OpenStreetMap (Jalan)
              </button>
              <button
                onClick={() => switchLayer('topo')}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg transition ${
                  activeLayerName === 'topo'
                    ? 'bg-sky-500 text-white font-semibold'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                OpenTopoMap (Topografi)
              </button>
            </div>
          )}
        </div>

        {/* Zoom In */}
        <button
          onClick={() => mapInstanceRef.current?.zoomIn()}
          className="w-9 h-9 bg-slate-900/90 backdrop-blur hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-xl shadow-xl flex items-center justify-center transition cursor-pointer"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>

        {/* Zoom Out */}
        <button
          onClick={() => mapInstanceRef.current?.zoomOut()}
          className="w-9 h-9 bg-slate-900/90 backdrop-blur hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-xl shadow-xl flex items-center justify-center transition cursor-pointer"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>

        {/* Fit Bounds */}
        <button
          onClick={handleFitBounds}
          className="w-9 h-9 bg-slate-900/90 backdrop-blur hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-xl shadow-xl flex items-center justify-center transition cursor-pointer"
          title="Fokus ke Jalur Misi"
        >
          <Crosshair className="w-4 h-4 text-emerald-400" />
        </button>
      </div>

      {/* Floating Geolocation GPS Button (Bottom Left) */}
      <div className="absolute bottom-20 lg:bottom-6 left-3 z-20">
        <button
          onClick={handleLocateMe}
          disabled={locating}
          className="flex items-center gap-2 bg-slate-900/95 backdrop-blur hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-xl px-3 py-2 shadow-2xl transition cursor-pointer font-medium text-xs group"
          title="Zoom ke Posisi Pilot Drone Saat Ini"
        >
          <Navigation
            className={`w-4 h-4 text-sky-400 group-hover:rotate-45 transition ${
              locating ? 'animate-spin' : ''
            }`}
          />
          <span>{locating ? 'Mencari GPS...' : 'Lokasi Saya'}</span>
        </button>
      </div>

      {/* Helper Instruction Banner */}
      <div className="absolute top-14 left-3 right-3 sm:left-auto sm:right-16 z-10 pointer-events-none">
        <div className="bg-slate-900/80 backdrop-blur border border-slate-700/60 text-slate-300 text-[11px] px-3 py-1.5 rounded-lg shadow-lg inline-flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-sky-400" />
          {missionType === 'grid' && (
            <span>
              {boundaryCoords.length < 3
                ? `Sentuh peta minimal 3 titik untuk membuat area poligon (${boundaryCoords.length}/3)`
                : 'Area poligon siap. Atur ketinggian & sudut jalur di panel.'}
            </span>
          )}
          {missionType === 'corridor' && (
            <span>Sentuh peta untuk membuat jalur garis koridor (jalan / sungai / kabel).</span>
          )}
          {missionType === 'waypoint' && (
            <span>Sentuh peta untuk menambahkan titik-titik waypoint bebas.</span>
          )}
          {missionType === 'orbit' && (
            <span>Sentuh peta di pusat bangunan/objek untuk menetapkan titik POI orbit.</span>
          )}
        </div>
      </div>
    </div>
  );
}
