'use client';

import React from 'react';
import { Plane, Grid, Route, MapPin, RotateCw, Save, FolderOpen, Download, User as UserIcon, LogOut, Undo2, Redo2 } from 'lucide-react';
import { DRONE_PRESETS } from '@/lib/drone-presets';
import { MissionType, UserSession } from '@/types/drone';

interface TopNavbarProps {
  selectedDroneId: string;
  onSelectDrone: (droneId: string) => void;
  missionType: MissionType;
  onSelectMissionType: (type: MissionType) => void;
  onOpenSaveModal: () => void;
  onOpenMissionsDrawer: () => void;
  onOpenExportModal: () => void;
  user: UserSession | null;
  onOpenAuthModal: () => void;
  onLogout: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}

export default function TopNavbar({
  selectedDroneId,
  onSelectDrone,
  missionType,
  onSelectMissionType,
  onOpenSaveModal,
  onOpenMissionsDrawer,
  onOpenExportModal,
  user,
  onOpenAuthModal,
  onLogout,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
}: TopNavbarProps) {
  return (
    <header className="h-14 bg-white/95 backdrop-blur border-b border-slate-200 px-3 flex items-center justify-between z-30 shrink-0 shadow-xs">
      {/* Brand & Drone Preset */}
      <div className="flex items-center gap-2 md:gap-3">
        <div className="flex items-center gap-1.5 font-extrabold text-sky-600 text-sm md:text-base tracking-tight">
          <div className="w-7 h-7 rounded-lg bg-sky-500/10 flex items-center justify-center text-sky-600">
            <Plane className="w-4 h-4 rotate-45" />
          </div>
          <span className="hidden sm:inline text-slate-800">Aerial</span>
          <span className="text-sky-600">Nav</span>
        </div>

        {/* Drone Selector Dropdown */}
        <select
          value={selectedDroneId}
          onChange={(e) => onSelectDrone(e.target.value)}
          className="bg-slate-50 text-xs md:text-sm text-slate-800 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 font-semibold max-w-[150px] md:max-w-none cursor-pointer shadow-2xs hover:bg-slate-100 transition"
        >
          {DRONE_PRESETS.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </div>

      {/* Mission Type Switcher Tabs (AerialNav style) */}
      <div className="hidden lg:flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs shadow-inner">
        <button
          onClick={() => onSelectMissionType('grid')}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition font-semibold cursor-pointer ${
            missionType === 'grid'
              ? 'bg-white text-sky-700 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Grid className="w-3.5 h-3.5" />
          Area Grid
        </button>
        <button
          onClick={() => onSelectMissionType('corridor')}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition font-semibold cursor-pointer ${
            missionType === 'corridor'
              ? 'bg-white text-sky-700 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Route className="w-3.5 h-3.5" />
          Koridor
        </button>
        <button
          onClick={() => onSelectMissionType('waypoint')}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition font-semibold cursor-pointer ${
            missionType === 'waypoint'
              ? 'bg-white text-sky-700 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <MapPin className="w-3.5 h-3.5" />
          Manual WP
        </button>
        <button
          onClick={() => onSelectMissionType('orbit')}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition font-semibold cursor-pointer ${
            missionType === 'orbit'
              ? 'bg-white text-sky-700 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <RotateCw className="w-3.5 h-3.5" />
          Orbit POI
        </button>
      </div>

      {/* Undo / Redo & Action Buttons */}
      <div className="flex items-center gap-1.5 md:gap-2">
        {/* Undo / Redo Toolbar */}
        <div className="flex items-center bg-slate-100 border border-slate-200 rounded-lg p-0.5">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            title="Batal Titik Terakhir (Ctrl+Z)"
            className={`p-1.5 rounded-md transition ${
              canUndo
                ? 'text-slate-700 hover:bg-white hover:text-sky-600 cursor-pointer shadow-2xs'
                : 'text-slate-300 cursor-not-allowed'
            }`}
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            title="Ulangi Titik (Ctrl+Y)"
            className={`p-1.5 rounded-md transition ${
              canRedo
                ? 'text-slate-700 hover:bg-white hover:text-sky-600 cursor-pointer shadow-2xs'
                : 'text-slate-300 cursor-not-allowed'
            }`}
          >
            <Redo2 className="w-4 h-4" />
          </button>
        </div>

        {/* Misi Saya */}
        <button
          onClick={onOpenMissionsDrawer}
          className="flex items-center gap-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold px-2.5 py-1.5 rounded-lg shadow-2xs transition cursor-pointer"
          title="Buka Misi Tersimpan di Server"
        >
          <FolderOpen className="w-3.5 h-3.5 text-amber-500" />
          <span className="hidden sm:inline">Misi Saya</span>
        </button>

        {/* Simpan */}
        <button
          onClick={onOpenSaveModal}
          className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-2.5 py-1.5 rounded-lg shadow-sm transition cursor-pointer"
          title="Simpan Misi ke Database"
        >
          <Save className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Simpan</span>
        </button>

        {/* Ekspor */}
        <button
          onClick={onOpenExportModal}
          className="flex items-center gap-1 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold px-2.5 py-1.5 rounded-lg shadow-sm transition cursor-pointer"
          title="Ekspor KMZ / CSV / Potensic"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Ekspor</span>
        </button>

        {/* User Auth */}
        {user ? (
          <div className="flex items-center gap-1.5 pl-1.5 border-l border-slate-200">
            <span className="hidden md:inline text-xs text-sky-700 font-bold bg-sky-50 px-2 py-1 rounded-md border border-sky-100">
              @{user.username}
            </span>
            <button
              onClick={onLogout}
              className="p-1.5 text-slate-500 hover:text-red-600 transition cursor-pointer"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={onOpenAuthModal}
            className="flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition cursor-pointer"
          >
            <UserIcon className="w-3.5 h-3.5 text-sky-600" />
            <span>Login</span>
          </button>
        )}
      </div>
    </header>
  );
}
