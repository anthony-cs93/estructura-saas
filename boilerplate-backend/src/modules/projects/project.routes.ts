import { Router } from 'express';
import { asyncHandler } from '../../lib/http.js';
import { parse } from '../../lib/validation.js';
import { requireAuth } from '../../middleware/auth.js';
import { attachPlan } from '../../middleware/plan.js';
import * as projectService from './project.service.js';
import { createProjectSchema, updateProjectSchema } from './project.schemas.js';

const router = Router();

router.use(requireAuth, attachPlan);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    res.json(await projectService.list(req.user!.id));
  }),
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    res.json(await projectService.getOrThrow(req.user!.id, String(req.params.id)));
  }),
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const input = parse(createProjectSchema, req.body);
    res.status(201).json(await projectService.create(req, req.user!.id, input));
  }),
);

router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const input = parse(updateProjectSchema, req.body);
    res.json(await projectService.update(req.user!.id, String(req.params.id), input));
  }),
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await projectService.remove(req.user!.id, String(req.params.id));
    res.json({ ok: true });
  }),
);

export default router;
