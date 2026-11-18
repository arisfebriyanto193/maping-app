'use client';

import React from 'react';
import { MissionSettings, MissionType, FinishAction, RCLostAction, CameraAction } from '@/types/drone';
import { Sliders, Compass, Eye, Shield, Trash2, Camera, Radio, Home, Aperture, CornerDownRight, Waypoints, Maximize2 } from 'lucide-react';

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
    <div className="space-y-3.5 text-xs text-slate-700">
      {/* 1. Ketinggian & Kecepatan */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex justify-between items-center mb-1">
            <label className="font-bold text-slate-800">Ketinggian</label>
            <span className="text-sky-700 font-extrabold">{settings.altitude} m</span>
          </div>
          <input
            type="range"
            min={15}
            max={200}
            step={5}
            value={settings.altitude}
            onChange={(e) => onChangeSettings({ altitude: Number(e.target.value) })}
            className="w-full accent-sky-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
          />
          <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-medium">
            <span>15m</span>
            <span>120m (Limit)</span>
            <span>200m</span>
          </div>
        </div>

        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex justify-between items-center mb-1">
            <label className="font-bold text-slate-800">Kecepatan</label>
            <span className="text-emerald-700 font-extrabold">{settings.speed} m/s</span>
          </div>
          <input
            type="range"
            min={2}
            max={15}
            step={0.5}
            value={settings.speed}
            onChange={(e) => onChangeSettings({ speed: Number(e.target.value) })}
            className="w-full accent-emerald-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
          />
          <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-medium">
            <span>2 m/s</span>
            <span>{(settings.speed * 3.6).toFixed(1)} km/h</span>
            <span>15 m/s</span>
          </div>
        </div>
      </div>

      {/* Mode Sensor Kamera (12MP vs 48MP/50MP High-Res - AerialNav Feature) */}
      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex justify-between items-center mb-1.5">
          <label className="font-bold text-slate-800 flex items-center gap-1">
            <Aperture className="w-3.5 h-3.5 text-sky-600" /> Mode Sensor Kamera
          </label>
          <span className="text-sky-700 font-extrabold text-[11px]">
            {settings.sensorMode === '12mp' ? '12 MP (Standar)' : '48/50 MP (High-Res)'}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={() => onChangeSettings({ sensorMode: '12mp' })}
            className={`py-1.5 px-2 rounded-lg text-xs font-bold transition cursor-pointer border ${
              settings.sensorMode === '12mp'
                ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            12 MP (Binned)
          </button>
          <button
            type="button"
            onClick={() => onChangeSettings({ sensorMode: '48mp' })}
            className={`py-1.5 px-2 rounded-lg text-xs font-bold transition cursor-pointer border ${
              settings.sensorMode !== '12mp'
                ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            48 / 50 MP (High-Res)
          </button>
        </div>
        <span className="text-[10px] text-slate-500 block mt-1">
          {settings.sensorMode === '12mp'
            ? '12MP: Kecepatan simpan foto lebih cepat, GSD standar (~2.1 cm/px @60m)'
            : '48MP/50MP: Resolusi tinggi untuk detail peta tajam, GSD rapat (~1.05 cm/px @60m)'}
        </span>
      </div>

      {/* Waypoint Path Type (Full vs Turn Only - AerialNav 11:30 & 18:43) */}
      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex justify-between items-center mb-1.5">
          <label className="font-bold text-slate-800 flex items-center gap-1">
            <Waypoints className="w-3.5 h-3.5 text-indigo-600" /> Waypoint Path Type
          </label>
          <span className="text-indigo-700 font-extrabold text-[11px]">
            {settings.waypointPathType === 'full' ? 'Full (Semua Titik)' : 'Turn Only (Belokan Saja)'}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={() => onChangeSettings({ waypointPathType: 'turnOnly' })}
            className={`py-1.5 px-2 rounded-lg text-xs font-bold transition cursor-pointer border ${
              settings.waypointPathType !== 'full'
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            Turn Only (Rekomendasi)
          </button>
          <button
            type="button"
            onClick={() => onChangeSettings({ waypointPathType: 'full' })}
            className={`py-1.5 px-2 rounded-lg text-xs font-bold transition cursor-pointer border ${
              settings.waypointPathType === 'full'
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            Full (Semua Titik)
          </button>
        </div>
        <span className="text-[10px] text-slate-500 block mt-1">
          {settings.waypointPathType === 'full'
            ? 'Full: Menghasilkan titik di setiap interval foto (cocok untuk area kecil < 100 titik).'
            : 'Turn Only: Titik berkurang drastis (hanya belokan) agar DJI Fly lancar & tidak lag. Foto memakai Timed Shot 2 detik.'}
        </span>
      </div>

      {/* Margin / Overshoot Batas Area (AerialNav 18:43) */}
      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex justify-between items-center mb-1">
          <label className="font-bold text-slate-800 flex items-center gap-1">
            <Maximize2 className="w-3.5 h-3.5 text-emerald-600" /> Margin / Overshoot Batas
          </label>
          <span className="text-emerald-700 font-extrabold">{settings.margin ?? 15} m</span>
        </div>
        <input
          type="range"
          min={0}
          max={50}
          step={5}
          value={settings.margin ?? 15}
          onChange={(e) => onChangeSettings({ margin: Number(e.target.value) })}
          className="w-full accent-emerald-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
        />
        <div className="flex gap-1.5 mt-2 overflow-x-auto pb-0.5">
          {[0, 10, 15, 20, 25, 30].map((mVal) => (
            <button
              key={mVal}
              type="button"
              onClick={() => onChangeSettings({ margin: mVal })}
              className={`px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                (settings.margin ?? 15) === mVal
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              {mVal === 0 ? '0m (Pas)' : mVal === 15 ? '15m (Standar)' : `${mVal}m`}
            </button>
          ))}
        </div>
        <span className="text-[10px] text-slate-500 block mt-1">
          Jalur drone melebihkan batas poligon (video 18:43) agar seluruh tepi lahan ter-cover foto penuh dan belokan stabil di luar area.
        </span>
      </div>

      {/* 2. Overlap Fotogrametri (Untuk Grid & Koridor) */}
      {(missionType === 'grid' || missionType === 'corridor') && (
        <div className="grid grid-cols-2 gap-2.5">
          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex justify-between items-center mb-1">
              <label className="font-bold text-slate-800">Overlap Depan</label>
              <span className="text-indigo-700 font-extrabold">{settings.overlapFront}%</span>
            </div>
            <input
              type="range"
              min={50}
              max={90}
              step={5}
              value={settings.overlapFront}
              onChange={(e) => onChangeSettings({ overlapFront: Number(e.target.value) })}
              className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
            />
            <span className="text-[10px] text-slate-500 block mt-1">Standar: 75% - 80%</span>
          </div>

          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex justify-between items-center mb-1">
              <label className="font-bold text-slate-800">Overlap Samping</label>
              <span className="text-indigo-700 font-extrabold">{settings.overlapSide}%</span>
            </div>
            <input
              type="range"
              min={40}
              max={85}
              step={5}
              value={settings.overlapSide}
              onChange={(e) => onChangeSettings({ overlapSide: Number(e.target.value) })}
              className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
            />
            <span className="text-[10px] text-slate-500 block mt-1">Standar: 65% - 70%</span>
          </div>
        </div>
      )}

      {/* 3. Grid Angle & Double Grid (Khusus Grid) */}
      {missionType === 'grid' && (
        <div className="space-y-2.5">
          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex justify-between items-center mb-1">
              <label className="font-bold text-slate-800 flex items-center gap-1">
                <Compass className="w-3.5 h-3.5 text-sky-600" /> Sudut Jalur Terbang
              </label>
              <span className="text-sky-700 font-extrabold">{settings.gridAngle}°</span>
            </div>
            <input
              type="range"
              min={0}
              max={360}
              step={5}
              value={settings.gridAngle}
              onChange={(e) => onChangeSettings({ gridAngle: Number(e.target.value) })}
              className="w-full accent-sky-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
            />
            <div className="flex gap-1.5 mt-2 overflow-x-auto pb-0.5">
              {[0, 45, 90, 135, 180, 270].map((deg) => (
                <button
                  key={deg}
                  onClick={() => onChangeSettings({ gridAngle: deg })}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                    settings.gridAngle === deg
                      ? 'bg-sky-600 text-white shadow-2xs'
                      : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
                  }`}
                >
                  {deg}°
                </button>
              ))}
            </div>
          </div>

          {/* Toggle Double Grid (3D Mesh) */}
          <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-200 shadow-2xs">
            <div>
              <span className="font-bold text-slate-800 block">Double Grid (Crosshatch 3D)</span>
              <span className="text-[10px] text-slate-500">Jalur saling silang untuk model 3D bangunan/lahan</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.doubleGrid}
                onChange={(e) => onChangeSettings({ doubleGrid: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sky-600"></div>
            </label>
          </div>
        </div>
      )}

      {/* 4. Parameter Koridor */}
      {missionType === 'corridor' && (
        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex justify-between items-center mb-1">
            <label className="font-bold text-slate-800">Lebar Koridor</label>
            <span className="text-amber-700 font-extrabold">{settings.corridorWidth || 40} m</span>
          </div>
          <input
            type="range"
            min={10}
            max={200}
            step={5}
            value={settings.corridorWidth || 40}
            onChange={(e) => onChangeSettings({ corridorWidth: Number(e.target.value) })}
            className="w-full accent-amber-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
          />
          <span className="text-[10px] text-slate-500 block mt-1">Lebar jalur inspeksi jalan / sungai / kabel</span>
        </div>
      )}

      {/* 5. Parameter Orbit */}
      {missionType === 'orbit' && (
        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex justify-between items-center mb-1">
            <label className="font-bold text-slate-800">Radius Orbit Lingkaran</label>
            <span className="text-amber-700 font-extrabold">{settings.orbitRadius || 30} m</span>
          </div>
          <input
            type="range"
            min={10}
            max={150}
            step={5}
            value={settings.orbitRadius || 30}
            onChange={(e) => onChangeSettings({ orbitRadius: Number(e.target.value) })}
            className="w-full accent-amber-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
          />
          <span className="text-[10px] text-slate-500 block mt-1">Jarak keliling dari titik pusat POI</span>
        </div>
      )}

      {/* 6. Sudut Pitch Gimbal */}
      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex justify-between items-center mb-1">
          <label className="font-bold text-slate-800 flex items-center gap-1">
            <Eye className="w-3.5 h-3.5 text-teal-600" /> Sudut Gimbal Kamera
          </label>
          <span className="text-teal-700 font-extrabold">{settings.gimbalPitch}°</span>
        </div>
        <input
          type="range"
          min={-90}
          max={-30}
          step={5}
          value={settings.gimbalPitch}
          onChange={(e) => onChangeSettings({ gimbalPitch: Number(e.target.value) })}
          className="w-full accent-teal-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
        />
        <div className="flex justify-between text-[10px] text-slate-500 mt-1">
          <span>-90° (Tegak Nadir 2D)</span>
          <span>-60° (Miring Oblique 3D)</span>
        </div>
      </div>

      {/* 7. Fitur Keselamatan & Aksi Misi (AerialNav Style) */}
      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex items-center gap-1.5 font-bold text-slate-800 border-b border-slate-200 pb-1.5">
          <Shield className="w-4 h-4 text-emerald-600" />
          <span>Aksi Keselamatan (AerialNav)</span>
        </div>

        {/* Finish Action */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-700 mb-1 flex items-center gap-1">
            <Home className="w-3 h-3 text-sky-600" /> Aksi Misi Selesai (Finish Action)
          </label>
          <select
            value={settings.finishAction}
            onChange={(e) => onChangeSettings({ finishAction: e.target.value as FinishAction })}
            className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-sky-500"
          >
            <option value="goHome">RTH (Kembali ke Titik Lepas Landas)</option>
            <option value="autoHover">Auto Hover (Melayang Diam di Akhir)</option>
            <option value="goFirstWaypoint">Kembali ke Titik Pertama</option>
          </select>
        </div>

        {/* RC Lost Action */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-700 mb-1 flex items-center gap-1">
            <Radio className="w-3 h-3 text-amber-600" /> Aksi Hilang Sinyal (Signal Lost)
          </label>
          <select
            value={settings.rcLostAction}
            onChange={(e) => onChangeSettings({ rcLostAction: e.target.value as RCLostAction })}
            className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-sky-500"
          >
            <option value="goContinue">Lanjut Terbang Misi (Continue)</option>
            <option value="autoHover">Hover di Posisi Terakhir</option>
            <option value="executeLostAction">RTH Darurat (Return to Home)</option>
          </select>
        </div>

        {/* Camera Action */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-700 mb-1 flex items-center gap-1">
            <Camera className="w-3 h-3 text-indigo-600" /> Mode Kamera (Camera Action)
          </label>
          <select
            value={settings.cameraAction}
            onChange={(e) => onChangeSettings({ cameraAction: e.target.value as CameraAction })}
            className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-sky-500"
          >
            <option value="takePhoto">Ambil Foto Otomatis (Fotogrametri)</option>
            <option value="recordVideo">Rekam Video (Start & Stop)</option>
            <option value="none">Tanpa Aksi Kamera</option>
          </select>
        </div>

        {/* Turn Mode (AerialNav Feature) */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-700 mb-1 flex items-center gap-1">
            <CornerDownRight className="w-3 h-3 text-sky-600" /> Mode Belokan (Turn Mode)
          </label>
          <select
            value={settings.turnMode || 'smooth'}
            onChange={(e) => onChangeSettings({ turnMode: e.target.value as 'turnOnly' | 'smooth' })}
            className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-sky-500"
          >
            <option value="smooth">Smooth Curvature (Belokan Halus / Mulus)</option>
            <option value="turnOnly">Turn Only (Berhenti di Titik Belokan)</option>
          </select>
          <span className="text-[10px] text-slate-500 block mt-0.5">
            {settings.turnMode === 'turnOnly'
              ? 'Drone berhenti di sudut jalur lalu berputar (Sangat presisi)'
              : 'Drone belok melengkung mulus tanpa henti (Lebih cepat & hemat baterai)'}
          </span>
        </div>

        {/* Takeoff Security Height */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="text-[11px] font-semibold text-slate-700">Tinggi Lepas Landas Aman</label>
            <span className="text-emerald-700 font-bold">{settings.takeoffSecurityHeight || 20} m</span>
          </div>
          <input
            type="range"
            min={10}
            max={50}
            step={5}
            value={settings.takeoffSecurityHeight || 20}
            onChange={(e) => onChangeSettings({ takeoffSecurityHeight: Number(e.target.value) })}
            className="w-full accent-emerald-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
          />
        </div>
      </div>

      {/* 8. Tombol Hapus Area / Reset */}
      <button
        onClick={onClearBoundary}
        className="w-full flex items-center justify-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 py-2.5 rounded-xl font-bold transition cursor-pointer shadow-2xs"
      >
        <Trash2 className="w-4 h-4 text-red-600" />
        <span>Reset & Hapus Garis di Peta</span>
      </button>
    </div>
  );
}
