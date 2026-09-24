import { getDb } from '../../db/client.js';

export interface SubscriptionRecord {
  plan: string;
  billing_cycle: string | null;
  ends_at: string | null;
  quota_used: number;
  quota_period: string | null;
}

export async function getByUser(userId: string): Promise<SubscriptionRecord | null> {
  const result = await getDb().execute({
    sql: 'SELECT plan, billing_cycle, ends_at, quota_used, quota_period FROM subscriptions WHERE user_id = ?',
    args: [userId],
  });
  if (result.rows.length === 0) return null;
  return result.rows[0] as unknown as SubscriptionRecord;
}

export async function upsert(
  userId: string,
  input: { plan: string; billingCycle?: string | null; endsAt?: string | null },
): Promise<void> {
  await getDb().execute({
    sql: `INSERT INTO subscriptions (user_id, plan, billing_cycle, ends_at, updated_at)
          VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(user_id) DO UPDATE SET
            plan = excluded.plan,
            billing_cycle = excluded.billing_cycle,
            ends_at = excluded.ends_at,
            updated_at = excluded.updated_at`,
    args: [
      userId,
      input.plan,
      input.billingCycle ?? null,
      input.endsAt ?? null,
      new Date().toISOString(),
    ],
  });
}
