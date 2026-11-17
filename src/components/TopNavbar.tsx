'use client';

import React from 'react';
import { Plane, Grid, Route, MapPin, RotateCw, Save, FolderOpen, Download, User as UserIcon, LogOut } from 'lucide-react';
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
}: TopNavbarProps) {
  return (
    <header className="h-14 bg-slate-900/95 backdrop-blur border-b border-slate-800 px-3 flex items-center justify-between z-30 shrink-0">
      {/* Brand & Drone Preset */}
      <div className="flex items-center gap-2 md:gap-3">
        <div className="flex items-center gap-1.5 font-bold text-sky-400 text-sm md:text-base tracking-wide">
          <Plane className="w-5 h-5 text-sky-400 rotate-45" />
          <span className="hidden sm:inline">DJI Mission</span>
          <span className="text-white">Mapper</span>
        </div>

        {/* Drone Selector Dropdown */}
        <select
          value={selectedDroneId}
          onChange={(e) => onSelectDrone(e.target.value)}
          className="bg-slate-800 text-xs md:text-sm text-slate-200 border border-slate-700 rounded-lg px-2 py-1.5 focus:outline-none focus:border-sky-500 font-medium max-w-[140px] md:max-w-none cursor-pointer"
        >
          {DRONE_PRESETS.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </div>

      {/* Mission Type Switcher Tabs */}
      <div className="hidden lg:flex items-center bg-slate-800/80 p-0.5 rounded-lg border border-slate-700/80 text-xs">
        <button
          onClick={() => onSelectMissionType('grid')}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md transition ${
            missionType === 'grid' ? 'bg-sky-500 text-white font-semibold' : 'text-slate-300 hover:text-white'
          }`}
        >
          <Grid className="w-3.5 h-3.5" />
          Area Grid
        </button>
        <button
          onClick={() => onSelectMissionType('corridor')}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md transition ${
            missionType === 'corridor' ? 'bg-sky-500 text-white font-semibold' : 'text-slate-300 hover:text-white'
          }`}
        >
          <Route className="w-3.5 h-3.5" />
          Koridor
        </button>
        <button
          onClick={() => onSelectMissionType('waypoint')}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md transition ${
            missionType === 'waypoint' ? 'bg-sky-500 text-white font-semibold' : 'text-slate-300 hover:text-white'
          }`}
        >
          <MapPin className="w-3.5 h-3.5" />
          Manual WP
        </button>
        <button
          onClick={() => onSelectMissionType('orbit')}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md transition ${
            missionType === 'orbit' ? 'bg-sky-500 text-white font-semibold' : 'text-slate-300 hover:text-white'
          }`}
        >
          <RotateCw className="w-3.5 h-3.5" />
          Orbit POI
        </button>
      </div>

      {/* Action Buttons & Auth */}
      <div className="flex items-center gap-1.5 md:gap-2">
        <button
          onClick={onOpenMissionsDrawer}
          className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium px-2.5 py-1.5 rounded-lg transition"
          title="Buka Misi Tersimpan"
        >
          <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden sm:inline">Misi Saya</span>
        </button>

        <button
          onClick={onOpenSaveModal}
          className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg shadow transition"
          title="Simpan Misi"
        >
          <Save className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Simpan</span>
        </button>

        <button
          onClick={onOpenExportModal}
          className="flex items-center gap-1 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg shadow transition"
          title="Ekspor KMZ / CSV"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Ekspor</span>
        </button>

        {/* User Auth */}
        {user ? (
          <div className="flex items-center gap-1.5 pl-1.5 border-l border-slate-800">
            <span className="hidden md:inline text-xs text-sky-400 font-medium">@{user.username}</span>
            <button
              onClick={onLogout}
              className="p-1.5 text-slate-400 hover:text-red-400 transition"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={onOpenAuthModal}
            className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium px-2.5 py-1.5 rounded-lg transition"
          >
            <UserIcon className="w-3.5 h-3.5 text-sky-400" />
            <span>Login</span>
          </button>
        )}
      </div>
    </header>
  );
}
