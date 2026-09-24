import { Router } from 'express';
import { asyncHandler } from '../../lib/http.js';
import { requireAuth } from '../../middleware/auth.js';
import { attachPlan, planFeatures } from '../../middleware/plan.js';
import * as planService from './plan.service.js';

const router = Router();

router.use(requireAuth, attachPlan);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    res.json(await planService.getInfo(req.user!.id));
  }),
);

router.get('/features', (req, res) => {
  const plan = req.plan!.id;
  res.json({ plan, features: planFeatures(plan) });
});

router.post(
  '/mock-subscribe',
  asyncHandler(async (req, res) => {
    const { plan, billingCycle } = (req.body ?? {}) as { plan?: string; billingCycle?: string };
    res.json(await planService.subscribe(req.user!.id, String(plan), billingCycle ?? null));
  }),
);

export default router;
