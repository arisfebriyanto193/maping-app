'use client';

import React from 'react';
import { MissionSettings, MissionType } from '@/types/drone';
import { Sliders, Compass, Eye, Shield, Layers, Trash2 } from 'lucide-react';

interface MissionControlsProps {
  settings: MissionSettings;
  onChangeSettings: (newSettings: Partial<MissionSettings>) => void;
  onClearBoundary: () => void;
  missionType: MissionType;
}

export default function MissionControls({
  settings,
  onChangeSettings,
  onClearBoundary,
  missionType,
}: MissionControlsProps) {
  return (
    <div className="space-y-4 text-xs text-slate-300">
      {/* Ketinggian & Kecepatan */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-800/60 p-2.5 rounded-lg border border-slate-700/60">
          <div className="flex justify-between items-center mb-1">
            <label className="font-semibold text-slate-200">Ketinggian</label>
            <span className="text-sky-400 font-bold">{settings.altitude} m</span>
          </div>
          <input
            type="range"
            min={15}
            max={200}
            step={5}
            value={settings.altitude}
            onChange={(e) => onChangeSettings({ altitude: Number(e.target.value) })}
            className="w-full accent-sky-500 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
          />
          <div className="flex justify-between text-[10px] text-slate-500 mt-1">
            <span>15m</span>
            <span>120m (Limit)</span>
            <span>200m</span>
          </div>
        </div>

        <div className="bg-slate-800/60 p-2.5 rounded-lg border border-slate-700/60">
          <div className="flex justify-between items-center mb-1">
            <label className="font-semibold text-slate-200">Kecepatan</label>
            <span className="text-emerald-400 font-bold">{settings.speed} m/s</span>
          </div>
          <input
            type="range"
            min={2}
            max={15}
            step={0.5}
            value={settings.speed}
            onChange={(e) => onChangeSettings({ speed: Number(e.target.value) })}
            className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
          />
          <div className="flex justify-between text-[10px] text-slate-500 mt-1">
            <span>2 m/s</span>
            <span>{(settings.speed * 3.6).toFixed(1)} km/h</span>
            <span>15 m/s</span>
          </div>
        </div>
      </div>

      {/* Overlap Fotogrametri (Untuk Grid & Koridor) */}
      {(missionType === 'grid' || missionType === 'corridor') && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-800/60 p-2.5 rounded-lg border border-slate-700/60">
            <div className="flex justify-between items-center mb-1">
              <label className="font-semibold text-slate-200">Overlap Depan</label>
              <span className="text-indigo-400 font-bold">{settings.overlapFront}%</span>
            </div>
            <input
              type="range"
              min={50}
              max={90}
              step={5}
              value={settings.overlapFront}
              onChange={(e) => onChangeSettings({ overlapFront: Number(e.target.value) })}
              className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
            />
            <span className="text-[10px] text-slate-500 block mt-1">Standar fotogrametri: 75% - 80%</span>
          </div>

          <div className="bg-slate-800/60 p-2.5 rounded-lg border border-slate-700/60">
            <div className="flex justify-between items-center mb-1">
              <label className="font-semibold text-slate-200">Overlap Samping</label>
              <span className="text-indigo-400 font-bold">{settings.overlapSide}%</span>
            </div>
            <input
              type="range"
              min={40}
              max={85}
              step={5}
              value={settings.overlapSide}
              onChange={(e) => onChangeSettings({ overlapSide: Number(e.target.value) })}
              className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
            />
            <span className="text-[10px] text-slate-500 block mt-1">Standar fotogrametri: 65% - 70%</span>
          </div>
        </div>
      )}

      {/* Grid Angle & Double Grid (Khusus Grid) */}
      {missionType === 'grid' && (
        <div className="space-y-3">
          <div className="bg-slate-800/60 p-2.5 rounded-lg border border-slate-700/60">
            <div className="flex justify-between items-center mb-1">
              <label className="font-semibold text-slate-200 flex items-center gap-1">
                <Compass className="w-3.5 h-3.5 text-sky-400" /> Sudut Jalur Terbang
              </label>
              <span className="text-sky-400 font-bold">{settings.gridAngle}°</span>
            </div>
            <input
              type="range"
              min={0}
              max={360}
              step={5}
              value={settings.gridAngle}
              onChange={(e) => onChangeSettings({ gridAngle: Number(e.target.value) })}
              className="w-full accent-sky-500 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
            />
            <div className="flex gap-1.5 mt-2 overflow-x-auto pb-1">
              {[0, 45, 90, 135, 180, 270].map((deg) => (
                <button
                  key={deg}
                  onClick={() => onChangeSettings({ gridAngle: deg })}
                  className={`px-2 py-0.5 rounded text-[10px] font-medium transition ${
                    settings.gridAngle === deg
                      ? 'bg-sky-500 text-white'
                      : 'bg-slate-700/70 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {deg}°
                </button>
              ))}
            </div>
          </div>

          {/* Toggle Double Grid (3D Mesh) */}
          <div className="flex items-center justify-between bg-slate-800/60 p-2.5 rounded-lg border border-slate-700/60">
            <div>
              <span className="font-semibold text-slate-200 block">Double Grid (Crosshatch 3D)</span>
              <span className="text-[10px] text-slate-400">Jalur saling silang untuk model 3D objek & bangunan</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.doubleGrid}
                onChange={(e) => onChangeSettings({ doubleGrid: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sky-500"></div>
            </label>
          </div>
        </div>
      )}

      {/* Parameter Koridor */}
      {missionType === 'corridor' && (
        <div className="bg-slate-800/60 p-2.5 rounded-lg border border-slate-700/60">
          <div className="flex justify-between items-center mb-1">
            <label className="font-semibold text-slate-200">Lebar Koridor</label>
            <span className="text-amber-400 font-bold">{settings.corridorWidth || 40} m</span>
          </div>
          <input
            type="range"
            min={10}
            max={200}
            step={5}
            value={settings.corridorWidth || 40}
            onChange={(e) => onChangeSettings({ corridorWidth: Number(e.target.value) })}
            className="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
          />
          <span className="text-[10px] text-slate-500 block mt-1">Lebar jalur inspeksi jalan / sungai / kabel</span>
        </div>
      )}

      {/* Parameter Orbit */}
      {missionType === 'orbit' && (
        <div className="bg-slate-800/60 p-2.5 rounded-lg border border-slate-700/60">
          <div className="flex justify-between items-center mb-1">
            <label className="font-semibold text-slate-200">Radius Orbit Lingkaran</label>
            <span className="text-amber-400 font-bold">{settings.orbitRadius || 30} m</span>
          </div>
          <input
            type="range"
            min={10}
            max={150}
            step={5}
            value={settings.orbitRadius || 30}
            onChange={(e) => onChangeSettings({ orbitRadius: Number(e.target.value) })}
            className="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
          />
          <span className="text-[10px] text-slate-500 block mt-1">Jarak keliling dari titik pusat POI</span>
        </div>
      )}

      {/* Sudut Pitch Gimbal */}
      <div className="bg-slate-800/60 p-2.5 rounded-lg border border-slate-700/60">
        <div className="flex justify-between items-center mb-1">
          <label className="font-semibold text-slate-200 flex items-center gap-1">
            <Eye className="w-3.5 h-3.5 text-teal-400" /> Sudut Gimbal Kamera
          </label>
          <span className="text-teal-400 font-bold">{settings.gimbalPitch}°</span>
        </div>
        <input
          type="range"
          min={-90}
          max={-30}
          step={5}
          value={settings.gimbalPitch}
          onChange={(e) => onChangeSettings({ gimbalPitch: Number(e.target.value) })}
          className="w-full accent-teal-500 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
        />
        <div className="flex justify-between text-[10px] text-slate-500 mt-1">
          <span>-90° (Tegak Nadir 2D)</span>
          <span>-60° (Miring 3D)</span>
        </div>
      </div>

      {/* Tombol Hapus Area / Reset */}
      <button
        onClick={onClearBoundary}
        className="w-full flex items-center justify-center gap-1.5 bg-red-950/60 hover:bg-red-900/80 text-red-300 border border-red-800/60 py-2 rounded-lg font-medium transition cursor-pointer"
      >
        <Trash2 className="w-3.5 h-3.5 text-red-400" />
        <span>Reset & Hapus Garis di Peta</span>
      </button>
    </div>
  );
}
