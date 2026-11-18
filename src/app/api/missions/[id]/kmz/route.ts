import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { generateDJIWPMLKMZ } from '@/lib/dji-wpml';
import { DRONE_PRESETS } from '@/lib/drone-presets';
import { Waypoint } from '@/types/drone';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Harus login terlebih dahulu' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const [rows]: any = await pool.execute(
      `SELECT * FROM drone_missions WHERE id = ? AND user_id = ? LIMIT 1`,
      [id, user.id]
    );

    if (!rows || rows.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Misi tidak ditemukan' },
        { status: 404 }
      );
    }

    const mission = rows[0];

    // Parse waypoints_json
    let waypoints: Waypoint[] = [];
    if (typeof mission.waypoints_json === 'string') {
      try {
        waypoints = JSON.parse(mission.waypoints_json);
      } catch {
        waypoints = [];
      }
    } else if (Array.isArray(mission.waypoints_json)) {
      waypoints = mission.waypoints_json;
    }

    if (!waypoints || waypoints.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Misi ini tidak memiliki data waypoint' },
        { status: 400 }
      );
    }

    // Match drone profile
    const drone =
      DRONE_PRESETS.find(
        (d) =>
          d.name.toLowerCase() === (mission.drone_model || '').toLowerCase() ||
          d.id.toLowerCase() === (mission.drone_model || '').toLowerCase()
      ) || DRONE_PRESETS[0];

    // Generate KMZ blob using verified native DJI Fly schema
    const kmzBlob = await generateDJIWPMLKMZ({
      missionTitle: mission.title || 'Misi_DJI',
      drone,
      waypoints,
      globalSpeed: mission.speed || 5,
      securityHeight: 20,
      finishAction: 'goHome',
      rcLostAction: 'goContinue',
      turnMode: 'smooth',
    });

    const arrayBuffer = await kmzBlob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const safeTitle = (mission.title || 'misi')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .replace(/_+/g, '_');
    const fileName = `${safeTitle}_DJIFly.kmz`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.google-earth.kmz',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': buffer.length.toString(),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: 'Gagal men-generate file KMZ: ' + error.message },
      { status: 500 }
    );
  }
}
