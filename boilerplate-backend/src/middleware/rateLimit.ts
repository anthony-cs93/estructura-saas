import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import type { Request } from 'express';

/**
 * La IP del cliente la resuelve Express a partir de `app.set('trust proxy', N)`.
 *
 * NUNCA leer `x-forwarded-for` a mano: el cliente puede prefijar la cadena con un
 * valor inventado, y tomar `[0]` es tomar exactamente lo que eligió el atacante.
 * Cambiar el header daba un cubo de rate limit nuevo y limpio → el límite se
 * evadía por completo con un simple `curl`. Medido en producción; ver
 * `07-DEPLOY.md` §"La IP real detrás de un proxy".
 *
 * `req.ip` + `trust proxy: N` hace que Express recorra la cadena desde la derecha
 * y devuelva la primera dirección no confiable, ignorando lo que el cliente haya
 * prefijado. Además, al no pasar `keyGenerator`, `express-rate-limit` ejecuta sus
 * propias validaciones de `trust proxy`, que detectan una profundidad mal puesta.
 */
function safeIpKey(req: Request): string {
  const ip = req.ip;
  if (!ip) return 'unknown';
  try {
    return ipKeyGenerator(ip);
  } catch {
    return 'unknown';
  }
}

export const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 100,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  // Requiere clave propia para incluir el email. Aun así, la parte de IP sale de
  // `req.ip` (ya corregido por `trust proxy`), no del header leído a mano.
  keyGenerator: (req) => {
    const email = String((req.body as { email?: unknown })?.email ?? '').trim().toLowerCase();
    return `${safeIpKey(req)}:${email}`;
  },
});

export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 3,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});

export const sensitiveActionLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});
