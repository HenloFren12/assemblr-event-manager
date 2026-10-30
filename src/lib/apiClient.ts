// src/lib/apiClient.ts
import type { z } from 'zod';
import {
  OutreachResponseSchema,
  PlanResponseSchema,
  ReplanResponseSchema,
  type EventProfile,
  type Disruption,
  type OutreachRequest,
  type Task,
} from '../../shared/schemas';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function post<S extends z.ZodTypeAny>(path: string, body: unknown, schema: S): Promise<z.infer<S>> {
  let res: Response;
  try {
    res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'Network error. Check your connection and try again.');
  }
  const json: unknown = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = (json as { error?: unknown }).error;
    throw new ApiError(res.status, typeof message === 'string' ? message : 'Request failed');
  }
  return schema.parse(json);
}

export const generatePlan = (profile: EventProfile) => post('/api/plan', profile, PlanResponseSchema);

export const replan = (req: { profile: EventProfile; tasks: Task[]; disruption: Disruption }) =>
  post('/api/replan', req, ReplanResponseSchema);

export const generateOutreach = (req: OutreachRequest) => post('/api/outreach', req, OutreachResponseSchema);
