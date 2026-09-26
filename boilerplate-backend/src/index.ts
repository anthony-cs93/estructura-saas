import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { runMigrations } from './db/migrate.js';
import { buildRouter } from './routes.js';
import { errorHandler } from './middleware/errorHandler.js';
import { globalLimiter } from './middleware/rateLimit.js';

export function createApp() {
  const app = express();
  app.set('trust proxy', env.trustProxy);

  app.use(
    cors({
      origin: env.isProduction ? env.corsOrigins : true,
      credentials: true,
    }),
  );
  app.use(cookieParser());
  app.use(express.json({ limit: '1mb' }));

  // Datos autenticados: no cachear (navegador/CDN; seguro detrás de un proxy).
  // Va ANTES de globalLimiter a propósito: si no, las respuestas 429 del limitador
  // salen sin `Cache-Control: no-store` y un CDN puede cachear un rechazo.
  app.use('/api', (_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });

  app.use(globalLimiter);
  app.use('/api', buildRouter());
  app.use(errorHandler);

  return app;
}

async function start(): Promise<void> {
  await runMigrations();
  const app = createApp();
  app.listen(env.port, () => {
    console.log(`API SaaS escuchando en http://localhost:${env.port}`);
  });
}

start().catch((err) => {
  console.error('Error iniciando el servidor:', err);
  process.exit(1);
});
