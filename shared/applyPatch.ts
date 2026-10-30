// shared/applyPatch.ts
import { computeSchedule } from './dependencyEngine.js';
import type { AiTask, Patch, Task } from './schemas.js';

export class PatchError extends Error {}

/** Recomputes every dueDate from the dependency graph. Throws GraphError on bad graphs. */
export function withSchedule(tasks: Task[], eventDate: string, today: string): Task[] {
  const schedule = computeSchedule(tasks, eventDate, today);
  return tasks.map(t => ({ ...t, dueDate: schedule[t.id]?.dueDate ?? t.dueDate }));
}

/** Turns AI tasks (no dates, no status) into real tasks. */
export function buildTasks(aiTasks: AiTask[], eventDate: string, today: string): Task[] {
  const draft: Task[] = aiTasks.map(t => ({ ...t, status: 'todo', dueDate: eventDate }));
  return withSchedule(draft, eventDate, today);
}

/** Every open task must be unassigned or assigned to an active volunteer. */
export function assertValidOwners(tasks: Task[], activeVolunteerIds: ReadonlySet<string>): void {
  for (const t of tasks) {
    if (t.status === 'done' || t.ownerId === null) continue;
    if (!activeVolunteerIds.has(t.ownerId)) {
      throw new PatchError(`Task ${t.id} is assigned to ${t.ownerId}, who is inactive or unknown`);
    }
  }
}

export function applyPatch(
  current: Task[],
  patch: Patch,
  eventDate: string,
  today: string,
  activeVolunteerIds?: ReadonlySet<string>,
): Task[] {
  const byId = new Map(current.map(t => [t.id, t]));

  for (const id of patch.removed) {
    const t = byId.get(id);
    if (!t) throw new PatchError(`Cannot remove unknown task ${id}`);
    if (t.status === 'done') throw new PatchError(`Cannot remove completed task ${id}`);
  }
  for (const m of patch.modified) {
    const t = byId.get(m.id);
    if (!t) throw new PatchError(`Cannot modify unknown task ${m.id}`);
    if (t.status === 'done') throw new PatchError(`Cannot modify completed task ${m.id}`);
  }
  for (const a of patch.added) {
    if (byId.has(a.id)) throw new PatchError(`Added task id ${a.id} already exists`);
  }

  const removed = new Set(patch.removed);
  const changes = new Map(patch.modified.map(m => [m.id, m.changes]));

  const kept: Task[] = current
    .filter(t => !removed.has(t.id))
    .map(t => ({ ...t, ...(changes.get(t.id) ?? {}) }));
  const added: Task[] = patch.added.map(a => ({ ...a, status: 'todo', dueDate: eventDate }));

  const combined = [...kept, ...added].map(t => ({
    ...t,
    dependsOn: t.dependsOn.filter(dep => !removed.has(dep)),
  }));

  if (activeVolunteerIds) assertValidOwners(combined, activeVolunteerIds);
  return withSchedule(combined, eventDate, today);
}
