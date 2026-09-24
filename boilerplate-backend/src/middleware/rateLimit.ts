import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import type { Request } from 'express';

function clientKey(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  const ip = typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : (req.ip ?? '');
  if (!ip) return 'unknown';
  return ipKeyGenerator(ip);
}

export const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 100,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: clientKey,
});

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req) => {
    const email = String((req.body as { email?: unknown })?.email ?? '').trim().toLowerCase();
    return `${clientKey(req)}:${email}`;
  },
});

export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 3,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: clientKey,
});

export const sensitiveActionLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: clientKey,
});
