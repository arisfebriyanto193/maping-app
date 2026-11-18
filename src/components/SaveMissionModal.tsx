'use client';

import React, { useState } from 'react';
import { X, Save, Database, Download, AlertCircle, Check } from 'lucide-react';
import { UserSession, DroneMissionRecord, Waypoint, MissionSettings, MissionStats } from '@/types/drone';

interface SaveMissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserSession | null;
  onOpenAuthModal: () => void;
  waypoints: Waypoint[];
  boundaryCoords: [number, number][];
  settings: MissionSettings;
  stats: MissionStats;
  onSavedSuccess?: () => void;
}

export default function SaveMissionModal({
  isOpen,
  onClose,
  user,
  onOpenAuthModal,
  waypoints,
  boundaryCoords,
  settings,
  stats,
  onSavedSuccess,
}: SaveMissionModalProps) {
  const [title, setTitle] = useState(settings.title || 'Misi Pemetaan Drone');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSaveToServer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onOpenAuthModal();
      return;
    }

    if (waypoints.length === 0) {
      setErrorMsg('Belum ada jalur atau waypoint untuk disimpan.');
      return;
    }

    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const payload: Partial<DroneMissionRecord> = {
        title: title.trim() || 'Misi Pemetaan',
        description,
        drone_model: settings.droneModel,
        mission_type: settings.missionType,
        altitude: settings.altitude,
        speed: settings.speed,
        overlap_front: settings.overlapFront,
        overlap_side: settings.overlapSide,
        grid_angle: settings.gridAngle,
        gimbal_pitch: settings.gimbalPitch,
        boundary_geojson: boundaryCoords.length >= 3 ? boundaryCoords : undefined,
        waypoints_json: waypoints,
        stats_json: stats,
      };

      const res = await fetch('/maping/api/missions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Gagal menyimpan ke server');
      }

      setSuccessMsg('Misi berhasil disimpan ke database server!');
      if (onSavedSuccess) onSavedSuccess();
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadOfflineJSON = () => {
    const data = {
      title,
      description,
      settings,
      boundaryCoords,
      waypoints,
      stats,
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/\s+/g, '_')}_backup.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md p-6 shadow-2xl relative text-slate-800">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1 rounded-lg transition"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-base font-extrabold text-slate-900 mb-1 flex items-center gap-2">
          <Save className="w-5 h-5 text-emerald-600" />
          Simpan Rencana Misi
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          Simpan jalur mapping ke server database agar dapat dibuka kembali kapan saja dari HP atau PC.
        </p>

        {successMsg && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs p-3 rounded-2xl mb-4 flex items-center gap-2 font-medium">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="bg-red-50 border border-red-200 text-red-800 text-xs p-3 rounded-2xl mb-4 flex items-center gap-2 font-medium">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSaveToServer} className="space-y-3.5">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Judul Misi</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Contoh: Pemetaan Kebun Blok A"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Catatan / Deskripsi (Opsional)</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Catatan tambahan misi penerbangan..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 resize-none"
            />
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs space-y-1.5 text-slate-700 shadow-2xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Drone:</span>
              <span className="font-bold text-slate-900">{settings.droneModel}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Tipe Misi:</span>
              <span className="font-extrabold text-sky-700 uppercase">{settings.missionType}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Ketinggian / Speed:</span>
              <span className="font-bold text-slate-900">
                {settings.altitude}m / {settings.speed}m/s
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Jumlah Waypoint:</span>
              <span className="font-extrabold text-emerald-700">{waypoints.length} titik</span>
            </div>
          </div>

          {user ? (
            <button
              type="submit"
              disabled={saving}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-xl text-xs transition shadow-md cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Database className="w-4 h-4" />
              <span>{saving ? 'Menyimpan...' : 'Simpan ke Database Server'}</span>
            </button>
          ) : (
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAuthModal();
                }}
                className="w-full bg-sky-600 hover:bg-sky-500 text-white font-bold py-2.5 rounded-xl text-xs transition shadow-md cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>Login untuk Simpan ke Server</span>
              </button>
            </div>
          )}

          <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
            <button
              type="button"
              onClick={handleDownloadOfflineJSON}
              className="text-xs text-slate-500 hover:text-sky-700 font-semibold flex items-center gap-1 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" /> Unduh Cadangan File (.json)
            </button>

            <button
              type="button"
              onClick={onClose}
              className="text-xs text-slate-500 hover:text-slate-800 font-bold px-2 py-1 rounded"
            >
              Batal
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
