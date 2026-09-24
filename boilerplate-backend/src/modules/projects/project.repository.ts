import { getDb } from '../../db/client.js';

export interface ProjectRow {
  id: string;
  user_id: string;
  name: string;
  status: string;
  data: string;
  created_at: string;
  updated_at: string;
}

export async function listByUser(userId: string): Promise<ProjectRow[]> {
  const result = await getDb().execute({
    sql: 'SELECT id, user_id, name, status, data, created_at, updated_at FROM projects WHERE user_id = ? ORDER BY updated_at DESC',
    args: [userId],
  });
  return result.rows as unknown as ProjectRow[];
}

export async function findById(userId: string, id: string): Promise<ProjectRow | null> {
  const result = await getDb().execute({
    sql: 'SELECT id, user_id, name, status, data, created_at, updated_at FROM projects WHERE id = ? AND user_id = ?',
    args: [id, userId],
  });
  if (result.rows.length === 0) return null;
  return result.rows[0] as unknown as ProjectRow;
}

export async function countByUser(userId: string): Promise<number> {
  const result = await getDb().execute({
    sql: 'SELECT COUNT(*) as count FROM projects WHERE user_id = ?',
    args: [userId],
  });
  return Number(result.rows[0]?.count ?? 0);
}

export async function countByUserThisMonth(userId: string): Promise<number> {
  const start = new Date();
  start.setUTCDate(1);
  start.setUTCHours(0, 0, 0, 0);
  const result = await getDb().execute({
    sql: 'SELECT COUNT(*) as count FROM projects WHERE user_id = ? AND created_at >= ?',
    args: [userId, start.toISOString()],
  });
  return Number(result.rows[0]?.count ?? 0);
}

export async function create(input: {
  id: string;
  userId: string;
  name: string;
  status: string;
  data: string;
}): Promise<void> {
  const now = new Date().toISOString();
  await getDb().execute({
    sql: `INSERT INTO projects (id, user_id, name, status, data, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [input.id, input.userId, input.name, input.status, input.data, now, now],
  });
}

export async function update(
  userId: string,
  id: string,
  input: { name?: string; status?: string; data?: string },
): Promise<void> {
  const fields: string[] = [];
  const args: Array<string> = [];
  if (input.name !== undefined) {
    fields.push('name = ?');
    args.push(input.name);
  }
  if (input.status !== undefined) {
    fields.push('status = ?');
    args.push(input.status);
  }
  if (input.data !== undefined) {
    fields.push('data = ?');
    args.push(input.data);
  }
  if (fields.length === 0) return;

  fields.push('updated_at = ?');
  args.push(new Date().toISOString(), id, userId);
  await getDb().execute({
    sql: `UPDATE projects SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`,
    args,
  });
}

export async function remove(userId: string, id: string): Promise<void> {
  await getDb().execute({
    sql: 'DELETE FROM projects WHERE id = ? AND user_id = ?',
    args: [id, userId],
  });
}
