import React from 'react';
import { Metadata } from 'next';
import pool from '@/lib/db';
import { DroneMissionRecord } from '@/types/drone';
import ShareClientContainer from '@/components/ShareClientContainer';

interface SharePageProps {
  params: Promise<{ token: string }>;
}

async function getMissionData(token: string): Promise<(DroneMissionRecord & { creator_username?: string }) | null> {
  try {
    const [rows]: any = await pool.execute(
      `SELECT m.id, m.title, m.description, m.drone_model, m.mission_type,
              m.altitude, m.speed, m.overlap_front, m.overlap_side, m.grid_angle, m.gimbal_pitch,
              m.boundary_geojson, m.waypoints_json, m.stats_json,
              m.geotiff_url, m.geotiff_filename, m.geotiff_metadata,
              m.share_token, m.is_public, m.created_at, m.updated_at,
              u.username as creator_username
       FROM drone_missions m
       LEFT JOIN users u ON m.user_id = u.id
       WHERE m.share_token = ? AND m.is_public = 1
       LIMIT 1`,
      [token]
    );

    if (!rows || rows.length === 0) return null;

    const mission = rows[0];

    // Safely parse JSON strings
    if (mission.boundary_geojson && typeof mission.boundary_geojson === 'string') {
      try { mission.boundary_geojson = JSON.parse(mission.boundary_geojson); } catch (_) {}
    }
    if (mission.waypoints_json && typeof mission.waypoints_json === 'string') {
      try { mission.waypoints_json = JSON.parse(mission.waypoints_json); } catch (_) {}
    }
    if (mission.stats_json && typeof mission.stats_json === 'string') {
      try { mission.stats_json = JSON.parse(mission.stats_json); } catch (_) {}
    }
    if (mission.geotiff_metadata && typeof mission.geotiff_metadata === 'string') {
      try { mission.geotiff_metadata = JSON.parse(mission.geotiff_metadata); } catch (_) {}
    }

    return mission;
  } catch (err) {
    console.error('Error in getMissionData:', err);
    return null;
  }
}

export async function generateMetadata({ params }: SharePageProps): Promise<Metadata> {
  const { token } = await params;
  const mission = await getMissionData(token);

  if (!mission) {
    return {
      title: 'Peta Drone Tidak Ditemukan - AerialNav',
      description: 'Proyek peta drone tidak ditemukan atau sudah tidak tersedia.',
    };
  }

  return {
    title: `${mission.title} - Peta & Rute Drone | AerialNav`,
    description: `Lihat rute penerbangan drone & overlay peta ortofoto untuk proyek ${mission.title}.`,
    openGraph: {
      title: `${mission.title} - AerialNav Drone Mapping`,
      description: `Rute penerbangan ${mission.drone_model} • ${mission.altitude}m • ${(mission.stats_json?.areaHectares || 0).toFixed(2)} Ha`,
      type: 'website',
    },
  };
}

export default async function SharePage({ params }: SharePageProps) {
  const { token } = await params;
  const mission = await getMissionData(token);

  if (!mission) {
    return (
      <div className="w-screen h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-6 text-center">
        <div className="w-16 h-16 rounded-3xl bg-red-500/20 text-red-400 border border-red-500/40 flex items-center justify-center text-3xl mb-4 shadow-xl">
          ⚠️
        </div>
        <h1 className="text-xl sm:text-2xl font-black mb-2">Proyek Peta Tidak Ditemukan</h1>
        <p className="text-slate-400 text-sm max-w-md mb-6 leading-relaxed">
          Link yang Anda buka tidak valid atau pemilik proyek telah mengubah status proyek menjadi privat.
        </p>
        <a
          href="/maping"
          className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs transition shadow-lg"
        >
          Buka AerialNav Drone Mapping
        </a>
      </div>
    );
  }

  return <ShareClientContainer mission={mission} />;
}
