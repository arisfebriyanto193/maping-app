import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getUserFromRequest } from '@/lib/auth';

export const config = {
  api: {
    bodyParser: false,
  },
};

export async function POST(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ success: false, message: 'Harus login terlebih dahulu' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ success: false, message: 'File GeoTIFF tidak ditemukan' }, { status: 400 });
    }

    const fileName = file.name;
    const ext = path.extname(fileName).toLowerCase();

    if (ext !== '.tif' && ext !== '.tiff') {
      return NextResponse.json(
        { success: false, message: 'Format file harus berupa GeoTIFF (.tif atau .tiff)' },
        { status: 400 }
      );
    }

    // Limit file size to 150MB if needed, or adjust
    const MAX_SIZE = 150 * 1024 * 1024; // 150MB
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { success: false, message: 'Ukuran file GeoTIFF maksimal 150MB' },
        { status: 400 }
      );
    }

    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'geotiff');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const safeBaseName = path
      .basename(fileName, ext)
      .replace(/[^a-zA-Z0-9_\-]/g, '_')
      .substring(0, 50);
    const uniqueFileName = `${Date.now()}_${safeBaseName}${ext}`;
    const targetFilePath = path.join(uploadDir, uniqueFileName);

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(targetFilePath, buffer);

    const publicUrl = `/maping/uploads/geotiff/${uniqueFileName}`;

    return NextResponse.json({
      success: true,
      message: 'GeoTIFF berhasil diupload',
      data: {
        url: publicUrl,
        filename: fileName,
        size: file.size,
      },
    });
  } catch (error: any) {
    console.error('Upload GeoTIFF error:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal mengupload GeoTIFF: ' + error.message },
      { status: 500 }
    );
  }
}
