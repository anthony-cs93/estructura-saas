import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { getDb } from '../../db/client.js';
import { badRequest, unauthorized } from '../../lib/errors.js';
import { asyncHandler } from '../../lib/http.js';
import { logAudit } from '../../lib/audit.js';
import { requireAuth, clearSessionCookie } from '../../middleware/auth.js';
import { sensitiveActionLimiter } from '../../middleware/rateLimit.js';
import * as authRepo from '../auth/auth.repository.js';

const router = Router();

router.use(requireAuth);

router.get(
  '/data',
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const db = getDb();
    const [user, projects, subscription] = await Promise.all([
      db.execute({
        sql: 'SELECT id, email, name, role, active, created_at FROM users WHERE id = ?',
        args: [userId],
      }),
      db.execute({
        sql: 'SELECT id, name, status, data, created_at, updated_at FROM projects WHERE user_id = ?',
        args: [userId],
      }),
      db.execute({
        sql: 'SELECT plan, billing_cycle, ends_at FROM subscriptions WHERE user_id = ?',
        args: [userId],
      }),
    ]);

    res.json({
      user: user.rows[0] ?? null,
      projects: projects.rows,
      subscription: subscription.rows[0] ?? null,
      exportedAt: new Date().toISOString(),
    });
  }),
);

router.delete(
  '/',
  sensitiveActionLimiter,
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const { password } = (req.body ?? {}) as { password?: string };
    if (!password) throw badRequest('La contraseña es requerida para eliminar la cuenta');

    const hash = await authRepo.findPasswordHash(userId);
    if (!hash) throw unauthorized('Sesión inválida');

    const valid = await bcrypt.compare(password, hash);
    if (!valid) throw unauthorized('Contraseña incorrecta');

    const db = getDb();
    await db.execute({ sql: 'DELETE FROM projects WHERE user_id = ?', args: [userId] });
    await db.execute({ sql: 'DELETE FROM subscriptions WHERE user_id = ?', args: [userId] });
    await authRepo.remove(userId);

    await logAudit({
      actorId: userId,
      actorEmail: req.user!.email,
      action: 'account_delete',
      targetId: userId,
      targetEmail: req.user!.email,
      ip: req.ip,
    });

    clearSessionCookie(res);
    res.status(204).end();
  }),
);

export default router;
