import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import { FEATURES, LIMITS, PRECIOS_PLANES, type Feature, type PlanInfo, type PlanTier, type SubscribeResult } from '../../types/plan';

interface UsePlanResult {
  planInfo: PlanInfo | null;
  planError: boolean;
  loading: boolean;
  subscribe: (plan: 'negocio' | 'empresa', billingCycle?: 'monthly' | 'annual') => Promise<string | null>;
  checkFeature: (feature: Feature, currentCount?: number) => boolean;
  checkLimit: (key: string, currentCount: number) => boolean;
  showUpgradeModal: boolean;
  setShowUpgradeModal: (v: boolean) => void;
  upgradeReason: string;
  setUpgradeReason: (r: string) => void;
  PRECIOS_PLANES: typeof PRECIOS_PLANES;
  refreshPlan: () => Promise<void>;
}

function normalizarPlan(plan: string): PlanTier {
  if (plan === 'empresa') return 'empresa';
  if (plan === 'negocio') return 'negocio';
  if (plan === 'free') return 'free';
  return 'free';
}

function esPlanVencido(info: Pick<PlanInfo, 'plan' | 'endsAt'>): boolean {
  if (info.plan === 'free' || !info.endsAt) return false;
  const hoy = new Date();
  const hoyStr = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
  return info.endsAt.slice(0, 10) < hoyStr;
}

function aplicarVencimiento(info: PlanInfo): PlanInfo {
  if (!esPlanVencido(info)) return info;
  return { ...info, plan: 'free', billingCycle: null, endsAt: null };
}

export function usePlan(): UsePlanResult {
  const [planInfo, setPlanInfo] = useState<PlanInfo | null>(null);
  const [planError, setPlanError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState('');

  useEffect(() => {
    api
      .get<PlanInfo>('/api/plan')
      .then((info) => setPlanInfo(aplicarVencimiento({ ...info, plan: normalizarPlan(info.plan) })))
      .catch(() => setPlanError(true))
      .finally(() => setLoading(false));
  }, []);

  const subscribe = useCallback(async (plan: 'negocio' | 'empresa', billingCycle?: 'monthly' | 'annual') => {
    try {
      const result = await api.post<SubscribeResult>('/api/plan/mock-subscribe', { plan, billingCycle });
      setPlanInfo(aplicarVencimiento({ ...result, plan: normalizarPlan(result.plan) }));
      return null;
    } catch (err) {
      return err instanceof Error ? err.message : 'Error al procesar suscripción';
    }
  }, []);

  const refreshPlan = useCallback(async () => {
    try {
      const info = await api.get<PlanInfo>('/api/plan');
      setPlanInfo((prev) => (prev ? aplicarVencimiento({ ...prev, ...info, plan: normalizarPlan(info.plan) }) : prev));
    } catch {
      setPlanError(true);
    }
  }, []);

  const checkFeature = useCallback(
    (feature: Feature, currentCount?: number): boolean => {
      if (!planInfo) return false;
      const features = FEATURES[planInfo.plan];
      if (!features.includes(feature)) return false;
      const limit = LIMITS[planInfo.plan][feature];
      if (limit !== undefined && currentCount !== undefined) return currentCount < limit;
      return true;
    },
    [planInfo],
  );

  const checkLimit = useCallback(
    (key: string, currentCount: number): boolean => {
      if (!planInfo) return false;
      const limit = LIMITS[planInfo.plan][key];
      if (limit === undefined) return true;
      return currentCount < limit;
    },
    [planInfo],
  );

  return {
    planInfo,
    planError,
    loading,
    subscribe,
    checkFeature,
    checkLimit,
    showUpgradeModal,
    setShowUpgradeModal,
    upgradeReason,
    setUpgradeReason,
    PRECIOS_PLANES,
    refreshPlan,
  };
}