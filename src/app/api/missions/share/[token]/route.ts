import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    if (!token) {
      return NextResponse.json({ success: false, message: 'Token tidak valid' }, { status: 400 });
    }

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

    if (!rows || rows.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Proyek peta tidak ditemukan atau bersifat privat' },
        { status: 404 }
      );
    }

    const mission = rows[0];

    // Parse JSON fields
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

    return NextResponse.json({ success: true, data: mission });
  } catch (error: any) {
    console.error('Fetch public shared mission error:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal mengambil data proyek: ' + error.message },
      { status: 500 }
    );
  }
}
