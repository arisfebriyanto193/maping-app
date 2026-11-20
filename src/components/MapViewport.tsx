'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Waypoint, MissionType, GeoTiffData } from '@/types/drone';
import { Layers, ZoomIn, ZoomOut, Search, Crosshair, Navigation, Undo2, Redo2, Trash2, X, FileUp, Eye, EyeOff } from 'lucide-react';
import { parseKmlOrKmz } from '@/lib/kml-parser';
import { loadGeoTiffOnMap } from '@/lib/geotiff-loader';

interface MapViewportProps {
  missionType: MissionType;
  boundaryCoords: [number, number][]; // [lat, lng]
  onAddPoint: (point: [number, number]) => void;
  onUpdateBoundaryCoords: (coords: [number, number][]) => void;
  onDeletePointIndex: (index: number) => void;
  waypoints: Waypoint[];
  onSelectWaypoint?: (wp: Waypoint) => void;
  orbitCenter?: [number, number];
  onUpdateOrbitCenter?: (center: [number, number]) => void;
  orbitRadius?: number;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  geotiffData?: GeoTiffData | null;
  onGeoTiffLoaded?: (data: GeoTiffData) => void;
  onRemoveGeoTiff?: () => void;
}

export default function MapViewport({
  missionType,
  boundaryCoords,
  onAddPoint,
  onUpdateBoundaryCoords,
  onDeletePointIndex,
  waypoints,
  onSelectWaypoint,
  orbitCenter,
  onUpdateOrbitCenter,
  orbitRadius = 30,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  geotiffData,
  onGeoTiffLoaded,
  onRemoveGeoTiff,
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
  const geotiffLayerRef = useRef<any>(null);

  const [activeLayerName, setActiveLayerName] = useState('googleHybrid');
  const [showLayerMenu, setShowLayerMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [uploadingKml, setUploadingKml] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // GeoTIFF state & refs
  const tifFileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingTif, setUploadingTif] = useState(false);
  const [geotiffOpacity, setGeotiffOpacity] = useState(0.85);
  const [showGeotiffLayer, setShowGeotiffLayer] = useState(true);

  const handleTifImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingTif(true);
      const map = mapInstanceRef.current;
      if (!map) throw new Error('Peta belum siap');

      if (geotiffLayerRef.current) {
        map.removeLayer(geotiffLayerRef.current);
        geotiffLayerRef.current = null;
      }

      // Render directly on map
      const result = await loadGeoTiffOnMap(map, file, { opacity: geotiffOpacity, fitBounds: true });
      geotiffLayerRef.current = result.layer;

      // Upload to server so project can be saved and shared with link
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/maping/api/upload/geotiff', {
        method: 'POST',
        body: formData,
      });

      const resData = await res.json();
      if (res.ok && resData.success) {
        if (onGeoTiffLoaded) {
          onGeoTiffLoaded({
            url: resData.data.url,
            filename: file.name,
            size: file.size,
            opacity: geotiffOpacity,
          });
        }
        alert(`Berhasil memuat dan mengupload GeoTIFF: ${file.name}`);
      } else {
        if (onGeoTiffLoaded) {
          onGeoTiffLoaded({
            url: '',
            filename: file.name,
            size: file.size,
            opacity: geotiffOpacity,
          });
        }
        alert(`Peta GeoTIFF ditampilkan di layar.`);
      }
    } catch (err: any) {
      console.error(err);
      alert('Gagal memproses file GeoTIFF: ' + err.message);
    } finally {
      setUploadingTif(false);
      if (tifFileInputRef.current) tifFileInputRef.current.value = '';
    }
  };

  // Load saved GeoTIFF when geotiffData.url is provided (e.g. opened project)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (!geotiffData?.url) {
      if (geotiffLayerRef.current) {
        map.removeLayer(geotiffLayerRef.current);
        geotiffLayerRef.current = null;
      }
      return;
    }

    let isCancelled = false;

    async function loadSavedTif() {
      try {
        if (geotiffLayerRef.current) {
          map.removeLayer(geotiffLayerRef.current);
          geotiffLayerRef.current = null;
        }
        const result = await loadGeoTiffOnMap(map, geotiffData!.url, {
          opacity: geotiffOpacity,
          fitBounds: boundaryCoords.length === 0 && waypoints.length === 0,
        });
        if (!isCancelled) {
          geotiffLayerRef.current = result.layer;
        }
      } catch (err) {
        console.error('Failed to load saved GeoTIFF:', err);
      }
    }

    loadSavedTif();

    return () => {
      isCancelled = true;
    };
  }, [geotiffData?.url]);

  // Update GeoTIFF opacity & visibility
  useEffect(() => {
    if (geotiffLayerRef.current && typeof geotiffLayerRef.current.setOpacity === 'function') {
      geotiffLayerRef.current.setOpacity(showGeotiffLayer ? geotiffOpacity : 0);
    }
  }, [geotiffOpacity, showGeotiffLayer]);

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingKml(true);
      const coords = await parseKmlOrKmz(file);
      if (!coords || coords.length === 0) {
        alert('Tidak ditemukan koordinat pada file tersebut.');
        return;
      }

      onUpdateBoundaryCoords(coords);

      // Fit map bounds to the imported coordinates
      const map = mapInstanceRef.current;
      const L = LRef.current;
      if (map && L && coords.length > 0) {
        const bounds = L.latLngBounds(coords.map((c) => [c[0], c[1]]));
        map.fitBounds(bounds, { padding: [50, 50] });
      }

      alert(`Berhasil mengimpor batas area (${coords.length} titik) dari file: ${file.name}`);
    } catch (err: any) {
      alert(err.message || 'Gagal membaca file KML/KMZ Google Earth.');
    } finally {
      setUploadingKml(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Keyboard shortcut listener for Ctrl+Z and Ctrl+Y
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          if (canRedo) onRedo();
        } else {
          e.preventDefault();
          if (canUndo) onUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y')) {
        e.preventDefault();
        if (canRedo) onRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canUndo, canRedo, onUndo, onRedo]);

  // Keep latest callbacks in ref
  const onAddPointRef = useRef(onAddPoint);
  onAddPointRef.current = onAddPoint;
  const onUpdateOrbitCenterRef = useRef(onUpdateOrbitCenter);
  onUpdateOrbitCenterRef.current = onUpdateOrbitCenter;
  const missionTypeRef = useRef(missionType);
  missionTypeRef.current = missionType;

  // Initialize Leaflet map
  useEffect(() => {
    let isMounted = true;

    async function initMap() {
      if (typeof window === 'undefined' || !mapContainerRef.current) return;
      if (mapInstanceRef.current) return;

      const L = await import('leaflet');
      LRef.current = L;

      // Default center: Indonesia (-6.9932, 110.4203)
      const map = L.map(mapContainerRef.current, {
        center: [-6.9932, 110.4203],
        zoom: 16,
        zoomControl: false,
        attributionControl: false,
      });

      // Free Base Layers (Satellite & Map)
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

      // Handle map clicks
      map.on('click', (e: any) => {
        const { lat, lng } = e.latlng;
        const currentType = missionTypeRef.current;
        if (currentType === 'grid' || currentType === 'corridor' || currentType === 'waypoint') {
          onAddPointRef.current([lat, lng]);
        } else if (currentType === 'orbit') {
          if (onUpdateOrbitCenterRef.current) {
            onUpdateOrbitCenterRef.current([lat, lng]);
          }
        }
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

  // Switch Tile Layer
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

  // Draw Boundary / Polygon Vertices with Drag & Delete capabilities
  useEffect(() => {
    const map = mapInstanceRef.current;
    const L = LRef.current;
    if (!map || !L || !boundaryLayerRef.current) return;

    boundaryLayerRef.current.clearLayers();

    if (missionType === 'grid' && boundaryCoords.length > 0) {
      if (boundaryCoords.length >= 3) {
        const polygon = L.polygon(boundaryCoords, {
          color: '#0284c7', // Sky-600
          weight: 2.5,
          fillColor: '#38bdf8',
          fillOpacity: 0.25,
          dashArray: '5, 5',
        });
        boundaryLayerRef.current.addLayer(polygon);
      } else {
        const polyline = L.polyline(boundaryCoords, {
          color: '#0284c7',
          weight: 2.5,
          dashArray: '5, 5',
        });
        boundaryLayerRef.current.addLayer(polyline);
      }

      // Add vertex handles with Drag & Delete
      boundaryCoords.forEach((pt, idx) => {
        const vertexIcon = L.divIcon({
          className: 'custom-vertex-pin',
          html: `<div style="width: 14px; height: 14px; background: #0284c7; border: 2.5px solid #ffffff; border-radius: 50%; box-shadow: 0 2px 5px rgba(0,0,0,0.4); cursor: pointer;"></div>`,
          iconSize: [14, 14],
          iconAnchor: [7, 7],
        });

        const marker = L.marker(pt, { icon: vertexIcon, draggable: true });

        // On Drag End: update boundary coords
        marker.on('dragend', (e: any) => {
          const newPos = e.target.getLatLng();
          const next = [...boundaryCoords];
          next[idx] = [newPos.lat, newPos.lng];
          onUpdateBoundaryCoords(next);
        });

        // Popup with delete option
        const popupContent = document.createElement('div');
        popupContent.style.cssText = 'padding: 4px; font-family: sans-serif; font-size: 12px; text-align: center;';
        popupContent.innerHTML = `
          <strong style="color: #0f172a;">Titik Sudut #${idx + 1}</strong>
          <p style="font-size: 10px; color: #64748b; margin: 3px 0 6px 0;">Tarik untuk ubah posisi</p>
          <button id="del-btn-${idx}" style="background: #fee2e2; color: #dc2626; border: 1px solid #fca5a5; border-radius: 6px; padding: 3px 8px; font-size: 10px; font-weight: bold; cursor: pointer; width: 100%;">
            🗑 Hapus Titik Ini
          </button>
        `;

        marker.bindPopup(popupContent);
        marker.on('popupopen', () => {
          const btn = document.getElementById(`del-btn-${idx}`);
          if (btn) {
            btn.onclick = () => {
              marker.closePopup();
              onDeletePointIndex(idx);
            };
          }
        });

        boundaryLayerRef.current.addLayer(marker);
      });
    } else if (missionType === 'corridor' && boundaryCoords.length > 0) {
      const polyline = L.polyline(boundaryCoords, {
        color: '#f59e0b',
        weight: 3.5,
        dashArray: '6, 6',
      });
      boundaryLayerRef.current.addLayer(polyline);

      boundaryCoords.forEach((pt, idx) => {
        const marker = L.circleMarker(pt, {
          radius: 6,
          color: '#ffffff',
          weight: 2,
          fillColor: '#f59e0b',
          fillOpacity: 1,
        });
        marker.bindPopup(`
          <div style="font-family: sans-serif; font-size: 11px; text-align: center;">
            <b>Garis Koridor #${idx + 1}</b><br/>
            <button onclick="window.__delPt(${idx})" style="color: #dc2626; font-size: 10px; margin-top: 4px; cursor: pointer;">Hapus Titik</button>
          </div>
        `);
        boundaryLayerRef.current.addLayer(marker);
      });
      (window as any).__delPt = (index: number) => onDeletePointIndex(index);
    } else if (missionType === 'orbit' && orbitCenter) {
      const circle = L.circle(orbitCenter, {
        radius: orbitRadius,
        color: '#f59e0b',
        weight: 2.5,
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
  }, [boundaryCoords, missionType, orbitCenter, orbitRadius, onUpdateBoundaryCoords, onDeletePointIndex]);

  // Render Waypoints & Flight Track
  useEffect(() => {
    const map = mapInstanceRef.current;
    const L = LRef.current;
    if (!map || !L || !flightPathLayerRef.current || !markersLayerRef.current) return;

    flightPathLayerRef.current.clearLayers();
    markersLayerRef.current.clearLayers();

    if (waypoints.length === 0) return;

    const latlngs: [number, number][] = waypoints.map((wp) => [wp.lat, wp.lng]);

    // High Visibility Flight Path
    const flightPath = L.polyline(latlngs, {
      color: '#0284c7', // Sky Blue
      weight: 3,
      opacity: 0.95,
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
        <div style="font-family: sans-serif; font-size: 11px; color: #0f172a; line-height: 1.4;">
          <div style="font-weight: 800; font-size: 12px; margin-bottom: 3px; color: ${isStart ? '#16a34a' : isEnd ? '#dc2626' : '#2563eb'};">
            ${isStart ? '🛫 Titik Awal (Start)' : isEnd ? '🛬 Titik Akhir (End)' : `Waypoint #${idx + 1}`}
          </div>
          Ketinggian: <b>${wp.altitude} m</b><br/>
          Kecepatan: <b>${wp.speed} m/s</b><br/>
          Heading: <b>${wp.heading || 0}°</b><br/>
          Sudut Kamera: <b>${wp.gimbalPitch ?? -90}°</b>
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
      alert('Browser Anda tidak mendukung GPS Geolocation');
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

          const circle = L.circle([latitude, longitude], {
            radius: Math.min(accuracy, 100),
            color: '#0284c7',
            fillColor: '#0284c7',
            fillOpacity: 0.15,
            weight: 1.5,
          });
          userLocationLayerRef.current.addLayer(circle);

          const userIcon = L.divIcon({
            className: 'w-4 h-4 bg-sky-600 border-2 border-white rounded-full shadow-lg',
            iconSize: [16, 16],
            iconAnchor: [8, 8],
          });
          const marker = L.marker([latitude, longitude], { icon: userIcon });
          marker.bindPopup('<b style="color: #0f172a;">Lokasi Pilot Saat Ini</b>').openPopup();
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

  // Search Address / Place
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

      {/* Top Search Bar (Light Theme) */}
      <div className="absolute top-3 left-3 right-3 sm:right-auto sm:w-80 z-20">
        <form onSubmit={handleSearchLocation} className="relative shadow-md">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari lokasi / kota / lahan..."
            className="w-full bg-white/95 backdrop-blur border border-slate-200 rounded-xl pl-9 pr-8 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 font-medium shadow-xs"
          />
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </form>
      </div>

      {/* Floating Undo / Redo & Drawing Tools (Left Side under Search) */}
      <div className="absolute top-14 left-3 z-20 flex items-center gap-1.5 bg-white/95 backdrop-blur border border-slate-200 rounded-xl p-1 shadow-md">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
            canUndo
              ? 'bg-sky-50 text-sky-700 hover:bg-sky-100 shadow-2xs'
              : 'text-slate-300 cursor-not-allowed'
          }`}
          title="Batal Titik Terakhir (Ctrl+Z)"
        >
          <Undo2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Undo</span>
        </button>

        <button
          onClick={onRedo}
          disabled={!canRedo}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
            canRedo
              ? 'bg-sky-50 text-sky-700 hover:bg-sky-100 shadow-2xs'
              : 'text-slate-300 cursor-not-allowed'
          }`}
          title="Ulangi Titik (Ctrl+Y)"
        >
          <Redo2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Redo</span>
        </button>

        {boundaryCoords.length > 0 && (
          <span className="text-[10px] text-slate-500 font-bold px-2 py-0.5 bg-slate-100 rounded-md">
            {boundaryCoords.length} Titik
          </span>
        )}

        <div className="h-4 w-px bg-slate-200 mx-0.5" />

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileImport}
          accept=".kml,.kmz,.geojson,.json"
          className="hidden"
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadingKml}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer bg-emerald-50 text-emerald-700 hover:bg-emerald-100 shadow-2xs border border-emerald-200/60"
          title="Upload Batas Poligon Google Earth (.kml / .kmz)"
        >
          <FileUp className="w-3.5 h-3.5 text-emerald-600" />
          <span>{uploadingKml ? 'Memuat...' : 'Import KML/KMZ'}</span>
        </button>

        <div className="h-4 w-px bg-slate-200 mx-0.5" />

        {/* GeoTIFF Map (.tif) Upload */}
        <input
          type="file"
          ref={tifFileInputRef}
          onChange={handleTifImport}
          accept=".tif,.tiff"
          className="hidden"
        />

        <button
          onClick={() => tifFileInputRef.current?.click()}
          disabled={uploadingTif}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer bg-sky-50 text-sky-700 hover:bg-sky-100 shadow-2xs border border-sky-200/60"
          title="Upload Peta Ortofoto GeoTIFF (.tif / .tiff)"
        >
          <Layers className="w-3.5 h-3.5 text-sky-600" />
          <span>{uploadingTif ? 'Memproses TIF...' : 'Peta GeoTIFF (.tif)'}</span>
        </button>
      </div>

      {/* Floating GeoTIFF Active Control Card */}
      {geotiffData && (
        <div className="absolute top-26 left-3 z-20 bg-white/95 backdrop-blur-md border border-slate-200 shadow-lg rounded-2xl p-2.5 text-xs text-slate-800 space-y-2 max-w-xs animate-in fade-in">
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-1.5">
            <div className="flex items-center gap-1.5 min-w-0 font-bold text-slate-900 text-[11px]">
              <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse shrink-0" />
              <span className="truncate">{geotiffData.filename}</span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setShowGeotiffLayer(!showGeotiffLayer)}
                className="text-slate-400 hover:text-slate-700 p-0.5 rounded transition cursor-pointer"
                title={showGeotiffLayer ? 'Sembunyikan GeoTIFF' : 'Tampilkan GeoTIFF'}
              >
                {showGeotiffLayer ? <Eye className="w-3.5 h-3.5 text-emerald-600" /> : <EyeOff className="w-3.5 h-3.5 text-slate-400" />}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (geotiffLayerRef.current && mapInstanceRef.current) {
                    mapInstanceRef.current.removeLayer(geotiffLayerRef.current);
                    geotiffLayerRef.current = null;
                  }
                  if (onRemoveGeoTiff) onRemoveGeoTiff();
                }}
                className="text-slate-400 hover:text-red-600 p-0.5 rounded transition cursor-pointer"
                title="Hapus Layer GeoTIFF"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {showGeotiffLayer && (
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-slate-500 font-medium">
                <span>Transparansi:</span>
                <span className="font-bold text-slate-800">{Math.round(geotiffOpacity * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.05"
                value={geotiffOpacity}
                onChange={(e) => setGeotiffOpacity(parseFloat(e.target.value))}
                className="w-full accent-sky-600 cursor-pointer h-1.5 bg-slate-200 rounded appearance-none"
              />
            </div>
          )}
        </div>
      )}

      {/* Floating Map Controls (Right Side) */}
      <div className="absolute top-3 right-3 z-20 flex flex-col gap-2">
        {/* Layer Switcher */}
        <div className="relative">
          <button
            onClick={() => setShowLayerMenu(!showLayerMenu)}
            className="w-9 h-9 bg-white/95 backdrop-blur hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl shadow-md flex items-center justify-center transition cursor-pointer"
            title="Ganti Jenis Peta Satelit"
          >
            <Layers className="w-4 h-4 text-sky-600" />
          </button>

          {showLayerMenu && (
            <div className="absolute right-0 mt-1 w-48 bg-white border border-slate-200 rounded-xl shadow-xl p-1.5 space-y-1 text-xs">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">
                Peta Satelit Gratis
              </div>
              <button
                onClick={() => switchLayer('googleHybrid')}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg font-semibold transition ${
                  activeLayerName === 'googleHybrid'
                    ? 'bg-sky-600 text-white'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                Google Satelit Hybrid
              </button>
              <button
                onClick={() => switchLayer('googleSat')}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg font-semibold transition ${
                  activeLayerName === 'googleSat'
                    ? 'bg-sky-600 text-white'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                Google Satelit Polos
              </button>
              <button
                onClick={() => switchLayer('esriSat')}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg font-semibold transition ${
                  activeLayerName === 'esriSat'
                    ? 'bg-sky-600 text-white'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                Esri World Imagery
              </button>
              <button
                onClick={() => switchLayer('osm')}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg font-semibold transition ${
                  activeLayerName === 'osm'
                    ? 'bg-sky-600 text-white'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                OpenStreetMap (Jalan)
              </button>
              <button
                onClick={() => switchLayer('topo')}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg font-semibold transition ${
                  activeLayerName === 'topo'
                    ? 'bg-sky-600 text-white'
                    : 'text-slate-700 hover:bg-slate-100'
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
          className="w-9 h-9 bg-white/95 backdrop-blur hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl shadow-md flex items-center justify-center transition cursor-pointer"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>

        {/* Zoom Out */}
        <button
          onClick={() => mapInstanceRef.current?.zoomOut()}
          className="w-9 h-9 bg-white/95 backdrop-blur hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl shadow-md flex items-center justify-center transition cursor-pointer"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>

        {/* Fit Bounds */}
        <button
          onClick={handleFitBounds}
          className="w-9 h-9 bg-white/95 backdrop-blur hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl shadow-md flex items-center justify-center transition cursor-pointer"
          title="Fokus ke Jalur Misi"
        >
          <Crosshair className="w-4 h-4 text-emerald-600" />
        </button>
      </div>

      {/* Geolocation GPS (Bottom Left) */}
      <div className="absolute bottom-20 lg:bottom-6 left-3 z-20">
        <button
          onClick={handleLocateMe}
          disabled={locating}
          className="flex items-center gap-1.5 bg-white/95 backdrop-blur hover:bg-slate-50 text-slate-800 border border-slate-200 rounded-xl px-3 py-2 shadow-lg transition cursor-pointer font-bold text-xs group"
          title="Zoom ke Posisi Pilot Drone Saat Ini"
        >
          <Navigation
            className={`w-4 h-4 text-sky-600 group-hover:rotate-45 transition ${
              locating ? 'animate-spin' : ''
            }`}
          />
          <span>{locating ? 'Mencari...' : 'Lokasi Saya'}</span>
        </button>
      </div>
    </div>
  );
}
