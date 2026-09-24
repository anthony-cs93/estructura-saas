import { Router } from 'express';
import { env } from './config/env.js';
import authRouter from './modules/auth/auth.routes.js';
import planRouter from './modules/plans/plan.routes.js';
import projectRouter from './modules/projects/project.routes.js';
import accountRouter from './modules/account/account.routes.js';

export function buildRouter(): Router {
  const router = Router();

  router.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  // Sonda de cookies: la 1ª llamada setea `gf_probe`; la 2ª revela si el navegador
  // la devolvió. Si no, hay bloqueo de cookies de terceros y la sesión no persistirá
  // (caso típico cuando frontend y backend son orígenes distintos).
  router.get('/cookie-probe', (req, res) => {
    const cookieHeader = req.headers.cookie ?? '';
    const match = cookieHeader.match(/(?:^|;\s*)gf_probe=([^;]+)/);
    const value = match ? match[1] : String(Date.now());
    res.cookie('gf_probe', value, {
      httpOnly: false,
      secure: env.isProduction,
      sameSite: env.isProduction ? 'none' : 'lax',
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
