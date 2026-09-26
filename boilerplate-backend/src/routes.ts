import { Router } from 'express';
import { env } from './config/env.js';
import { getDb } from './db/client.js';
import authRouter from './modules/auth/auth.routes.js';
import planRouter from './modules/plans/plan.routes.js';
import projectRouter from './modules/projects/project.routes.js';
import accountRouter from './modules/account/account.routes.js';

export function buildRouter(): Router {
  const router = Router();

  // Liveness: NO toca dependencias. Es lo que Render usa como `healthCheckPath`.
  // Si dependiera de Turso, una caída transitoria de la BD reiniciaría el servicio
  // en loop y convertiría un problema de dependencia en una caída de la app.
  router.get('/health', (_req, res) => {
    res.json({ status: 'ok', mode: 'turso' });
  });

  // Readiness: sí verifica la base. Usalo en el monitor de uptime para saber si
  // la app realmente puede operar, no solo si el proceso está vivo.
  router.get('/ready', async (_req, res) => {
    try {
      await Promise.race([
        getDb().execute({ sql: 'select 1' }),
        new Promise((_resolve, reject) =>
          setTimeout(() => reject(new Error('timeout')), 3000),
        ),
      ]);
      res.json({ status: 'ok', db: 'ok' });
    } catch (err) {
      console.error('[ready]', err);
      res.status(503).json({ status: 'degraded', db: 'unreachable' });
    }
  });

  // Sonda de cookies: la 1ª llamada setea `gf_probe`; la 2ª revela si el navegador
  // la devolvió. Sólo hace falta en la variante C2 (frontend y backend en origins
  // distintos): si el proxy deja todo same-origin, la cookie nunca se bloquea.
  router.get('/cookie-probe', (req, res) => {
    const cookieHeader = req.headers.cookie ?? '';
    const match = cookieHeader.match(/(?:^|;\s*)gf_probe=([^;]+)/);
    const value = match ? match[1] : String(Date.now());
    res.cookie('gf_probe', value, {
      httpOnly: false,
      secure: env.isProduction,
      sameSite: env.cookieSameSite,
      path: '/',
      maxAge: 120 * 1000,
    });
    res.json({ cookieReceived: Boolean(match) });
  });

  router.use('/auth', authRouter);
  router.use('/plan', planRouter);
  router.use('/projects', projectRouter);
  router.use('/account', accountRouter);

  return router;
}
