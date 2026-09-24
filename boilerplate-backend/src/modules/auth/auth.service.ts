import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import { conflict, forbidden, unauthorized } from '../../lib/errors.js';
import * as repo from './auth.repository.js';
import type { LoginInput, RegisterInput } from './auth.schemas.js';

const BCRYPT_ROUNDS = 10;

export interface PublicUser {
  id: string;
  email: string;
  name: string | null;
  role: 'user' | 'admin';
}

function toPublicUser(row: repo.PublicUserRecord): PublicUser {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role === 'admin' ? 'admin' : 'user',
  };
}

export async function register(input: RegisterInput): Promise<PublicUser> {
  const email = input.email.trim().toLowerCase();
  if (await repo.findByEmail(email)) {
    throw conflict('El email ya está registrado');
  }

  const id = randomUUID();
  const createdAt = new Date().toISOString();
  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
  const name = input.name?.trim() || email.split('@')[0];

  await repo.create({ id, email, passwordHash, name, role: 'user', createdAt });
  return { id, email, name, role: 'user' };
}

export async function login(input: LoginInput): Promise<PublicUser> {
  const email = input.email.trim().toLowerCase();
  const user = await repo.findByEmail(email);
  if (!user) throw unauthorized('Credenciales inválidas');

  const valid = await bcrypt.compare(input.password, user.password_hash);
  if (!valid) throw unauthorized('Credenciales inválidas');
  if (Number(user.active ?? 1) === 0) throw forbidden('Cuenta desactivada');

  return toPublicUser(user);
}

export async function getProfile(id: string): Promise<PublicUser> {
  const user = await repo.findById(id);
  if (!user) throw unauthorized('Sesión inválida');
  return toPublicUser(user);
}

export async function changePassword(id: string, password: string): Promise<void> {
  const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  await repo.updatePassword(id, hash);
}

export { repo };
