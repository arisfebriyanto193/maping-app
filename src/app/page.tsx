'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import TopNavbar from '@/components/TopNavbar';
import StatsHUD from '@/components/StatsHUD';
import MissionControls from '@/components/MissionControls';
import MobileBottomSheet from '@/components/MobileBottomSheet';
import ExportModal from '@/components/ExportModal';
import SaveMissionModal from '@/components/SaveMissionModal';
import MissionsDrawer from '@/components/MissionsDrawer';
import AuthModal from '@/components/AuthModal';

import { DRONE_PRESETS } from '@/lib/drone-presets';
import { generateMappingGrid } from '@/lib/grid-generator';
import { generateCorridorPath } from '@/lib/corridor-generator';
import { generateOrbitPath } from '@/lib/orbit-generator';
import {
  MissionType,
  MissionSettings,
  MissionStats,
  Waypoint,
  UserSession,
  DroneMissionRecord,
  HistoryState,
} from '@/types/drone';

// Dynamically import Leaflet Map component with SSR disabled
const MapViewport = dynamic(() => import('@/components/MapViewport'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-slate-100 flex flex-col items-center justify-center text-slate-500 gap-3">
      <div className="w-9 h-9 border-3 border-sky-600 border-t-transparent rounded-full animate-spin" />
      <span className="text-xs font-semibold text-slate-600">Memuat peta satelit Leaflet...</span>
    </div>
  ),
});

