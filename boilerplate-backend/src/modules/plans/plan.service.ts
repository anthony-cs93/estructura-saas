import { badRequest } from '../../lib/errors.js';
import { normalizePlan, planFeatures, type PlanId } from '../../middleware/plan.js';
import * as repo from './plan.repository.js';

export interface PlanInfo {
  plan: PlanId;
  billingCycle: string | null;
  endsAt: string | null;
}

export async function getInfo(userId: string): Promise<PlanInfo> {
  const sub = await repo.getByUser(userId);
  if (!sub) {
    await repo.upsert(userId, { plan: 'free' });
    return { plan: 'free', billingCycle: null, endsAt: null };
  }
  return {
    plan: normalizePlan(sub.plan),
    billingCycle: sub.billing_cycle,
    endsAt: sub.ends_at,
  };
}

export async function subscribe(
  userId: string,
  plan: string,
  billingCycle?: string | null,
): Promise<PlanInfo> {
  if (plan !== 'negocio' && plan !== 'empresa') {
    throw badRequest('Plan inválido. Usa: negocio o empresa');
  }

  let endsAt: string | null = null;
  if (billingCycle) {
    const date = new Date();
    date.setDate(date.getDate() + (billingCycle === 'annual' ? 365 : 30));
    endsAt = date.toISOString();
  }

  await repo.upsert(userId, { plan, billingCycle: billingCycle ?? null, endsAt });
  return { plan, billingCycle: billingCycle ?? null, endsAt };
}

export function featuresFor(plan: PlanId): string[] {
  return planFeatures(plan);
}
