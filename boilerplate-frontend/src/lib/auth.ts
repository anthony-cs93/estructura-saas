import { api } from './api';
import type { User } from '../types/user';

export const COOKIE_BLOCKED_MSG =
  'Tu navegador está bloqueando las cookies de sesión (incluidas las de terceros), así que no pudimos mantener tu sesión. Actívalas y vuelve a intentarlo.';

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  name?: string;
}

export async function login(input: LoginInput): Promise<User> {
  return api.post<User>('/api/auth/login', input);
}

export async function register(input: RegisterInput): Promise<User> {
  return api.post<User>('/api/auth/register', input);
}

export async function logout(): Promise<void> {
  await api.post('/api/auth/logout');
}

export async function getMe(): Promise<User> {
  return api.get<User>('/api/auth/me');
}

export async function checkCookieProbe(): Promise<boolean> {
  await api.get('/api/cookie-probe');
  const { cookieReceived } = await api.get<{ cookieReceived: boolean }>('/api/cookie-probe');
  return cookieReceived;
}

async function verifySession(): Promise<string | null> {
  try {
    await getMe();
    return null;
  } catch {
    return COOKIE_BLOCKED_MSG;
  }
}

export async function loginWithSessionCheck(input: LoginInput): Promise<string | null> {
  try {
    await login(input);
    return verifySession();
  } catch (err) {
    return err instanceof Error ? err.message : 'Error al iniciar sesión';
  }
}

export async function registerWithSessionCheck(input: RegisterInput): Promise<string | null> {
  try {
    await register(input);
    return verifySession();
  } catch (err) {
    return err instanceof Error ? err.message : 'Error al registrarse';
  }
}