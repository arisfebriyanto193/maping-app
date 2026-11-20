'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  Layers,
  ZoomIn,
  ZoomOut,
  Crosshair,
  Share2,
  Download,
  Check,
  Eye,
  EyeOff,
  Plane,
  Clock,
  Compass,
  MapPin,
  Camera,
  ExternalLink,
  MessageCircle,
} from 'lucide-react';
import { DroneMissionRecord, Waypoint } from '@/types/drone';
import { generateDJIWPMLKMZ } from '@/lib/dji-wpml';
import { DRONE_PRESETS } from '@/lib/drone-presets';
import { loadGeoTiffOnMap } from '@/lib/geotiff-loader';

interface ShareMapViewerProps {
  mission: DroneMissionRecord & { creator_username?: string };
}

export default function ShareMapViewer({ mission }: ShareMapViewerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const LRef = useRef<any>(null);

  // Layer references
  const baseLayersRef = useRef<{ [key: string]: any }>({});
  const activeTileLayerRef = useRef<any>(null);
  const boundaryLayerRef = useRef<any>(null);
  const flightPathLayerRef = useRef<any>(null);
  const markersLayerRef = useRef<any>(null);
  const geotiffLayerRef = useRef<any>(null);

  const [activeBaseLayer, setActiveBaseLayer] = useState<'googleHybrid' | 'googleSat' | 'esriSat' | 'osm'>('googleHybrid');
  const [showLayerMenu, setShowLayerMenu] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [downloadingKmz, setDownloadingKmz] = useState(false);

  // Layer visibility & settings
  const [showFlightPath, setShowFlightPath] = useState(true);
  const [showGeoTiff, setShowGeoTiff] = useState(true);
  const [geotiffOpacity, setGeotiffOpacity] = useState(0.85);
  const [geotiffLoading, setGeotiffLoading] = useState(false);
  const [geotiffError, setGeotiffError] = useState<string | null>(null);

  const waypoints: Waypoint[] = Array.isArray(mission.waypoints_json)
    ? mission.waypoints_json
    : [];

  const boundaryCoords: [number, number][] = Array.isArray(mission.boundary_geojson)
    ? mission.boundary_geojson
    : [];

  const stats = mission.stats_json || {
    areaM2: 0,
    areaHectares: 0,
    totalDistanceM: 0,
    flightTimeSeconds: 0,
    photoCount: 0,
    gsdCmPx: 0,
    batteriesRequired: 0,
    batteryRemainingPercent: 100,
  };

  // Initialize Map
  useEffect(() => {
    let isMounted = true;

    async function initMap() {
      if (typeof window === 'undefined' || !mapContainerRef.current) return;
      if (mapInstanceRef.current) return;

      const L = await import('leaflet');
      LRef.current = L;

      // Determine initial center
      let initialCenter: [number, number] = [-6.9932, 110.4203];
      if (waypoints.length > 0) {
        initialCenter = [waypoints[0].lat, waypoints[0].lng];
      } else if (boundaryCoords.length > 0) {
        initialCenter = [boundaryCoords[0][0], boundaryCoords[0][1]];
      }

      const map = L.map(mapContainerRef.current, {
        center: initialCenter,
        zoom: 16,
        zoomControl: false,
        attributionControl: false,
      });

      // Base Layers
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

      baseLayersRef.current = { googleHybrid, googleSat, esriSat, osm };
      googleHybrid.addTo(map);
      activeTileLayerRef.current = googleHybrid;

      boundaryLayerRef.current = L.layerGroup().addTo(map);
      flightPathLayerRef.current = L.layerGroup().addTo(map);
      markersLayerRef.current = L.layerGroup().addTo(map);

      mapInstanceRef.current = map;

      // Render Boundary Polygon
      if (boundaryCoords.length >= 3) {
        const poly = L.polygon(
          boundaryCoords.map((c) => [c[0], c[1]]),
          {
            color: '#0284c7',
            weight: 2,
            fillColor: '#38bdf8',
            fillOpacity: 0.15,
            dashArray: '4, 4',
          }
        );
        boundaryLayerRef.current.addLayer(poly);
      }

      // Render Flight Path Line
      if (waypoints.length > 1) {
        const latlngs = waypoints.map((w) => [w.lat, w.lng]);
        const line = L.polyline(latlngs, {
          color: '#10b981',
          weight: 3,
          opacity: 0.9,
        });
        flightPathLayerRef.current.addLayer(line);
      }

      // Render Waypoint Markers
      waypoints.forEach((wp, idx) => {
        const isStart = idx === 0;
        const isEnd = idx === waypoints.length - 1;
        const color = isStart ? '#10b981' : isEnd ? '#ef4444' : '#0284c7';

        const icon = L.divIcon({
          className: 'custom-wp-pin',
          html: `<div style="
            background-color: ${color};
            color: white;
            font-size: 10px;
            font-weight: 800;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 2px solid white;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          ">${idx + 1}</div>`,
          iconSize: [20, 20],
          iconAnchor: [10, 10],
        });

        const marker = L.marker([wp.lat, wp.lng], { icon });
        marker.bindPopup(`
          <div style="font-family: sans-serif; font-size: 12px; line-height: 1.4;">
            <strong>Waypoint #${idx + 1}</strong><br/>
            Ketinggian: ${wp.altitude} m<br/>
            Kecepatan: ${wp.speed} m/s
          </div>
        `);
        markersLayerRef.current.addLayer(marker);
      });

      // Fit bounds to waypoints or boundary
      const allCoords = [
        ...boundaryCoords.map((c) => [c[0], c[1]]),
        ...waypoints.map((w) => [w.lat, w.lng]),
      ];
      if (allCoords.length > 0) {
        const bounds = L.latLngBounds(allCoords);
        map.fitBounds(bounds, { padding: [60, 60], maxZoom: 18 });
      }

      // Load GeoTIFF if available
      if (mission.geotiff_url) {
        setGeotiffLoading(true);
        setGeotiffError(null);
        try {
          const result = await loadGeoTiffOnMap(map, mission.geotiff_url, {
            opacity: geotiffOpacity,
            fitBounds: waypoints.length === 0, // only auto-fit to tiff if no flight path
          });
          geotiffLayerRef.current = result.layer;
        } catch (err: any) {
          console.error('GeoTIFF load error in viewer:', err);
          setGeotiffError(err.message || 'Gagal memuat peta GeoTIFF');
        } finally {
          setGeotiffLoading(false);
        }
      }
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

  // Update GeoTIFF Opacity
  useEffect(() => {
    if (geotiffLayerRef.current && typeof geotiffLayerRef.current.setOpacity === 'function') {
      geotiffLayerRef.current.setOpacity(showGeoTiff ? geotiffOpacity : 0);
    }
  }, [geotiffOpacity, showGeoTiff]);

  // Update Flight Path Visibility
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (showFlightPath) {
      if (boundaryLayerRef.current && !map.hasLayer(boundaryLayerRef.current)) {
        map.addLayer(boundaryLayerRef.current);
      }
      if (flightPathLayerRef.current && !map.hasLayer(flightPathLayerRef.current)) {
        map.addLayer(flightPathLayerRef.current);
      }
      if (markersLayerRef.current && !map.hasLayer(markersLayerRef.current)) {
        map.addLayer(markersLayerRef.current);
      }
    } else {
      if (boundaryLayerRef.current && map.hasLayer(boundaryLayerRef.current)) {
        map.removeLayer(boundaryLayerRef.current);
      }
      if (flightPathLayerRef.current && map.hasLayer(flightPathLayerRef.current)) {
        map.removeLayer(flightPathLayerRef.current);
      }
      if (markersLayerRef.current && map.hasLayer(markersLayerRef.current)) {
        map.removeLayer(markersLayerRef.current);
      }
    }
  }, [showFlightPath]);

  // Switch Base Layer
  const switchBaseLayer = (layerKey: 'googleHybrid' | 'googleSat' | 'esriSat' | 'osm') => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (activeTileLayerRef.current) {
      map.removeLayer(activeTileLayerRef.current);
    }
    const target = baseLayersRef.current[layerKey];
    if (target) {
      target.addTo(map);
      activeTileLayerRef.current = target;
      setActiveBaseLayer(layerKey);
    }
    setShowLayerMenu(false);
  };

  // Copy Public Link
  const handleCopyLink = () => {
    if (typeof window === 'undefined') return;
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Share to WhatsApp
  const handleShareWhatsApp = () => {
    if (typeof window === 'undefined') return;
    const url = window.location.href;
    const text = `Lihat rute penerbangan drone & peta: *${mission.title}*\n${url}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  // Download KMZ
  const handleDownloadKMZ = async () => {
    if (waypoints.length === 0) {
      alert('Tidak ada waypoint pada misi ini');
      return;
    }

    try {
      setDownloadingKmz(true);
      const drone = DRONE_PRESETS.find((d) => d.name === mission.drone_model) || DRONE_PRESETS[0];

      const blob = await generateDJIWPMLKMZ({
        missionTitle: mission.title,
        drone,
        waypoints,
        globalSpeed: mission.speed || 5,
        securityHeight: 20,
        finishAction: 'goHome',
        rcLostAction: 'goContinue',
        turnMode: 'smooth',
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${mission.title.replace(/\s+/g, '_')}_DJIFly.kmz`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert('Gagal membuat KMZ: ' + err.message);
    } finally {
      setDownloadingKmz(false);
    }
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-900 font-sans">
      {/* Top Navbar Header */}
      <header className="absolute top-0 left-0 right-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-700/80 px-4 py-3 flex items-center justify-between text-white shadow-lg">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center font-black text-sm shadow-md shrink-0">
            🚁
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-extrabold text-white truncate max-w-[200px] sm:max-w-md">
                {mission.title}
              </h1>
              <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-md bg-sky-500/20 text-sky-300 border border-sky-400/30 shrink-0">
                {mission.mission_type}
              </span>
            </div>
            <div className="text-[11px] text-slate-400 flex items-center gap-2">
              <span>Oleh: <strong className="text-slate-200">@{mission.creator_username || 'Pilot'}</strong></span>
              {mission.created_at && (
                <span>• {new Date(mission.created_at).toLocaleDateString('id-ID')}</span>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {/* WhatsApp Share */}
          <button
            onClick={handleShareWhatsApp}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition shadow-md cursor-pointer"
            title="Bagikan ke WhatsApp"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>WhatsApp</span>
          </button>

          {/* Copy Link */}
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 font-bold text-xs transition cursor-pointer"
            title="Salin Link Publik"
          >
            {copiedLink ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Tersalin!</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Salin Link</span>
              </>
            )}
          </button>

          {/* Download KMZ */}
          {waypoints.length > 0 && (
            <button
              onClick={handleDownloadKMZ}
              disabled={downloadingKmz}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-extrabold text-xs transition shadow-md cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{downloadingKmz ? 'Mengunduh...' : 'Unduh KMZ'}</span>
            </button>
          )}
        </div>
      </header>

      {/* Map Container */}
      <div ref={mapContainerRef} className="w-full h-full z-10" />

      {/* Floating Left: Layer & GeoTIFF Controls */}
      <div className="absolute top-20 left-3 z-20 flex flex-col gap-2 max-w-xs pointer-events-none">
        <div className="pointer-events-auto bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-2xl p-3 shadow-xl text-white space-y-3">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block border-b border-slate-700/60 pb-1.5">
            Kontrol Layer Peta
          </span>

          {/* Flight Path Toggle */}
          <label className="flex items-center justify-between gap-3 text-xs font-semibold cursor-pointer select-none">
            <span className="flex items-center gap-1.5 text-slate-200">
              <Plane className="w-3.5 h-3.5 text-emerald-400" /> Rute Terbang ({waypoints.length} WP)
            </span>
            <input
              type="checkbox"
              checked={showFlightPath}
              onChange={(e) => setShowFlightPath(e.target.checked)}
              className="rounded accent-emerald-500 w-4 h-4 cursor-pointer"
            />
          </label>

          {/* GeoTIFF Map Layer Controls */}
          {mission.geotiff_url ? (
            <div className="space-y-2 pt-2 border-t border-slate-700/60">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-sky-400 flex items-center gap-1.5">
                  🗺️ Peta GeoTIFF (.tif)
                </span>
                <button
                  onClick={() => setShowGeoTiff(!showGeoTiff)}
                  className="text-slate-400 hover:text-white p-1"
                  title={showGeoTiff ? 'Sembunyikan Peta' : 'Tampilkan Peta'}
                >
                  {showGeoTiff ? <Eye className="w-4 h-4 text-emerald-400" /> : <EyeOff className="w-4 h-4 text-slate-500" />}
                </button>
              </div>

              {geotiffLoading && (
                <div className="text-[11px] text-amber-400 flex items-center gap-1.5 animate-pulse">
                  <div className="w-2.5 h-2.5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                  <span>Memproses raster GeoTIFF...</span>
                </div>
              )}

              {geotiffError && (
                <div className="text-[10px] text-red-400 bg-red-950/40 p-1.5 rounded-lg border border-red-800">
                  {geotiffError}
                </div>
              )}

              {showGeoTiff && !geotiffLoading && (
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>Transparansi / Opacity:</span>
                    <span className="font-bold text-white">{Math.round(geotiffOpacity * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="1"
                    step="0.05"
                    value={geotiffOpacity}
                    onChange={(e) => setGeotiffOpacity(parseFloat(e.target.value))}
                    className="w-full accent-sky-500 cursor-pointer h-1.5 bg-slate-700 rounded-lg appearance-none"
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="text-[11px] text-slate-500 italic pt-1 border-t border-slate-700/60">
              Tidak ada overlay GeoTIFF untuk proyek ini.
            </div>
          )}
        </div>
      </div>

      {/* Floating Right: Base Layer Switcher */}
      <div className="absolute top-20 right-3 z-20 flex flex-col gap-2">
        <div className="relative">
          <button
            onClick={() => setShowLayerMenu(!showLayerMenu)}
            className="w-10 h-10 bg-slate-900/90 backdrop-blur-md hover:bg-slate-800 text-white border border-slate-700/80 rounded-2xl shadow-xl flex items-center justify-center transition cursor-pointer"
            title="Ganti Jenis Peta Satelit"
          >
            <Layers className="w-5 h-5 text-sky-400" />
          </button>

          {showLayerMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-2xl shadow-2xl p-1.5 space-y-1 text-xs text-white">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">
                Peta Satelit
              </div>
              <button
                onClick={() => switchBaseLayer('googleHybrid')}
                className={`w-full text-left px-2.5 py-1.5 rounded-xl font-semibold transition ${
                  activeBaseLayer === 'googleHybrid' ? 'bg-sky-600 text-white' : 'hover:bg-slate-800 text-slate-300'
                }`}
              >
                Google Hybrid
              </button>
              <button
                onClick={() => switchBaseLayer('googleSat')}
                className={`w-full text-left px-2.5 py-1.5 rounded-xl font-semibold transition ${
                  activeBaseLayer === 'googleSat' ? 'bg-sky-600 text-white' : 'hover:bg-slate-800 text-slate-300'
                }`}
              >
                Google Satellite
              </button>
              <button
                onClick={() => switchBaseLayer('esriSat')}
                className={`w-full text-left px-2.5 py-1.5 rounded-xl font-semibold transition ${
                  activeBaseLayer === 'esriSat' ? 'bg-sky-600 text-white' : 'hover:bg-slate-800 text-slate-300'
                }`}
              >
                ESRI World Imagery
              </button>
              <button
                onClick={() => switchBaseLayer('osm')}
                className={`w-full text-left px-2.5 py-1.5 rounded-xl font-semibold transition ${
                  activeBaseLayer === 'osm' ? 'bg-sky-600 text-white' : 'hover:bg-slate-800 text-slate-300'
                }`}
              >
                OpenStreetMap
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Floating Bottom: Mission Statistics Cards */}
      <div className="absolute bottom-4 left-3 right-3 sm:left-auto sm:right-4 z-20 pointer-events-none">
        <div className="pointer-events-auto bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-2xl p-3 sm:p-4 shadow-2xl text-white max-w-sm sm:max-w-md ml-auto">
          <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-slate-700/60">
            <span className="text-[11px] font-extrabold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-sky-400" /> Statistik Penerbangan
            </span>
            <span className="text-[10px] text-slate-400 font-bold bg-slate-800 px-2 py-0.5 rounded-md">
              {mission.drone_model}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="bg-slate-800/60 rounded-xl p-2 border border-slate-700/40">
              <span className="text-[10px] text-slate-400 block mb-0.5">Luas Area</span>
              <span className="font-extrabold text-white text-xs sm:text-sm">
                {stats.areaHectares ? stats.areaHectares.toFixed(2) : (stats.areaM2 / 10000).toFixed(2)} Ha
              </span>
            </div>

            <div className="bg-slate-800/60 rounded-xl p-2 border border-slate-700/40">
              <span className="text-[10px] text-slate-400 block mb-0.5">Total Jarak</span>
              <span className="font-extrabold text-white text-xs sm:text-sm">
                {(stats.totalDistanceM / 1000).toFixed(2)} km
              </span>
            </div>

            <div className="bg-slate-800/60 rounded-xl p-2 border border-slate-700/40">
              <span className="text-[10px] text-slate-400 block mb-0.5">Estimasi Waktu</span>
              <span className="font-extrabold text-emerald-400 text-xs sm:text-sm">
                {Math.ceil(stats.flightTimeSeconds / 60)} mnt
              </span>
            </div>

            <div className="bg-slate-800/60 rounded-xl p-2 border border-slate-700/40">
              <span className="text-[10px] text-slate-400 block mb-0.5">Jumlah Foto</span>
              <span className="font-extrabold text-sky-400 text-xs sm:text-sm">
                {stats.photoCount} foto
              </span>
            </div>

            <div className="bg-slate-800/60 rounded-xl p-2 border border-slate-700/40">
              <span className="text-[10px] text-slate-400 block mb-0.5">Ketinggian</span>
              <span className="font-extrabold text-white text-xs sm:text-sm">
                {mission.altitude} m
              </span>
            </div>

            <div className="bg-slate-800/60 rounded-xl p-2 border border-slate-700/40">
              <span className="text-[10px] text-slate-400 block mb-0.5">Kecepatan</span>
              <span className="font-extrabold text-white text-xs sm:text-sm">
                {mission.speed} m/s
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
