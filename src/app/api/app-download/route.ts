import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  const filePath = path.join(process.cwd(), 'public', 'dji-waypoint-injector.apk');

  if (fs.existsSync(filePath)) {
    const fileBuffer = fs.readFileSync(filePath);
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.android.package-archive',
        'Content-Disposition': 'attachment; filename="dji-waypoint-injector.apk"',
        'Content-Length': fileBuffer.length.toString(),
      },
    });
  }

  // Fallback to GitHub Release download
  return NextResponse.redirect(
    'https://github.com/arisfebriyanto193/maping-app/releases/download/v1.0.0/dji-waypoint-injector.apk',
    302
  );
}
