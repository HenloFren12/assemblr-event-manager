// shared/testUtils.ts
import type { Patch, Task } from './schemas.js';

export function mk(
  id: string,
  dependsOn: string[] = [],
  durationDays = 1,
  overrides: Partial<Task> = {},
): Task {
  return {
    id,
    title: `Task ${id}`,
    category: 'misc',
    ownerId: null,
    dependsOn,
    dueDate: '2026-11-20',
    durationDays,
    priority: 'must',
    costEstimate: 0,
    status: 'todo',
    ...overrides,
  };
}

export const EMPTY_PATCH: Patch = { added: [], modified: [], removed: [], summary: 'test', tradeoffs: [] };
