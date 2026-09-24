import { getDb } from '../db/client.js';

export interface AuditEntry {
  actorId: string;
  actorEmail: string;
  action: string;
  targetId?: string;
  targetEmail?: string;
  details?: string;
  ip?: string;
}

export async function logAudit(entry: AuditEntry): Promise<void> {
  try {
    await getDb().execute({
      sql: `INSERT INTO audit_logs (actor_id, actor_email, action, target_id, target_email, details, ip, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        entry.actorId,
        entry.actorEmail,
        entry.action,
        entry.targetId ?? null,
        entry.targetEmail ?? null,
        entry.details ?? null,
        entry.ip ?? null,
        new Date().toISOString(),
      ],
    });
  } catch (err) {
    console.error('[audit]', err);
  }
}
