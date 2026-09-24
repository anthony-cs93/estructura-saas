import { randomUUID } from 'node:crypto';
import type { Request } from 'express';
import { notFound } from '../../lib/errors.js';
import { assertWithinLimit } from '../../middleware/plan.js';
import * as repo from './project.repository.js';
import type { CreateProjectInput, UpdateProjectInput } from './project.schemas.js';

export interface Project {
  id: string;
  name: string;
  status: string;
  data: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

function toProject(row: repo.ProjectRow): Project {
  let data: Record<string, unknown> = {};
  try {
    data = JSON.parse(row.data || '{}') as Record<string, unknown>;
  } catch {
    data = {};
  }
  return {
    id: row.id,
    name: row.name,
    status: row.status,
    data,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function list(userId: string): Promise<Project[]> {
  const rows = await repo.listByUser(userId);
  return rows.map(toProject);
}

export async function getOrThrow(userId: string, id: string): Promise<Project> {
  const row = await repo.findById(userId, id);
  if (!row) throw notFound('Proyecto no encontrado');
  return toProject(row);
}

export async function create(req: Request, userId: string, input: CreateProjectInput): Promise<Project> {
  const count = await repo.countByUserThisMonth(userId);
  assertWithinLimit(req, 'projectsPerMonth', count);

  const id = randomUUID();
  await repo.create({
    id,
    userId,
    name: input.name,
    status: input.status ?? 'active',
    data: JSON.stringify(input.data ?? {}),
  });
  return getOrThrow(userId, id);
}

export async function update(userId: string, id: string, input: UpdateProjectInput): Promise<Project> {
  await getOrThrow(userId, id);
  await repo.update(userId, id, {
    name: input.name,
    status: input.status,
    data: input.data !== undefined ? JSON.stringify(input.data) : undefined,
  });
  return getOrThrow(userId, id);
}

export async function remove(userId: string, id: string): Promise<void> {
  await getOrThrow(userId, id);
  await repo.remove(userId, id);
}
