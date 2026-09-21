import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { cookies, headers } from 'next/headers';
import prisma from './prisma';
import { UserRole } from '@prisma/client';

export const SESSION_COOKIE_NAME = 'marketplace_session';

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('FATAL SECURITY ERROR: JWT_SECRET environment variable is required in production.');
    }
    return new TextEncoder().encode('dev-only-insecure-secret-never-use-in-prod');
  }
  return new TextEncoder().encode(secret);
}

const encodedSecret = getJwtSecret();

export interface SessionPayload {
  userId: string;
  email: string;
  name: string;
  role: UserRole;
  exp?: number;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSessionToken(payload: Omit<SessionPayload, 'exp'>): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(encodedSecret);
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, encodedSecret);
    return {
      userId: payload.userId as string,
      email: payload.email as string,
      name: payload.name as string,
      role: payload.role as UserRole,
      exp: payload.exp,
    };
  } catch {
    return null;
  }
}

export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function getSession(): Promise<SessionPayload | null> {
  try {
    const cookieStore = await cookies();
    const tokenFromCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (tokenFromCookie) {
      return verifySessionToken(tokenFromCookie);
    }
  } catch {
    // cookies() may throw in certain non-request contexts
  }

  try {
    const headerStore = await headers();
    const authHeader = headerStore.get('authorization') || headerStore.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7).trim();
      return verifySessionToken(token);
    }
  } catch {
    // headers() may throw if called outside request context
  }

  return null;
}

export async function getCurrentUser() {
  const session = await getSession();
  if (!session?.userId) return null;

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: { vendor: true },
    });
    return user;
  } catch (err) {
    console.error('Failed to get current user from database:', err);
    return null;
  }
}
