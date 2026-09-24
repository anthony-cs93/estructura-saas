import type { Request, RequestHandler } from 'express';
import { getDb } from '../db/client.js';
import { forbidden } from '../lib/errors.js';

export type PlanId = 'free' | 'negocio' | 'empresa';

export interface PlanDefinition {
  limits: Record<string, number>;
  features: string[];
}

export interface PlanContext {
  id: PlanId;
  subscriptionEndsAt: string | null;
}

export const PLANS: Record<PlanId, PlanDefinition> = {
  free: {
    limits: { projectsPerMonth: 1 },
    features: ['dashboard', 'reports', 'export'],
  },
  negocio: {
    limits: { projectsPerMonth: 5 },
    features: ['dashboard', 'reports', 'export', 'csv'],
  },
  empresa: {
    limits: { projectsPerMonth: Infinity },
    features: ['dashboard', 'reports', 'export', 'csv', 'priority'],
  },
};

export function normalizePlan(plan: string | null | undefined): PlanId {
  if (plan === 'empresa') return 'empresa';
  if (plan === 'negocio') return 'negocio';
  if (plan === 'free') return 'free';
  // Compatibilidad con planes legacy.
  if (plan === 'pro') return 'empresa';
  if (plan === 'basic') return 'negocio';
  return 'free';
}

export function planFeatures(plan: PlanId): string[] {
  return PLANS[plan].features;
}

export function planLimit(plan: PlanId, key: string): number {
  return PLANS[plan].limits[key] ?? 0;
}

export function assertFeature(req: Request, feature: string): void {
  const plan = req.plan?.id ?? 'free';
  if (!planFeatures(plan).includes(feature)) {
    throw forbidden(`Tu plan "${plan}" no incluye la función "${feature}"`);
  }
}

export function assertWithinLimit(req: Request, key: string, current: number): void {
  const plan = req.plan?.id ?? 'free';
  const limit = planLimit(plan, key);
  if (current >= limit) {
    throw forbidden(`Alcanzaste el límite de ${limit} en "${key}" para el plan "${plan}"`);
  }
}

export const attachPlan: RequestHandler = async (req, _res, next) => {
  try {
    const userId = req.user!.id;
    const db = getDb();
    const result = await db.execute({
      sql: 'SELECT plan, ends_at FROM subscriptions WHERE user_id = ?',
      args: [userId],
    });

    let plan: PlanId = 'free';
    let endsAt: string | null = null;

    if (result.rows.length === 0) {
      await db.execute({
        sql: 'INSERT INTO subscriptions (user_id, plan, updated_at) VALUES (?, ?, ?)',
        args: [userId, 'free', new Date().toISOString()],
      });
    } else {
      plan = normalizePlan(String(result.rows[0].plan));
      endsAt = result.rows[0].ends_at ? String(result.rows[0].ends_at) : null;

      const today = new Date().toISOString().slice(0, 10);
      if (plan !== 'free' && endsAt && endsAt.slice(0, 10) < today) {
        await db.execute({
          sql: "UPDATE subscriptions SET plan = 'free', ends_at = NULL, updated_at = ? WHERE user_id = ?",
          args: [new Date().toISOString(), userId],
        });
        plan = 'free';
        endsAt = null;
      }
    }

    req.plan = { id: plan, subscriptionEndsAt: endsAt };
    next();
  } catch (err) {
    next(err);
  }
};
