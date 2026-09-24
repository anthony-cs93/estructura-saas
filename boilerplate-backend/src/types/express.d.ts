import type { SessionUser } from '../middleware/auth.js';
import type { PlanContext } from '../middleware/plan.js';

declare global {
  namespace Express {
    interface Request {
      user?: SessionUser;
      plan?: PlanContext;
    }
  }
}

export {};
