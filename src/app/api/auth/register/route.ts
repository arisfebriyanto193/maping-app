import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import bcrypt from 'bcryptjs';
import { signToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { username, email, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json(
        { success: false, message: 'Username dan password wajib diisi' },
        { status: 400 }
      );
    }

    if (username.length < 3) {
      return NextResponse.json(
        { success: false, message: 'Username minimal 3 karakter' },
        { status: 400 }
      );
    }

    if (password.length < 4) {
      return NextResponse.json(
        { success: false, message: 'Password minimal 4 karakter' },
        { status: 400 }
      );
    }

    // Check existing username or email
    const [existing]: any = await pool.execute(
      'SELECT id FROM users WHERE username = ? OR (email IS NOT NULL AND email = ?) LIMIT 1',
      [username, email || '']
    );

    if (existing && existing.length > 0) {
      return NextResponse.json(
        { success: false, message: 'Username atau email sudah digunakan' },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const [result]: any = await pool.execute(
      'INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)',
      [username, email || null, passwordHash, 'user']
    );

    const userSession = {
      id: result.insertId,
      username,
      email: email || null,
      role: 'user',
    };

    const token = signToken(userSession);

    const response = NextResponse.json({
      success: true,
      message: 'Registrasi berhasil',
      user: userSession,
      token,
    });

    response.cookies.set('drone_token', token, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60,
    });

    return response;
  } catch (error: any) {
    console.error('Register error:', error);
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan server: ' + error.message },
      { status: 500 }
    );
  }
}
