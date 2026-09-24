import { z } from 'zod';

export const createProjectSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es obligatorio').max(160),
  status: z.enum(['active', 'completed', 'archived']).optional(),
  data: z.record(z.unknown()).optional(),
});

export const updateProjectSchema = createProjectSchema.partial();

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