export default function DroneMappingApp() {
  // User Session
  const [user, setUser] = useState<UserSession | null>(null);

  // Drone Profile
  const [selectedDroneId, setSelectedDroneId] = useState<string>('dji-mini-4-pro');
  const activeDrone = useMemo(() => {
    return DRONE_PRESETS.find((d) => d.id === selectedDroneId) || DRONE_PRESETS[0];
  }, [selectedDroneId]);

  // Mission Type & Settings
  const [missionType, setMissionType] = useState<MissionType>('grid');
  const [settings, setSettings] = useState<MissionSettings>({
    title: 'Misi Mapping Mini 4 Pro',
    droneModel: activeDrone.name,
    missionType: 'grid',
    altitude: 60,
    speed: 6,
    overlapFront: 75,
    overlapSide: 65,
    gridAngle: 0,
    doubleGrid: false,
    margin: 15,
    gimbalPitch: -90,
    corridorWidth: 40,
    orbitRadius: 35,
    // AerialNav Safety Settings
    finishAction: 'goHome',
    rcLostAction: 'goContinue',
    cameraAction: 'takePhoto',
    takeoffSecurityHeight: 20,
    sensorMode: '48mp',
    turnMode: 'smooth',
    waypointPathType: 'turnOnly',
  });

  // Map Data State
  const [boundaryCoords, setBoundaryCoords] = useState<[number, number][]>([]);
  const [orbitCenter, setOrbitCenter] = useState<[number, number] | undefined>(undefined);
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [stats, setStats] = useState<MissionStats>({
    areaM2: 0,
    areaHectares: 0,
    totalDistanceM: 0,
    flightTimeSeconds: 0,
    photoCount: 0,
    gsdCmPx: 0,
    batteriesRequired: 0,
    batteryRemainingPercent: 100,
  });

  // ==========================================
  // UNDO & REDO HISTORY STACK SYSTEM
  // ==========================================
  const [history, setHistory] = useState<HistoryState[]>([
    { boundaryCoords: [], orbitCenter: undefined },
  ]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const pushHistory = useCallback((newCoords: [number, number][], newOrbitCenter?: [number, number]) => {
    setHistory((prev) => {
      const trimmed = prev.slice(0, historyIndex + 1);
      return [...trimmed, { boundaryCoords: newCoords, orbitCenter: newOrbitCenter }];
    });
    setHistoryIndex((prev) => prev + 1);
  }, [historyIndex]);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const nextIdx = historyIndex - 1;
      const targetState = history[nextIdx];
      setHistoryIndex(nextIdx);
      setBoundaryCoords(targetState.boundaryCoords);
      setOrbitCenter(targetState.orbitCenter);
    }
  }, [historyIndex, history]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextIdx = historyIndex + 1;
      const targetState = history[nextIdx];
      setHistoryIndex(nextIdx);
      setBoundaryCoords(targetState.boundaryCoords);
      setOrbitCenter(targetState.orbitCenter);
    }
  }, [historyIndex, history]);

  // Point Addition & Deletion Actions
  const handleAddPoint = useCallback((pt: [number, number]) => {
    setBoundaryCoords((prev) => {
      const updated = [...prev, pt];
      pushHistory(updated, orbitCenter);
      return updated;
    });
  }, [orbitCenter, pushHistory]);

  const handleUpdateBoundaryCoords = useCallback((coords: [number, number][]) => {
    setBoundaryCoords(coords);
    pushHistory(coords, orbitCenter);
  }, [orbitCenter, pushHistory]);

  const handleDeletePointIndex = useCallback((index: number) => {
    setBoundaryCoords((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      pushHistory(updated, orbitCenter);
      return updated;
    });
  }, [orbitCenter, pushHistory]);

  const handleUpdateOrbitCenter = useCallback((center: [number, number]) => {
    setOrbitCenter(center);
    pushHistory(boundaryCoords, center);
  }, [boundaryCoords, pushHistory]);

  const handleClearBoundary = useCallback(() => {
    setBoundaryCoords([]);
    setOrbitCenter(undefined);
    pushHistory([], undefined);
    setWaypoints([]);
    setStats({
      areaM2: 0,
      areaHectares: 0,
      totalDistanceM: 0,
      flightTimeSeconds: 0,
      photoCount: 0,
      gsdCmPx: 0,
      batteriesRequired: 0,
      batteryRemainingPercent: 100,
    });
  }, [pushHistory]);

  // Modals
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showMissionsDrawer, setShowMissionsDrawer] = useState(false);

  // Check user session on load
  const checkSession = useCallback(async () => {
    try {
      const res = await fetch('/maping/api/auth/me');
      const data = await res.json();
      if (res.ok && data.authenticated) {
        setUser(data.user);
      }
    } catch {
      // not logged in
    }
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  const handleLogout = async () => {
    try {
      await fetch('/maping/api/auth/logout', { method: 'POST' });
      setUser(null);
    } catch (err) {
      console.error(err);
    }
  };

  // Sync drone model into settings
  const handleSelectDrone = (id: string) => {
    setSelectedDroneId(id);
    const d = DRONE_PRESETS.find((p) => p.id === id) || DRONE_PRESETS[0];
    setSettings((prev) => ({ ...prev, droneModel: d.name }));
  };

  const handleSelectMissionType = (type: MissionType) => {
    setMissionType(type);
    setSettings((prev) => ({ ...prev, missionType: type }));
  };

  const handleChangeSettings = (partial: Partial<MissionSettings>) => {
    setSettings((prev) => ({ ...prev, ...partial }));
  };

  // Re-calculate flight path when inputs change
  useEffect(() => {
    if (missionType === 'grid') {
      if (boundaryCoords.length >= 3) {
        const result = generateMappingGrid({
          polygonCoords: boundaryCoords,
          altitude: settings.altitude,
          speed: settings.speed,
          overlapFront: settings.overlapFront,
          overlapSide: settings.overlapSide,
          gridAngle: settings.gridAngle,
          doubleGrid: settings.doubleGrid,
          gimbalPitch: settings.gimbalPitch,
          drone: activeDrone,
          sensorMode: settings.sensorMode,
          margin: settings.margin,
          waypointPathType: settings.waypointPathType,
        });
        setWaypoints(result.waypoints);
        setStats(result.stats);
      } else {
        setWaypoints([]);
      }
    } else if (missionType === 'corridor') {
      if (boundaryCoords.length >= 2) {
        const result = generateCorridorPath({
          pathCoords: boundaryCoords,
          corridorWidthM: settings.corridorWidth || 40,
          altitude: settings.altitude,
          speed: settings.speed,
          overlapFront: settings.overlapFront,
          overlapSide: settings.overlapSide,
          gimbalPitch: settings.gimbalPitch,
          drone: activeDrone,
          sensorMode: settings.sensorMode,
          margin: settings.margin,
          waypointPathType: settings.waypointPathType,
        });
        setWaypoints(result.waypoints);
        setStats(result.stats);
      } else {
        setWaypoints([]);
      }
    } else if (missionType === 'orbit') {
      if (orbitCenter) {
        const result = generateOrbitPath({
          center: orbitCenter,
          radiusM: settings.orbitRadius || 35,
          altitude: settings.altitude,
          speed: settings.speed,
          photoCount: 18,
          drone: activeDrone,
          sensorMode: settings.sensorMode,
        });
        setWaypoints(result.waypoints);
        setStats(result.stats);
      } else {
        setWaypoints([]);
      }
    } else if (missionType === 'waypoint') {
      // Manual waypoints
      const wps: Waypoint[] = boundaryCoords.map((pt, idx) => ({
        id: idx + 1,
        lat: pt[0],
        lng: pt[1],
        altitude: settings.altitude,
        speed: settings.speed,
        gimbalPitch: settings.gimbalPitch,
        action: { type: 'takePhoto', param: 0 },
      }));
      setWaypoints(wps);
    }
  }, [
    missionType,
    boundaryCoords,
    orbitCenter,
    settings.altitude,
    settings.speed,
    settings.overlapFront,
    settings.overlapSide,
    settings.gridAngle,
    settings.doubleGrid,
    settings.gimbalPitch,
    settings.corridorWidth,
    settings.orbitRadius,
    settings.sensorMode,
    settings.margin,
    settings.waypointPathType,
    activeDrone,
  ]);

  // Load a mission saved on server
  const handleLoadMission = (mission: DroneMissionRecord) => {
    try {
      setSettings((prev) => ({
        ...prev,
        title: mission.title,
        droneModel: mission.drone_model,
        missionType: mission.mission_type,
        altitude: mission.altitude,
        speed: mission.speed,
        overlapFront: mission.overlap_front,
        overlapSide: mission.overlap_side,
        gridAngle: mission.grid_angle,
        gimbalPitch: mission.gimbal_pitch,
      }));

      setMissionType(mission.mission_type);

      const d = DRONE_PRESETS.find((p) => p.name === mission.drone_model);
      if (d) setSelectedDroneId(d.id);

      if (mission.boundary_geojson) {
        const coords =
          typeof mission.boundary_geojson === 'string'
            ? JSON.parse(mission.boundary_geojson)
            : mission.boundary_geojson;
        setBoundaryCoords(coords);
        pushHistory(coords, undefined);
      }

      const wps =
        typeof mission.waypoints_json === 'string'
          ? JSON.parse(mission.waypoints_json)
          : mission.waypoints_json;
      setWaypoints(wps || []);

      if (mission.stats_json) {
        const st =
          typeof mission.stats_json === 'string'
            ? JSON.parse(mission.stats_json)
            : mission.stats_json;
        setStats(st);
      }
    } catch (err) {
      console.error('Error loading mission:', err);
      alert('Gagal memuat data misi');
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-50 text-slate-900">
      {/* Top Navigation (Light Theme with Undo / Redo buttons) */}
      <TopNavbar
        selectedDroneId={selectedDroneId}
        onSelectDrone={handleSelectDrone}
        missionType={missionType}
        onSelectMissionType={handleSelectMissionType}
        onOpenSaveModal={() => setShowSaveModal(true)}
        onOpenMissionsDrawer={() => setShowMissionsDrawer(true)}
        onOpenExportModal={() => setShowExportModal(true)}
        user={user}
        onOpenAuthModal={() => setShowAuthModal(true)}
        onLogout={handleLogout}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={handleUndo}
        onRedo={handleRedo}
      />

      {/* Main App Workspace */}
      <div className="flex-1 relative flex overflow-hidden">
        {/* Desktop Sidebar Controls (Light Theme) */}
        <aside className="hidden lg:flex flex-col w-84 bg-white/95 backdrop-blur-md border-r border-slate-200 p-4 overflow-y-auto shrink-0 z-20 shadow-md">
          <div className="mb-4">
            <h2 className="text-sm font-extrabold text-slate-900 mb-0.5">Parameter Misi Terbang</h2>
            <p className="text-[11px] text-slate-500 font-medium">
              Konfigurasi fotogrametri otomatis &amp; keselamatan terbang.
            </p>
          </div>

          <MissionControls
            settings={settings}
            onChangeSettings={handleChangeSettings}
            onClearBoundary={handleClearBoundary}
            missionType={missionType}
          />
        </aside>

        {/* Center Map Viewport */}
        <main className="flex-1 relative h-full w-full">
          {/* Floating Stats HUD Banner (Light Theme) */}
          <div className="absolute top-16 left-3 right-3 sm:left-4 sm:right-4 z-20 pointer-events-none">
            <div className="pointer-events-auto max-w-4xl mx-auto">
              <StatsHUD
                stats={stats}
                altitude={settings.altitude}
                speed={settings.speed}
                waypointCount={waypoints.length}
              />
            </div>
          </div>

          {/* Interactive Leaflet Map with Undo & Redo tools */}
          <MapViewport
            missionType={missionType}
            boundaryCoords={boundaryCoords}
            onAddPoint={handleAddPoint}
            onUpdateBoundaryCoords={handleUpdateBoundaryCoords}
            onDeletePointIndex={handleDeletePointIndex}
            waypoints={waypoints}
            orbitCenter={orbitCenter}
            onUpdateOrbitCenter={handleUpdateOrbitCenter}
            orbitRadius={settings.orbitRadius}
            canUndo={canUndo}
            canRedo={canRedo}
            onUndo={handleUndo}
            onRedo={handleRedo}
          />
        </main>
      </div>

      {/* Mobile Bottom Sheet Drawer ("tapi hp") */}
      <MobileBottomSheet title="Pengaturan Misi Drone">
        <MissionControls
          settings={settings}
          onChangeSettings={handleChangeSettings}
          onClearBoundary={handleClearBoundary}
          missionType={missionType}
        />
      </MobileBottomSheet>

      {/* Modals */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onLoginSuccess={(u) => setUser(u)}
      />

      <SaveMissionModal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        user={user}
        onOpenAuthModal={() => setShowAuthModal(true)}
        waypoints={waypoints}
        boundaryCoords={boundaryCoords}
        settings={settings}
        stats={stats}
      />

      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        waypoints={waypoints}
        drone={activeDrone}
        settings={settings}
        boundaryCoords={boundaryCoords.length >= 3 ? boundaryCoords : undefined}
      />

      <MissionsDrawer
        isOpen={showMissionsDrawer}
        onClose={() => setShowMissionsDrawer(false)}
        user={user}
        onLoadMission={handleLoadMission}
        onOpenAuthModal={() => setShowAuthModal(true)}
      />
    </div>
  );
}
