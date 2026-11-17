'use client';

import React from 'react';
import { MissionStats } from '@/types/drone';
import { Map, Clock, Camera, Zap, Gauge, Compass } from 'lucide-react';

interface StatsHUDProps {
  stats: MissionStats;
  altitude: number;
  speed: number;
  waypointCount: number;
}

export default function StatsHUD({ stats, altitude, speed, waypointCount }: StatsHUDProps) {
  const formatTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const remainingSecs = sec % 60;
    return `${mins}m ${remainingSecs < 10 ? '0' : ''}${remainingSecs}s`;
  };

  const formatDistance = (meters: number) => {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(2)} km`;
    }
    return `${meters} m`;
  };

  return (
    <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-xl p-2.5 shadow-xl text-slate-200">
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center">
        {/* Luas Area */}
        <div className="flex flex-col items-center bg-slate-800/60 rounded-lg p-1.5 border border-slate-700/50">
          <span className="text-[10px] text-slate-400 flex items-center gap-1 font-medium">
            <Map className="w-3 h-3 text-sky-400" /> Luas Area
          </span>
          <span className="text-xs md:text-sm font-bold text-white mt-0.5">
            {stats.areaHectares > 0 ? `${stats.areaHectares} ha` : `${stats.areaM2} m²`}
          </span>
        </div>

        {/* Total Jarak */}
        <div className="flex flex-col items-center bg-slate-800/60 rounded-lg p-1.5 border border-slate-700/50">
          <span className="text-[10px] text-slate-400 flex items-center gap-1 font-medium">
            <Compass className="w-3 h-3 text-emerald-400" /> Jarak Jalur
          </span>
          <span className="text-xs md:text-sm font-bold text-white mt-0.5">
            {formatDistance(stats.totalDistanceM)}
          </span>
        </div>

        {/* Waktu Terbang */}
        <div className="flex flex-col items-center bg-slate-800/60 rounded-lg p-1.5 border border-slate-700/50">
          <span className="text-[10px] text-slate-400 flex items-center gap-1 font-medium">
            <Clock className="w-3 h-3 text-amber-400" /> Durasi
          </span>
          <span className="text-xs md:text-sm font-bold text-amber-300 mt-0.5">
            {formatTime(stats.flightTimeSeconds)}
          </span>
        </div>

        {/* Jumlah Foto & Waypoint */}
        <div className="flex flex-col items-center bg-slate-800/60 rounded-lg p-1.5 border border-slate-700/50">
          <span className="text-[10px] text-slate-400 flex items-center gap-1 font-medium">
            <Camera className="w-3 h-3 text-indigo-400" /> Foto / WP
          </span>
          <span className="text-xs md:text-sm font-bold text-white mt-0.5">
            {stats.photoCount} / {waypointCount}
          </span>
        </div>

        {/* GSD Resolusi */}
        <div className="flex flex-col items-center bg-slate-800/60 rounded-lg p-1.5 border border-slate-700/50">
          <span className="text-[10px] text-slate-400 flex items-center gap-1 font-medium">
            <Gauge className="w-3 h-3 text-teal-400" /> GSD
          </span>
          <span className="text-xs md:text-sm font-bold text-teal-300 mt-0.5">
            {stats.gsdCmPx > 0 ? `${stats.gsdCmPx} cm/px` : '-'}
          </span>
        </div>

        {/* Baterai */}
        <div className="flex flex-col items-center bg-slate-800/60 rounded-lg p-1.5 border border-slate-700/50">
          <span className="text-[10px] text-slate-400 flex items-center gap-1 font-medium">
            <Zap className="w-3 h-3 text-yellow-400" /> Baterai
          </span>
          <span className="text-xs md:text-sm font-bold text-white mt-0.5">
            {stats.batteriesRequired} Bat ({stats.batteryRemainingPercent}%)
          </span>
        </div>
      </div>
    </div>
  );
}
