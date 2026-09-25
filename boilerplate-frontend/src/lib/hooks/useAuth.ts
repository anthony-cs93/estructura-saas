import { useCallback, useEffect, useState } from 'react';
import * as auth from '../auth';
import { setOnUnauthorized } from '../api';
import type { User } from '../../types/user';

interface UseAuthResult {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<string | null>;
  register: (email: string, password: string, name?: string) => Promise<string | null>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

export function useAuth(): UseAuthResult {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setOnUnauthorized(() => setUser(null));
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setUser(await auth.getMe());
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    const errorMsg = await auth.loginWithSessionCheck({ email, password });
    if (errorMsg === null) {
      setUser(await auth.getMe());
    }
    return errorMsg;
  }, []);

  const register = useCallback(async (email: string, password: string, name?: string) => {
    const errorMsg = await auth.registerWithSessionCheck({ email, password, name });
    if (errorMsg === null) {
      setUser(await auth.getMe());
    }
    return errorMsg;
  }, []);

  const logout = useCallback(async () => {
    await auth.logout();
    setUser(null);
  }, []);

  return { user, loading, error, login, register, logout, refresh };
}