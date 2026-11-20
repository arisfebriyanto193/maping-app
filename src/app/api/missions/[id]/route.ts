import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import pool from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ success: false, message: 'Harus login terlebih dahulu' }, { status: 401 });
    }

    const { id } = await params;
    const [rows]: any = await pool.execute(
      `SELECT * FROM drone_missions WHERE id = ? AND user_id = ? LIMIT 1`,
      [id, user.id]
    );

    if (!rows || rows.length === 0) {
      return NextResponse.json({ success: false, message: 'Misi tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: rows[0] });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: 'Gagal mengambil detail misi: ' + error.message },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ success: false, message: 'Harus login terlebih dahulu' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const {
      title,
      description,
      drone_model,
      mission_type,
      altitude,
      speed,
      overlap_front,
      overlap_side,
      grid_angle,
      gimbal_pitch,
      boundary_geojson,
      waypoints_json,
      stats_json,
      geotiff_url,
      geotiff_filename,
      geotiff_metadata,
      is_public,
    } = body;

    // Check if share_token exists, if not generate one
    const [existing]: any = await pool.execute(
      'SELECT share_token FROM drone_missions WHERE id = ? AND user_id = ?',
      [id, user.id]
    );

    let token = existing?.[0]?.share_token;
    if (!token) {
      token = crypto.randomBytes(16).toString('hex');
    }

    await pool.execute(
      `UPDATE drone_missions SET
        title = ?, description = ?, drone_model = ?, mission_type = ?,
        altitude = ?, speed = ?, overlap_front = ?, overlap_side = ?,
        grid_angle = ?, gimbal_pitch = ?, boundary_geojson = ?,
        waypoints_json = ?, stats_json = ?,
        geotiff_url = ?, geotiff_filename = ?, geotiff_metadata = ?,
        share_token = ?, is_public = ?
       WHERE id = ? AND user_id = ?`,
      [
        title,
        description || '',
        drone_model,
        mission_type,
        altitude,
        speed,
        overlap_front,
        overlap_side,
        grid_angle,
        gimbal_pitch,
        boundary_geojson ? JSON.stringify(boundary_geojson) : null,
        JSON.stringify(waypoints_json),
        stats_json ? JSON.stringify(stats_json) : null,
        geotiff_url !== undefined ? geotiff_url : null,
        geotiff_filename !== undefined ? geotiff_filename : null,
        geotiff_metadata ? JSON.stringify(geotiff_metadata) : null,
        token,
        is_public !== undefined ? (is_public ? 1 : 0) : 1,
        id,
        user.id,
      ]
    );

    return NextResponse.json({
      success: true,
      message: 'Misi berhasil diperbarui',
      share_token: token,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: 'Gagal memperbarui misi: ' + error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ success: false, message: 'Harus login terlebih dahulu' }, { status: 401 });
    }

    const { id } = await params;
    await pool.execute('DELETE FROM drone_missions WHERE id = ? AND user_id = ?', [id, user.id]);

    return NextResponse.json({ success: true, message: 'Misi berhasil dihapus' });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: 'Gagal menghapus misi: ' + error.message },
      { status: 500 }
    );
  }
}
