import type { ErrorRequestHandler } from 'express';
import { AppError } from '../lib/errors.js';

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    res.status(err.status).json({ error: err.message, code: err.code });
    return;
  }
  console.error('[error]', err);
  res.status(500).json({ error: 'Error interno del servidor' });
};
