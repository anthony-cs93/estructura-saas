import type { RequestHandler } from 'express';
import { forbidden } from '../lib/errors.js';

export function requireRole(...roles: Array<'user' | 'admin'>): RequestHandler {
  return (req, _res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      next(forbidden('Se requiere un rol con permisos suficientes'));
      return;
    }
    next();
  };
}
