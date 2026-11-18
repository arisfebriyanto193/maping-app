'use client';

import React, { useState } from 'react';
import {
  X,
  Download,
  FileCode,
  FileText,
  Globe,
  Check,
  AlertCircle,
  BookOpen,
  Smartphone,
  Copy,
  ChevronRight,
  Sparkles,
  Usb,
} from 'lucide-react';
import { Waypoint, DroneProfile, MissionSettings } from '@/types/drone';
import { generateDJIWPMLKMZ } from '@/lib/dji-wpml';
import { generateLitchiCSV } from '@/lib/litchi-csv';
import { generatePotensicZip } from '@/lib/potensic-json';
import { generateStandardKML } from '@/lib/kml-exporter';
import { generateGeoJSON } from '@/lib/geojson-exporter';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  waypoints: Waypoint[];
  drone: DroneProfile;
  settings: MissionSettings;
  boundaryCoords?: [number, number][];
}

export default function ExportModal({
  isOpen,
  onClose,
  waypoints,
  drone,
  settings,
  boundaryCoords,
}: ExportModalProps) {
  const [downloading, setDownloading] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'formats' | 'usb' | 'guide'>('formats');
  const [deviceTab, setDeviceTab] = useState<'android' | 'ios' | 'rc1'>('android');
  const [copiedPath, setCopiedPath] = useState(false);

  if (!isOpen) return null;

  const missionName = settings.title.trim().replace(/\s+/g, '_') || 'Misi_Drone';

  // 1. Download DJI WPML (.KMZ)
  const handleExportKMZ = async () => {
    try {
      setDownloading('kmz');
      const blob = await generateDJIWPMLKMZ({
        missionTitle: settings.title,
        drone,
        waypoints,
        globalSpeed: settings.speed,
        securityHeight: settings.takeoffSecurityHeight || 20,
        finishAction: settings.finishAction,
        rcLostAction: settings.rcLostAction,
        turnMode: settings.turnMode || 'smooth',
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${missionName}_DJIFly.kmz`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('Gagal membuat file KMZ');
    } finally {
      setDownloading(null);
    }
  };

  // 2. Download Litchi CSV
  const handleExportLitchiCSV = () => {
    try {
      setDownloading('csv');
      const csvContent = generateLitchiCSV(waypoints);
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${missionName}_Litchi.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('Gagal membuat file CSV');
    } finally {
      setDownloading(null);
    }
  };

  // 3. Download Potensic JSON (ZIP)
  const handleExportPotensic = async () => {
    try {
      setDownloading('potensic');
      const blob = await generatePotensicZip(settings.title, waypoints, settings);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${missionName}_Potensic.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('Gagal membuat file Potensic');
    } finally {
      setDownloading(null);
    }
  };

  // 4. Download Standard KML
  const handleExportKML = () => {
    try {
      setDownloading('kml');
      const kmlContent = generateStandardKML(settings.title, waypoints);
      const blob = new Blob([kmlContent], {
        type: 'application/vnd.google-earth.kml+xml;charset=utf-8;',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${missionName}.kml`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('Gagal membuat file KML');
    } finally {
      setDownloading(null);
    }
  };

  // 5. Download GeoJSON
  const handleExportGeoJSON = () => {
    try {
      setDownloading('geojson');
      const geojson = generateGeoJSON(settings.title, waypoints, boundaryCoords);
      const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${missionName}.geojson`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('Gagal membuat file GeoJSON');
    } finally {
      setDownloading(null);
    }
  };

  const androidPath = 'Android/data/dji.go.v5/files/waypoint/';

  const handleCopyPath = () => {
    navigator.clipboard.writeText(androidPath);
    setCopiedPath(true);
    setTimeout(() => setCopiedPath(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg p-5 sm:p-6 shadow-2xl relative text-slate-800 max-h-[92vh] flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1 rounded-lg transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header & Tabs */}
        <div className="mb-4">
          <h3 className="text-base font-extrabold text-slate-900 mb-2.5 flex items-center gap-2">
            <Download className="w-5 h-5 text-sky-600" />
            Ekspor & Panduan Terbang DJI Fly
          </h3>

          <div className="flex border-b border-slate-200 gap-2 overflow-x-auto">
            <button
              onClick={() => setActiveTab('formats')}
              className={`pb-2 px-3 text-xs font-bold transition border-b-2 -mb-px cursor-pointer flex items-center gap-1.5 shrink-0 ${
                activeTab === 'formats'
                  ? 'border-sky-600 text-sky-700'
                  : 'border-transparent text-slate-400 hover:text-slate-700'
              }`}
            >
              <Download className="w-3.5 h-3.5" /> Pilihan Format File
            </button>
            <button
              onClick={() => setActiveTab('usb')}
              className={`pb-2 px-3 text-xs font-bold transition border-b-2 -mb-px cursor-pointer flex items-center gap-1.5 shrink-0 ${
                activeTab === 'usb'
                  ? 'border-sky-600 text-sky-700'
                  : 'border-transparent text-slate-400 hover:text-slate-700'
              }`}
            >
              <Usb className="w-3.5 h-3.5 text-emerald-600" /> Kabel USB Laptop (MTP)
              <span className="bg-emerald-100 text-emerald-800 text-[10px] px-1.5 py-0.2 rounded-full font-extrabold">
                Praktis
              </span>
            </button>
            <button
              onClick={() => setActiveTab('guide')}
              className={`pb-2 px-3 text-xs font-bold transition border-b-2 -mb-px cursor-pointer flex items-center gap-1.5 shrink-0 ${
                activeTab === 'guide'
                  ? 'border-sky-600 text-sky-700'
                  : 'border-transparent text-slate-400 hover:text-slate-700'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 text-amber-600" /> Panduan Import DJI Fly
              <span className="bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0.2 rounded-full font-extrabold">
                Penting
              </span>
            </button>
          </div>
        </div>

        {/* Tab 1: Format Downloads */}
        {activeTab === 'formats' && (
          <div className="overflow-y-auto space-y-2.5 pr-1 flex-1">
            {/* Quick Banner to Guide */}
            <div
              onClick={() => setActiveTab('guide')}
              className="bg-amber-50 hover:bg-amber-100/80 border border-amber-200/80 rounded-2xl p-2.5 flex items-center justify-between cursor-pointer transition"
            >
              <div className="flex items-center gap-2 text-xs text-amber-900 font-semibold">
                <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Baru pertama kali memasukkan KMZ ke DJI Fly? Lihat panduan 5 langkah</span>
              </div>
              <ChevronRight className="w-4 h-4 text-amber-600 shrink-0" />
            </div>

            {/* Turn Only Notice */}
            {settings.waypointPathType === 'turnOnly' && waypoints.length > 0 && (
              <div className="bg-sky-50 border border-sky-200/80 rounded-2xl p-2.5 text-xs text-sky-900 font-medium">
                <span className="font-bold text-sky-800 block mb-0.5">
                  ✈️ Mode Turn Only Aktif ({waypoints.length} Titik Belokan)
                </span>
                <span>
                  Jumlah titik dirampingkan agar DJI Fly berjalan lancar. Saat drone take off di lapangan, aktifkan fitur foto <strong>Timed Shot (Interval 2 detik)</strong> di DJI Fly sesuai video tutorial (18:43).
                </span>
              </div>
            )}

            {waypoints.length === 0 ? (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3.5 rounded-2xl text-xs flex items-center gap-2.5">
                <AlertCircle className="w-5 h-5 shrink-0 text-amber-600" />
                <span>Belum ada jalur atau waypoint. Buat titik atau area poligon di peta terlebih dahulu.</span>
              </div>
            ) : (
              <div className="space-y-2">
                {/* DJI Fly KMZ (Verified Native DJI Fly) */}
                <button
                  onClick={handleExportKMZ}
                  disabled={downloading === 'kmz'}
                  className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-sky-50/50 hover:bg-sky-50 border border-sky-200 hover:border-sky-400 transition cursor-pointer text-left group shadow-2xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-sky-600 text-white flex items-center justify-center font-extrabold text-xs shadow-xs">
                      KMZ
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 text-xs group-hover:text-sky-700 flex items-center gap-1.5">
                        <span>DJI Fly Waypoints (.KMZ)</span>
                        <span className="text-[9px] bg-emerald-100 text-emerald-700 font-extrabold px-1.5 py-0.5 rounded">
                          Asli DJI Fly (Anti-Crash)
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Mini 4 Pro, Mini 5 Pro, Air 3/3S, Mavic 3/4 Pro (Format WPML UAV)
                      </div>
                    </div>
                  </div>
                  <Download className="w-4 h-4 text-sky-600 group-hover:translate-y-0.5 transition" />
                </button>

                {/* Litchi CSV */}
                <button
                  onClick={handleExportLitchiCSV}
                  disabled={downloading === 'csv'}
                  className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 hover:bg-emerald-50/60 border border-slate-200 hover:border-emerald-300 transition cursor-pointer text-left group shadow-2xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-extrabold text-xs shadow-2xs">
                      CSV
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 text-xs group-hover:text-emerald-700">
                        Litchi CSV (.CSV)
                      </div>
                      <div className="text-[11px] text-slate-500">
                        44 Kolom resmi Litchi Mission Hub & Lito X1
                      </div>
                    </div>
                  </div>
                  <Download className="w-4 h-4 text-slate-400 group-hover:text-emerald-600" />
                </button>

                {/* Potensic Waypoints (AerialNav style) */}
                <button
                  onClick={handleExportPotensic}
                  disabled={downloading === 'potensic'}
                  className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 hover:bg-amber-50/60 border border-slate-200 hover:border-amber-300 transition cursor-pointer text-left group shadow-2xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-extrabold text-xs shadow-2xs">
                      POT
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 text-xs group-hover:text-amber-700">
                        Potensic Waypoint (.ZIP)
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Format Potensic Atom Series (global.json + mission.json)
                      </div>
                    </div>
                  </div>
                  <Download className="w-4 h-4 text-slate-400 group-hover:text-amber-600" />
                </button>

                {/* Google Earth KML */}
                <button
                  onClick={handleExportKML}
                  disabled={downloading === 'kml'}
                  className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 hover:bg-indigo-50/60 border border-slate-200 hover:border-indigo-300 transition cursor-pointer text-left group shadow-2xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-extrabold text-xs shadow-2xs">
                      KML
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 text-xs group-hover:text-indigo-700">
                        Google Earth 3D (.KML)
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Visualisasi lintasan 3D di Google Earth Pro
                      </div>
                    </div>
                  </div>
                  <Download className="w-4 h-4 text-slate-400 group-hover:text-indigo-600" />
                </button>

                {/* GeoJSON */}
                <button
                  onClick={handleExportGeoJSON}
                  disabled={downloading === 'geojson'}
                  className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 hover:bg-purple-50/60 border border-slate-200 hover:border-purple-300 transition cursor-pointer text-left group shadow-2xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-extrabold text-xs shadow-2xs">
                      GIS
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 text-xs group-hover:text-purple-700">
                        GeoJSON Vector (.geojson)
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Untuk QGIS, ArcGIS, dan analisis GIS geospasial
                      </div>
                    </div>
                  </div>
                  <Download className="w-4 h-4 text-slate-400 group-hover:text-purple-600" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: USB Cable Direct to Laptop (MTP Mode) */}
        {activeTab === 'usb' && (
          <div className="overflow-y-auto space-y-3 pr-1 flex-1 text-xs text-slate-700">
            {/* Highlight Banner */}
            <div className="bg-gradient-to-r from-emerald-500/10 via-sky-500/10 to-transparent border border-emerald-300 rounded-2xl p-3.5">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Usb className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-900 text-xs">
                    Import Cepat via Kabel USB Laptop (Mode MTP)
                  </h4>
                  <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                    Saat HP atau Remote DJI (DJI RC 2) disambungkan ke laptop via kabel USB, 
                    <strong> Google sama sekali tidak mengunci folder Android/data</strong>. Anda dapat langsung menimpa misi dummy dengan 4 langkah mudah:
                  </p>
                </div>
              </div>
            </div>

            {/* Actions Card: Download KMZ & Copy Path */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Download KMZ */}
              <button
                onClick={handleExportKMZ}
                disabled={downloading === 'kmz'}
                className="flex items-center justify-between p-3 rounded-2xl bg-sky-50 hover:bg-sky-100/70 border border-sky-200 transition cursor-pointer text-left shadow-2xs group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-sky-600 text-white flex items-center justify-center font-black text-[11px]">
                    KMZ
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 text-xs group-hover:text-sky-700">
                      1. Unduh File KMZ
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Format resmi WPML DJI Fly
                    </div>
                  </div>
                </div>
                <Download className="w-4 h-4 text-sky-600 group-hover:translate-y-0.5 transition" />
              </button>

              {/* Copy Path */}
              <button
                onClick={handleCopyPath}
                className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 hover:bg-slate-100/70 border border-slate-200 transition cursor-pointer text-left shadow-2xs group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-slate-700 text-white flex items-center justify-center">
                    <Copy className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 text-xs group-hover:text-slate-800">
                      2. Salin Path Folder
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono truncate max-w-[150px]">
                      Android/data/dji.go.v5...
                    </div>
                  </div>
                </div>
                {copiedPath ? (
                  <Check className="w-4 h-4 text-emerald-600" />
                ) : (
                  <Copy className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
                )}
              </button>
            </div>

            {/* Step by Step Guide */}
            <div className="space-y-2 pt-1">
              <div className="flex gap-2.5 items-start bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-extrabold flex items-center justify-center shrink-0 text-[11px]">
                  1
                </span>
                <div>
                  <h5 className="font-bold text-slate-900">Buat 1 Misi Dummy di DJI Fly</h5>
                  <p className="text-slate-500 mt-0.5 text-[11px]">
                    Buka DJI Fly pada HP/Remote, masuk ke menu <strong>Waypoint Flight</strong>, buat 2 titik sembarang lalu klik <strong>Simpan</strong> untuk memancing folder dummy.
                  </p>
                </div>
              </div>

              <div className="flex gap-2.5 items-start bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-extrabold flex items-center justify-center shrink-0 text-[11px]">
                  2
                </span>
                <div>
                  <h5 className="font-bold text-slate-900">Colokkan Kabel USB ke Laptop</h5>
                  <p className="text-slate-500 mt-0.5 text-[11px]">
                    Sambungkan HP / Remote DJI ke laptop dengan kabel USB-C. Pada layar HP/Remote, pilih mode <strong>&quot;Transfer File / MTP&quot;</strong>.
                  </p>
                </div>
              </div>

              <div className="flex gap-2.5 items-start bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-extrabold flex items-center justify-center shrink-0 text-[11px]">
                  3
                </span>
                <div>
                  <h5 className="font-bold text-slate-900">Buka Folder Misi di Windows Explorer / Finder</h5>
                  <p className="text-slate-500 mt-0.5 text-[11px]">
                    Buka File Explorer di laptop, masuk ke perangkat HP Anda lalu tuju alamat:
                  </p>
                  <div className="bg-white border border-slate-200 rounded-lg p-1.5 font-mono text-[10px] text-slate-800 mt-1 select-all break-all">
                    [Nama HP Anda] &gt; Internal Storage &gt; Android &gt; data &gt; dji.go.v5 &gt; files &gt; waypoint
                  </div>
                </div>
              </div>

              <div className="flex gap-2.5 items-start bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-extrabold flex items-center justify-center shrink-0 text-[11px]">
                  4
                </span>
                <div>
                  <h5 className="font-bold text-slate-900">Seret & Timpa File Dummy</h5>
                  <p className="text-slate-500 mt-0.5 text-[11px]">
                    Buka subfolder misi dummy terbaru (nama folder berupa UUID seperti <code>45B1A832-...</code>). Seret (drag & drop) file KMZ yang diunduh dari tombol di atas, lalu samakan namanya atau timpa (replace) file <code>.kmz</code> dummy di dalamnya.
                  </p>
                </div>
              </div>

              <div className="flex gap-2.5 items-start bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-extrabold flex items-center justify-center shrink-0 text-[11px]">
                  5
                </span>
                <div>
                  <h5 className="font-bold text-emerald-950">Buka DJI Fly & Terbang! 🚀</h5>
                  <p className="text-emerald-800 mt-0.5 text-[11px]">
                    Buka kembali aplikasi DJI Fly pada remote/HP Anda. Buka menu Waypoint, misi dummy Anda otomatis sudah berubah menjadi jalur pemetaan lengkap yang Anda buat di web!
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Step-by-Step Tutorial (From Video Muhammad Ardans) */}
        {activeTab === 'guide' && (
          <div className="overflow-y-auto space-y-3 pr-1 flex-1 text-xs text-slate-700">
            {/* Device Switcher */}
            <div className="flex gap-1.5 p-1 bg-slate-100 rounded-xl">
              <button
                onClick={() => setDeviceTab('android')}
                className={`flex-1 py-1.5 px-2 rounded-lg font-bold transition cursor-pointer text-center ${
                  deviceTab === 'android'
                    ? 'bg-white text-sky-700 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Android / DJI RC 2
              </button>
              <button
                onClick={() => setDeviceTab('ios')}
                className={`flex-1 py-1.5 px-2 rounded-lg font-bold transition cursor-pointer text-center ${
                  deviceTab === 'ios'
                    ? 'bg-white text-sky-700 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                iPhone / iPad (iOS)
              </button>
              <button
                onClick={() => setDeviceTab('rc1')}
                className={`flex-1 py-1.5 px-2 rounded-lg font-bold transition cursor-pointer text-center ${
                  deviceTab === 'rc1'
                    ? 'bg-white text-sky-700 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                DJI RC 1 (MicroSD)
              </button>
            </div>

            {/* Folder Path Copier */}
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                Lokasi Folder Misi DJI Fly:
              </span>
              <div className="flex items-center justify-between bg-white border border-slate-200 rounded-lg p-2 font-mono text-[11px] text-slate-800">
                <span className="truncate">
                  {deviceTab === 'android'
                    ? androidPath
                    : deviceTab === 'ios'
                    ? 'File App > DJI Fly > waypoint/'
                    : 'MicroSD Card > /dji.go.v5/files/waypoint/'}
                </span>
                <button
                  onClick={handleCopyPath}
                  className="flex items-center gap-1 text-[10px] text-sky-700 hover:text-sky-900 font-bold ml-2 shrink-0 cursor-pointer bg-sky-50 px-2 py-0.5 rounded"
                >
                  {copiedPath ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-600" /> Tersalin
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" /> Salin Path
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Steps (1 - 5) */}
            <div className="space-y-2.5">
              <div className="flex gap-2.5 items-start bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <span className="w-5 h-5 rounded-full bg-sky-600 text-white font-extrabold flex items-center justify-center shrink-0 text-[11px]">
                  1
                </span>
                <div>
                  <h4 className="font-bold text-slate-900">Buat File Dummy di DJI Fly</h4>
                  <p className="text-slate-500 mt-0.5">
                    Buka DJI Fly pada remote/HP. Masuk ke mode kamera &gt; klik ikon <strong>Waypoint</strong> di sisi kiri. Buat 2 titik sembarang, lalu klik <strong>Simpan & Keluar (Save & Exit)</strong>.
                  </p>
                </div>
              </div>

              <div className="flex gap-2.5 items-start bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <span className="w-5 h-5 rounded-full bg-sky-600 text-white font-extrabold flex items-center justify-center shrink-0 text-[11px]">
                  2
                </span>
                <div>
                  <h4 className="font-bold text-slate-900">Buka File Manager</h4>
                  <p className="text-slate-500 mt-0.5">
                    Gunakan File Manager bawaan HP / RC 2, atau sambungkan remote ke PC/laptop dengan kabel USB Type-C. Arahkan ke folder <code>Android/data/dji.go.v5/files/waypoint/</code>.
                  </p>
                </div>
              </div>

              <div className="flex gap-2.5 items-start bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <span className="w-5 h-5 rounded-full bg-sky-600 text-white font-extrabold flex items-center justify-center shrink-0 text-[11px]">
                  3
                </span>
                <div>
                  <h4 className="font-bold text-slate-900">Salin Nama File Acak Dummy</h4>
                  <p className="text-slate-500 mt-0.5">
                    Cari file dummy yang baru saja dibuat. DJI Fly memberi nama acak (misal: <code>1794899462732.kmz</code>). Salin atau catat nama file tersebut, lalu hapus file dummy itu.
                  </p>
                </div>
              </div>

              <div className="flex gap-2.5 items-start bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <span className="w-5 h-5 rounded-full bg-sky-600 text-white font-extrabold flex items-center justify-center shrink-0 text-[11px]">
                  4
                </span>
                <div>
                  <h4 className="font-bold text-slate-900">Ganti Nama (Rename) File KMZ dari Web</h4>
                  <p className="text-slate-500 mt-0.5">
                    Ambil file <code>.kmz</code> hasil unduh dari website ini, ubah namanya menjadi persis seperti nama dummy tadi (contoh: <code>1794899462732.kmz</code>). Masukkan ke dalam folder <code>waypoint/</code>.
                  </p>
                </div>
              </div>

              <div className="flex gap-2.5 items-start bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-extrabold flex items-center justify-center shrink-0 text-[11px]">
                  5
                </span>
                <div>
                  <h4 className="font-bold text-emerald-950">Buka Kembali DJI Fly & Siap Terbang!</h4>
                  <p className="text-emerald-800 mt-0.5">
                    Buka DJI Fly &gt; Menu Waypoint. Misi jalur pemetaan otomatis termuat secara mulus dengan jalur fotogrametri rapi. Klik <strong>GO / START</strong> untuk memulai terbang otomatis!
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="mt-3.5 pt-3 border-t border-slate-200 flex justify-between items-center text-xs">
          <span className="text-slate-500 font-bold">Total: {waypoints.length} waypoint</span>
          <div className="flex gap-2">
            {activeTab === 'guide' && (
              <button
                onClick={() => setActiveTab('formats')}
                className="px-3.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold transition cursor-pointer shadow-2xs"
              >
                Unduh File KMZ
              </button>
            )}
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
