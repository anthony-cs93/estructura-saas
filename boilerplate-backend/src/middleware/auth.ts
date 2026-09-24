import type { CookieOptions, Request, RequestHandler, Response } from 'express';
import { SignJWT, jwtVerify } from 'jose';
import { env } from '../config/env.js';
import { getDb } from '../db/client.js';
import { unauthorized, forbidden } from '../lib/errors.js';

export interface SessionUser {
  id: string;
  email: string;
  role: 'user' | 'admin';
}

const secret = (): Uint8Array => new TextEncoder().encode(env.jwtSecret);

export async function signSession(user: SessionUser): Promise<string> {
  return new SignJWT({ id: user.id, email: user.email, role: user.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${env.sessionDays}d`)
    .sign(secret());
}

export async function verifySession(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    if (typeof payload.id !== 'string' || !payload.id) return null;
    return {
      id: payload.id,
      email: typeof payload.email === 'string' ? payload.email : '',
      role: payload.role === 'admin' ? 'admin' : 'user',
    };
  } catch {
    return null;
  }
}

export function getSessionToken(req: Request): string | null {
  const cookies = (req as Request & { cookies?: Record<string, string> }).cookies;
  if (cookies?.[env.cookieName]) return cookies[env.cookieName];
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7).trim();
  return null;
}

function baseCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: env.isProduction,
    // En producción frontend y backend suelen ser orígenes distintos:
    // la cookie necesita SameSite=None; Secure para viajar cross-site.
    sameSite: env.isProduction ? 'none' : 'lax',
    path: '/',
  };
}

export function setSessionCookie(res: Response, token: string): void {
  res.cookie(env.cookieName, token, {
    ...baseCookieOptions(),
    maxAge: env.sessionDays * 24 * 60 * 60 * 1000,
  });
}

export function clearSessionCookie(res: Response): void {
  // Debe coincidir con las opciones de setSessionCookie para poder borrarla.
  res.clearCookie(env.cookieName, baseCookieOptions());
}

export const requireAuth: RequestHandler = async (req, res, next) => {
  try {
    const token = getSessionToken(req);
    if (!token) throw unauthorized();
    const session = await verifySession(token);
    if (!session) throw unauthorized('Sesión inválida');

    const result = await getDb().execute({
      sql: 'SELECT active FROM users WHERE id = ?',
      args: [session.id],
    });
    if (result.rows.length === 0) throw unauthorized('Sesión inválida');
    if (Number(result.rows[0].active ?? 1) === 0) throw forbidden('Cuenta desactivada');

    req.user = session;
    next();
  } catch (err) {
    next(err);
  }
};
