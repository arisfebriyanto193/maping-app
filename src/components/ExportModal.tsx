'use client';

import React, { useState } from 'react';
import { X, Download, FileCode, FileText, Globe, Check, AlertCircle } from 'lucide-react';
import { Waypoint, DroneProfile, MissionSettings } from '@/types/drone';
import { generateDJIWPMLKMZ } from '@/lib/dji-wpml';
import { generateLitchiCSV } from '@/lib/litchi-csv';
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
  const [copied, setCopied] = useState(false);

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
        securityHeight: 25,
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${missionName}_DJI_WPML.kmz`;
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

  // 3. Download Standard KML
  const handleExportKML = () => {
    try {
      setDownloading('kml');
      const kmlContent = generateStandardKML(settings.title, waypoints);
      const blob = new Blob([kmlContent], { type: 'application/vnd.google-earth.kml+xml;charset=utf-8;' });
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

  // 4. Download GeoJSON
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

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-5 shadow-2xl relative text-slate-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg transition"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
          <Download className="w-5 h-5 text-sky-400" />
          Ekspor Misi Jalur Drone
        </h3>
        <p className="text-xs text-slate-400 mb-4">
          Pilih format file sesuai aplikasi remote / flight controller drone Anda.
        </p>

        {waypoints.length === 0 ? (
          <div className="bg-amber-950/50 border border-amber-800 text-amber-200 p-3 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
            <span>Belum ada jalur atau waypoint. Gambar area atau tambahkan titik di peta terlebih dahulu.</span>
          </div>
        ) : (
          <div className="space-y-2.5">
            {/* DJI WPML KMZ */}
            <button
              onClick={handleExportKMZ}
              disabled={downloading === 'kmz'}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 transition cursor-pointer text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold text-xs">
                  KMZ
                </div>
                <div>
                  <div className="font-semibold text-white text-xs group-hover:text-sky-300">
                    DJI WPML (.KMZ)
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Untuk DJI Mini 4 Pro, Mavic 3/Enterprise, Air 3, DJI Pilot 2
                  </div>
                </div>
              </div>
              <Download className="w-4 h-4 text-slate-400 group-hover:text-sky-400" />
            </button>

            {/* Litchi CSV */}
            <button
              onClick={handleExportLitchiCSV}
              disabled={downloading === 'csv'}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 transition cursor-pointer text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                  CSV
                </div>
                <div>
                  <div className="font-semibold text-white text-xs group-hover:text-emerald-300">
                    Litchi CSV (.CSV)
                  </div>
                  <div className="text-[10px] text-slate-400">
                    44 Kolom resmi untuk Litchi Mission Hub & Litchi App (Lito x1)
                  </div>
                </div>
              </div>
              <Download className="w-4 h-4 text-slate-400 group-hover:text-emerald-400" />
            </button>

            {/* Google Earth KML */}
            <button
              onClick={handleExportKML}
              disabled={downloading === 'kml'}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 transition cursor-pointer text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-xs">
                  KML
                </div>
                <div>
                  <div className="font-semibold text-white text-xs group-hover:text-indigo-300">
                    Google Earth 3D (.KML)
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Visualisasi lintasan 3D elevasi di Google Earth
                  </div>
                </div>
              </div>
              <Download className="w-4 h-4 text-slate-400 group-hover:text-indigo-400" />
            </button>

            {/* GeoJSON */}
            <button
              onClick={handleExportGeoJSON}
              disabled={downloading === 'geojson'}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 transition cursor-pointer text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold text-xs">
                  GIS
                </div>
                <div>
                  <div className="font-semibold text-white text-xs group-hover:text-purple-300">
                    GeoJSON Vector (.geojson)
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Untuk QGIS, ArcGIS, Mission Planner, atau Python GIS
                  </div>
                </div>
              </div>
              <Download className="w-4 h-4 text-slate-400 group-hover:text-purple-400" />
            </button>
          </div>
        )}

        <div className="mt-4 pt-3 border-t border-slate-800 flex justify-between items-center text-xs">
          <span className="text-slate-400">Total: {waypoints.length} titik waypoint</span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
