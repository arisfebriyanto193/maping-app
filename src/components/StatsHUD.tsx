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
    <div className="bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl p-2 shadow-lg text-slate-800 transition-all">
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 md:gap-2 text-center">
        {/* Luas Area */}
        <div className="flex flex-col items-center bg-slate-50 rounded-xl p-1.5 border border-slate-200/60 shadow-xs">
          <span className="text-[10px] text-slate-500 flex items-center gap-1 font-semibold uppercase tracking-wider">
            <Map className="w-3 h-3 text-sky-600" /> Luas Area
          </span>
          <span className="text-xs md:text-sm font-black text-slate-900 mt-0.5">
            {stats.areaHectares > 0 ? `${stats.areaHectares} ha` : `${stats.areaM2} m²`}
          </span>
        </div>

        {/* Total Jarak */}
        <div className="flex flex-col items-center bg-slate-50 rounded-xl p-1.5 border border-slate-200/60 shadow-xs">
          <span className="text-[10px] text-slate-500 flex items-center gap-1 font-semibold uppercase tracking-wider">
            <Compass className="w-3 h-3 text-emerald-600" /> Jarak Tempuh
          </span>
          <span className="text-xs md:text-sm font-black text-slate-900 mt-0.5">
            {formatDistance(stats.totalDistanceM)}
          </span>
        </div>

        {/* Waktu Terbang */}
        <div className="flex flex-col items-center bg-slate-50 rounded-xl p-1.5 border border-slate-200/60 shadow-xs">
          <span className="text-[10px] text-slate-500 flex items-center gap-1 font-semibold uppercase tracking-wider">
            <Clock className="w-3 h-3 text-amber-600" /> Estimasi Waktu
          </span>
          <span className="text-xs md:text-sm font-black text-amber-700 mt-0.5">
            {formatTime(stats.flightTimeSeconds)}
          </span>
        </div>

        {/* Jumlah Foto & Waypoint */}
        <div className="flex flex-col items-center bg-slate-50 rounded-xl p-1.5 border border-slate-200/60 shadow-xs">
          <span className="text-[10px] text-slate-500 flex items-center gap-1 font-semibold uppercase tracking-wider">
            <Camera className="w-3 h-3 text-indigo-600" /> Foto / Titik
          </span>
          <span className="text-xs md:text-sm font-black text-indigo-900 mt-0.5">
            {stats.photoCount} / {waypointCount}
          </span>
        </div>

        {/* GSD Resolusi */}
        <div className="flex flex-col items-center bg-slate-50 rounded-xl p-1.5 border border-slate-200/60 shadow-xs">
          <span className="text-[10px] text-slate-500 flex items-center gap-1 font-semibold uppercase tracking-wider">
            <Gauge className="w-3 h-3 text-teal-600" /> GSD Resolusi
          </span>
          <span className="text-xs md:text-sm font-black text-teal-700 mt-0.5">
            {stats.gsdCmPx > 0 ? `${stats.gsdCmPx} cm/px` : '-'}
          </span>
        </div>

        {/* Baterai */}
        <div className="flex flex-col items-center bg-slate-50 rounded-xl p-1.5 border border-slate-200/60 shadow-xs">
          <span className="text-[10px] text-slate-500 flex items-center gap-1 font-semibold uppercase tracking-wider">
            <Zap className="w-3 h-3 text-orange-600" /> Kebutuhan Bat
          </span>
          <span className="text-xs md:text-sm font-black text-orange-700 mt-0.5">
            {stats.batteriesRequired} Bat ({stats.batteryRemainingPercent}%)
          </span>
        </div>
      </div>
    </div>
  );
}
