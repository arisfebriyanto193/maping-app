import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';
import { UserSession } from '@/types/drone';

const JWT_SECRET = process.env.JWT_SECRET || 'aris-drone-secret-key-2026-qbyte-secure';

export function signToken(user: UserSession): string {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}

export function verifyToken(token: string): UserSession | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as UserSession;
    return decoded;
  } catch {
    return null;
  }
}

export function getUserFromRequest(req: NextRequest): UserSession | null {
  // Check Authorization Bearer header
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const user = verifyToken(token);
    if (user) return user;
  }

  // Check cookie
  const cookieToken = req.cookies.get('drone_token')?.value;
  if (cookieToken) {
    const user = verifyToken(cookieToken);
    if (user) return user;
  }

  return null;
}
