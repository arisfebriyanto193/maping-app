'use client';

import React, { useEffect, useState } from 'react';
import { X, FolderOpen, Trash2, Calendar, Plane, MapPin, AlertCircle, RefreshCw } from 'lucide-react';
import { DroneMissionRecord, UserSession } from '@/types/drone';

interface MissionsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserSession | null;
  onLoadMission: (mission: DroneMissionRecord) => void;
  onOpenAuthModal: () => void;
}

export default function MissionsDrawer({
  isOpen,
  onClose,
  user,
  onLoadMission,
  onOpenAuthModal,
}: MissionsDrawerProps) {
  const [missions, setMissions] = useState<DroneMissionRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchMissions = async () => {
    if (!user) return;
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/maping/api/missions');
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Gagal memuat misi');
      }
      setMissions(data.data || []);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && user) {
      fetchMissions();
    }
  }, [isOpen, user]);

  const handleDelete = async (id?: number) => {
    if (!id || !confirm('Yakin ingin menghapus misi ini dari server?')) return;
    try {
      const res = await fetch(`/maping/api/missions/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Gagal menghapus');
      }
      setMissions((prev) => prev.filter((m) => m.id !== id));
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex justify-end">
      <div className="bg-slate-900 border-l border-slate-800 w-full max-w-md h-full flex flex-col p-5 shadow-2xl text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2 font-bold text-white text-base">
            <FolderOpen className="w-5 h-5 text-amber-400" />
            <span>Daftar Misi di Server</span>
          </div>
          <div className="flex items-center gap-2">
            {user && (
              <button
                onClick={fetchMissions}
                className="p-1.5 text-slate-400 hover:text-white transition"
                title="Refresh"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto py-4 space-y-3">
          {!user ? (
            <div className="text-center py-10 px-4">
              <AlertCircle className="w-10 h-10 text-sky-400 mx-auto mb-3" />
              <h4 className="text-sm font-semibold text-white mb-1">Perlu Login</h4>
              <p className="text-xs text-slate-400 mb-4">
                Silakan masuk dengan akun Anda untuk melihat dan memuat misi pemetaan yang tersimpan di database server.
              </p>
              <button
                onClick={() => {
                  onClose();
                  onOpenAuthModal();
                }}
                className="bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs px-4 py-2 rounded-lg transition"
              >
                Masuk Sekarang
              </button>
            </div>
          ) : loading ? (
            <div className="text-center py-10 text-xs text-slate-400">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-sky-400" />
              Memuat daftar misi dari database...
            </div>
          ) : errorMsg ? (
            <div className="bg-red-950/60 border border-red-800 text-red-300 text-xs p-3 rounded-lg">
              {errorMsg}
            </div>
          ) : missions.length === 0 ? (
            <div className="text-center py-10 text-xs text-slate-400">
              Belum ada misi tersimpan. Buat jalur mapping baru dan klik tombol &quot;Simpan&quot;.
            </div>
          ) : (
            missions.map((m) => {
              const wpCount = Array.isArray(m.waypoints_json)
                ? m.waypoints_json.length
                : typeof m.waypoints_json === 'string'
                ? JSON.parse(m.waypoints_json).length
                : 0;

              return (
                <div
                  key={m.id}
                  className="bg-slate-800/80 border border-slate-700/70 rounded-xl p-3.5 hover:border-sky-500/60 transition group"
                >
                  <div className="flex items-start justify-between mb-1.5">
                    <h4 className="font-semibold text-white text-xs group-hover:text-sky-300">
                      {m.title}
                    </h4>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-sky-500/20 text-sky-400">
                      {m.mission_type}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400 mb-3">
                    <span className="flex items-center gap-1">
                      <Plane className="w-3 h-3 text-slate-400" /> {m.drone_model}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-400" /> {wpCount} WP ({m.altitude}m)
                    </span>
                    {m.created_at && (
                      <span className="flex items-center gap-1 text-[10px] text-slate-500">
                        <Calendar className="w-2.5 h-2.5" />
                        {new Date(m.created_at).toLocaleDateString('id-ID')}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-700/60">
                    <button
                      onClick={() => {
                        onLoadMission(m);
                        onClose();
                      }}
                      className="bg-sky-600 hover:bg-sky-500 text-white font-medium text-xs px-3 py-1 rounded-lg transition cursor-pointer"
                    >
                      Buka Misi
                    </button>
                    <button
                      onClick={() => handleDelete(m.id)}
                      className="text-slate-400 hover:text-red-400 p-1 rounded transition cursor-pointer"
                      title="Hapus"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
