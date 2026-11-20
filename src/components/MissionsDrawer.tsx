'use client';

import React, { useEffect, useState } from 'react';
import { X, FolderOpen, Trash2, Calendar, Plane, MapPin, AlertCircle, RefreshCw, Share2, Check, ExternalLink } from 'lucide-react';
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
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const handleCopyShareLink = (token?: string | null) => {
    if (!token) return;
    const shareUrl = `${window.location.origin}/maping/share/${token}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopiedToken(token);
      setTimeout(() => setCopiedToken(null), 2500);
    });
  };

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
    if (!id || !confirm('Yakin ingin menghapus misi ini dari database server?')) return;
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
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end">
      <div className="bg-white border-l border-slate-200 w-full max-w-md h-full flex flex-col p-5 shadow-2xl text-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-200">
          <div className="flex items-center gap-2 font-black text-slate-900 text-base">
            <FolderOpen className="w-5 h-5 text-amber-500" />
            <span>Misi Tersimpan di Server</span>
          </div>
          <div className="flex items-center gap-2">
            {user && (
              <button
                onClick={fetchMissions}
                className="p-1.5 text-slate-400 hover:text-slate-700 transition"
                title="Refresh"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto py-4 space-y-3">
          {!user ? (
            <div className="text-center py-10 px-4">
              <AlertCircle className="w-10 h-10 text-sky-600 mx-auto mb-3" />
              <h4 className="text-sm font-bold text-slate-800 mb-1">Perlu Login</h4>
              <p className="text-xs text-slate-500 mb-4">
                Masuk dengan akun Anda untuk melihat dan memuat rencana misi pemetaan drone yang tersimpan.
              </p>
              <button
                onClick={() => {
                  onClose();
                  onOpenAuthModal();
                }}
                className="bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs px-4 py-2 rounded-xl transition shadow-sm"
              >
                Masuk Sekarang
              </button>
            </div>
          ) : loading ? (
            <div className="text-center py-10 text-xs text-slate-500 font-medium">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-sky-600" />
              Memuat daftar misi dari database...
            </div>
          ) : errorMsg ? (
            <div className="bg-red-50 border border-red-200 text-red-800 text-xs p-3 rounded-xl">
              {errorMsg}
            </div>
          ) : missions.length === 0 ? (
            <div className="text-center py-10 text-xs text-slate-400 font-medium">
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
                  className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 hover:border-sky-400 transition group shadow-2xs"
                >
                  <div className="flex items-start justify-between mb-1.5">
                    <h4 className="font-extrabold text-slate-900 text-xs group-hover:text-sky-700">
                      {m.title}
                    </h4>
                    <div className="flex items-center gap-1">
                      {m.geotiff_url && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-200">
                          🗺️ GeoTIFF
                        </span>
                      )}
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-sky-100 text-sky-700">
                        {m.mission_type}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-600 mb-3 font-medium">
                    <span className="flex items-center gap-1">
                      <Plane className="w-3 h-3 text-slate-400" /> {m.drone_model}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-400" /> {wpCount} WP ({m.altitude}m)
                    </span>
                    {m.created_at && (
                      <span className="flex items-center gap-1 text-[10px] text-slate-400">
                        <Calendar className="w-2.5 h-2.5" />
                        {new Date(m.created_at).toLocaleDateString('id-ID')}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          onLoadMission(m);
                          onClose();
                        }}
                        className="bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs px-3 py-1.5 rounded-xl transition cursor-pointer shadow-2xs"
                      >
                        Buka Misi
                      </button>
                      {m.share_token && (
                        <button
                          onClick={() => handleCopyShareLink(m.share_token)}
                          className="flex items-center gap-1 text-xs font-bold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 px-2 py-1.5 rounded-xl transition cursor-pointer"
                          title="Salin tautan publik untuk dibagikan"
                        >
                          {copiedToken === m.share_token ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span className="text-emerald-700 text-[11px]">Tersalin!</span>
                            </>
                          ) : (
                            <>
                              <Share2 className="w-3 h-3 text-sky-600" />
                              <span className="text-[11px]">Share</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {m.share_token && (
                        <a
                          href={`/maping/share/${m.share_token}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 text-slate-400 hover:text-sky-600 rounded-lg transition"
                          title="Buka Halaman Share di Tab Baru"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                      <button
                        onClick={() => handleDelete(m.id)}
                        className="text-slate-400 hover:text-red-600 p-1.5 rounded-lg transition cursor-pointer"
                        title="Hapus"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
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
