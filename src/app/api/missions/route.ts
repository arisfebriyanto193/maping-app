import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import pool from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ success: false, message: 'Harus login terlebih dahulu' }, { status: 401 });
    }

    const [rows]: any = await pool.execute(
      `SELECT id, user_id, title, description, drone_model, mission_type, 
              altitude, speed, overlap_front, overlap_side, grid_angle, gimbal_pitch,
              boundary_geojson, waypoints_json, stats_json, 
              geotiff_url, geotiff_filename, geotiff_metadata, share_token, is_public,
              created_at, updated_at
       FROM drone_missions 
       WHERE user_id = ? 
       ORDER BY updated_at DESC`,
      [user.id]
    );

    return NextResponse.json({ success: true, data: rows });
  } catch (error: any) {
    console.error('Fetch missions error:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal mengambil data misi: ' + error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ success: false, message: 'Harus login terlebih dahulu' }, { status: 401 });
    }

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
      is_public = 1,
    } = body;

    if (!title || !waypoints_json) {
      return NextResponse.json({ success: false, message: 'Judul misi dan waypoints wajib diisi' }, { status: 400 });
    }

    const share_token = crypto.randomBytes(16).toString('hex');

    const [result]: any = await pool.execute(
      `INSERT INTO drone_missions (
        user_id, title, description, drone_model, mission_type,
        altitude, speed, overlap_front, overlap_side, grid_angle, gimbal_pitch,
        boundary_geojson, waypoints_json, stats_json,
        geotiff_url, geotiff_filename, geotiff_metadata, share_token, is_public
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        user.id,
        title,
        description || '',
        drone_model || 'DJI Mini 4 Pro',
        mission_type || 'grid',
        altitude || 60,
        speed || 6,
        overlap_front || 75,
        overlap_side || 65,
        grid_angle || 0,
        gimbal_pitch ?? -90,
        boundary_geojson ? JSON.stringify(boundary_geojson) : null,
        JSON.stringify(waypoints_json),
        stats_json ? JSON.stringify(stats_json) : null,
        geotiff_url || null,
        geotiff_filename || null,
        geotiff_metadata ? JSON.stringify(geotiff_metadata) : null,
        share_token,
        is_public ? 1 : 0,
      ]
    );

    return NextResponse.json({
      success: true,
      message: 'Misi berhasil disimpan ke server',
      id: result.insertId,
      share_token,
    });
  } catch (error: any) {
    console.error('Save mission error:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal menyimpan misi: ' + error.message },
      { status: 500 }
    );
  }
}
