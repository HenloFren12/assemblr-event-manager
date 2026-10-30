// shared/budget.ts
import type { Task } from './schemas.js';

export interface BudgetSummary {
  totalEstimated: number;
  byCategory: Record<string, number>;
  remaining: number;
  overBy: number;
  inKindSavingsPotential: number;
}

/** Single pass, O(n). All amounts are INR. */
export function summarizeBudget(tasks: Task[], budgetCash: number): BudgetSummary {
  const byCategory: Record<string, number> = {};
  let totalEstimated = 0;
  let inKindSavingsPotential = 0;
  for (const t of tasks) {
    totalEstimated += t.costEstimate;
    byCategory[t.category] = (byCategory[t.category] ?? 0) + t.costEstimate;
    if (t.inKindOption && t.costEstimate > 0) inKindSavingsPotential += t.costEstimate;
  }
  return {
    totalEstimated,
    byCategory,
    remaining: Math.max(0, budgetCash - totalEstimated),
    overBy: Math.max(0, totalEstimated - budgetCash),
    inKindSavingsPotential,
  };
}
