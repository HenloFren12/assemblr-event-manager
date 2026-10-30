// shared/readiness.ts
import type { Task } from './schemas.js';

const WEIGHT = { must: 3, should: 2, nice: 1 } as const;

export interface ReadinessBreakdown {
  ownership: number; // 0-100: open tasks owned by an active volunteer
  schedule: number;  // 0-100: open tasks that are not at risk
  budget: number;    // 0-100: how much of the estimated cost the cash budget covers
  progress: number;  // 0-100: share of tasks completed
  score: number;     // 0-100: weighted overall readiness
}

const EMPTY: ReadinessBreakdown = { ownership: 0, schedule: 0, budget: 0, progress: 0, score: 0 };

function weightedShare(items: Task[], isGood: (t: Task) => boolean): number {
  let total = 0;
  let good = 0;
  for (const t of items) {
    const w = WEIGHT[t.priority];
    total += w;
    if (isGood(t)) good += w;
  }
  return total === 0 ? 1 : good / total;
}

/**
 * Explains the readiness score. Weights: 35% ownership, 35% schedule,
 * 20% budget fit, 10% progress. Must-have tasks count 3x, should 2x, nice 1x.
 */
export function readinessBreakdown(
  tasks: Task[],
  schedule: Record<string, { atRisk: boolean }>,
  budgetCash: number,
  activeVolunteerIds: ReadonlySet<string>,
): ReadinessBreakdown {
  if (tasks.length === 0) return EMPTY;
  const open = tasks.filter(t => t.status !== 'done');
  const owned = weightedShare(open, t => t.ownerId !== null && activeVolunteerIds.has(t.ownerId));
  const onTime = weightedShare(open, t => !schedule[t.id]?.atRisk);
  const totalCost = tasks.reduce((sum, t) => sum + t.costEstimate, 0);
  const budgetFit = totalCost <= 0 ? 1 : Math.min(1, budgetCash / totalCost);
  const progress = (tasks.length - open.length) / tasks.length;
  const raw = 35 * owned + 35 * onTime + 20 * budgetFit + 10 * progress;
  return {
    ownership: Math.round(owned * 100),
    schedule: Math.round(onTime * 100),
    budget: Math.round(budgetFit * 100),
    progress: Math.round(progress * 100),
    score: Math.round(Math.max(0, Math.min(100, raw))),
  };
}

/** Overall readiness, 0 to 100. */
export function computeReadiness(
  tasks: Task[],
  schedule: Record<string, { atRisk: boolean }>,
  budgetCash: number,
  activeVolunteerIds: ReadonlySet<string>,
): number {
  return readinessBreakdown(tasks, schedule, budgetCash, activeVolunteerIds).score;
}
