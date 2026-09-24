import { getDb } from '../../db/client.js';

export interface UserRecord {
  id: string;
  email: string;
  password_hash: string;
  name: string | null;
  role: string;
  active: number;
  created_at: string;
}

export type PublicUserRecord = Omit<UserRecord, 'password_hash'>;

export async function findByEmail(email: string): Promise<UserRecord | null> {
  const result = await getDb().execute({
    sql: 'SELECT id, email, password_hash, name, role, active, created_at FROM users WHERE email = ?',
    args: [email],
  });
  if (result.rows.length === 0) return null;
  return result.rows[0] as unknown as UserRecord;
}

export async function findById(id: string): Promise<PublicUserRecord | null> {
  const result = await getDb().execute({
    sql: 'SELECT id, email, name, role, active, created_at FROM users WHERE id = ?',
    args: [id],
  });
  if (result.rows.length === 0) return null;
  return result.rows[0] as unknown as PublicUserRecord;
}

export async function findPasswordHash(id: string): Promise<string | null> {
  const result = await getDb().execute({
    sql: 'SELECT password_hash FROM users WHERE id = ?',
    args: [id],
  });
  if (result.rows.length === 0) return null;
  return String(result.rows[0].password_hash);
}

export async function create(input: {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  role: string;
  createdAt: string;
}): Promise<void> {
  await getDb().execute({
    sql: `INSERT INTO users (id, email, password_hash, name, role, active, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, 1, ?, ?)`,
    args: [input.id, input.email, input.passwordHash, input.name, input.role, input.createdAt, input.createdAt],
  });
}

export async function updatePassword(id: string, passwordHash: string): Promise<void> {
  await getDb().execute({
    sql: 'UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?',
    args: [passwordHash, new Date().toISOString(), id],
  });
}

export async function setRole(id: string, role: string): Promise<void> {
  await getDb().execute({
    sql: 'UPDATE users SET role = ?, updated_at = ? WHERE id = ?',
    args: [role, new Date().toISOString(), id],
  });
}

export async function setActive(id: string, active: boolean): Promise<void> {
  await getDb().execute({
    sql: 'UPDATE users SET active = ?, updated_at = ? WHERE id = ?',
    args: [active ? 1 : 0, new Date().toISOString(), id],
  });
}

export async function remove(id: string): Promise<void> {
  await getDb().execute({ sql: 'DELETE FROM users WHERE id = ?', args: [id] });
}
