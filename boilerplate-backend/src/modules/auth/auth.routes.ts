import { Router } from 'express';
import { asyncHandler } from '../../lib/http.js';
import { parse } from '../../lib/validation.js';
import { forbidden } from '../../lib/errors.js';
import { env } from '../../config/env.js';
import { requireAuth, signSession, setSessionCookie, clearSessionCookie } from '../../middleware/auth.js';
import { loginLimiter, registerLimiter } from '../../middleware/rateLimit.js';
import * as authService from './auth.service.js';
import { loginSchema, registerSchema } from './auth.schemas.js';

const router = Router();

router.post(
  '/register',
  registerLimiter,
  asyncHandler(async (req, res) => {
    if (!env.allowRegistration) throw forbidden('El registro está deshabilitado temporalmente');
    const input = parse(registerSchema, req.body);
    const user = await authService.register(input);
    setSessionCookie(res, await signSession(user));
    res.status(201).json(user);
  }),
);

router.post(
  '/login',
  loginLimiter,
  asyncHandler(async (req, res) => {
    const input = parse(loginSchema, req.body);
    const user = await authService.login(input);
    setSessionCookie(res, await signSession(user));
    res.status(200).json(user);
  }),
);

router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json(await authService.getProfile(req.user!.id));
  }),
);

router.post('/logout', (req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

export default router;
