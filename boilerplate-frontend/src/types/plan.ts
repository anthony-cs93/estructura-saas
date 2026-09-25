export type PlanTier = 'free' | 'negocio' | 'empresa';

export interface PlanInfo {
  plan: PlanTier;
  billingCycle: string | null;
  endsAt: string | null;
}

export interface SubscribeResult extends PlanInfo {
  message?: string;
}

export type Feature = 'dashboard' | 'reports' | 'export' | 'csv' | 'priority';

export const FEATURES: Record<PlanTier, Feature[]> = {
  free: ['dashboard', 'reports', 'export'],
  negocio: ['dashboard', 'reports', 'export', 'csv'],
  empresa: ['dashboard', 'reports', 'export', 'csv', 'priority'],
};

export const LIMITS: Record<PlanTier, Record<string, number>> = {
  free: { projectsPerMonth: 1 },
  negocio: { projectsPerMonth: 5 },
  empresa: { projectsPerMonth: Infinity },
};

export const PRECIOS_PLANES = {
  free: { label: 'Free', precio: 'Gratis', destacado: false },
  negocio: { label: 'Negocio', mensual: '$ 9.90', anual: '$ 89.90', destacado: false },
  empresa: { label: 'Empresa', mensual: '$ 19.90', anual: '$ 189.90', destacado: true },
} as const;