// shared/dependencyEngine.ts
import type { Task } from './schemas.js';

export class GraphError extends Error {}

const DAY_MS = 86_400_000;

function toUtcMs(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

export function addDays(iso: string, days: number): string {
  return new Date(toUtcMs(iso) + days * DAY_MS).toISOString().slice(0, 10);
}

export function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((toUtcMs(toIso) - toUtcMs(fromIso)) / DAY_MS);
}

/** Today's date in India (IST, UTC+5:30) as YYYY-MM-DD. */
export function todayIST(now: Date = new Date()): string {
  return new Date(now.getTime() + 5.5 * 3_600_000).toISOString().slice(0, 10);
}

/** Kahn's algorithm. O(V + E). Throws GraphError on duplicates, unknown ids, self-deps, cycles. */
export function topoSort(tasks: ReadonlyArray<Pick<Task, 'id' | 'dependsOn'>>): string[] {
  const ids = new Set(tasks.map(t => t.id));
  if (ids.size !== tasks.length) throw new GraphError('Duplicate task ids');

  const indegree = new Map<string, number>();
  const children = new Map<string, string[]>();
  for (const t of tasks) {
    indegree.set(t.id, 0);
    children.set(t.id, []);
  }
  for (const t of tasks) {
    for (const dep of new Set(t.dependsOn)) {
      if (dep === t.id) throw new GraphError(`Task ${t.id} depends on itself`);
      if (!ids.has(dep)) throw new GraphError(`Task ${t.id} depends on unknown task ${dep}`);
      indegree.set(t.id, (indegree.get(t.id) ?? 0) + 1);
      children.get(dep)?.push(t.id);
    }
  }

  const queue = tasks.filter(t => indegree.get(t.id) === 0).map(t => t.id);
  const order: string[] = [];
  for (let i = 0; i < queue.length; i++) {
    const id = queue[i];
    order.push(id);
    for (const child of children.get(id) ?? []) {
      const left = (indegree.get(child) ?? 0) - 1;
      indegree.set(child, left);
      if (left === 0) queue.push(child);
    }
  }
  if (order.length !== tasks.length) throw new GraphError('Dependency cycle detected');
  return order;
}

export interface ScheduleEntry {
  startDate: string;
  dueDate: string;
  atRisk: boolean;
}

/**
 * Backward-schedules every task from the event date (minus a buffer) so no task
 * is due before its prerequisites can finish, then flags tasks that cannot be
 * finished in time if work starts today.
 */
export function computeSchedule(
  tasks: Task[],
  eventDate: string,
  today: string,
  bufferDays = 2,
): Record<string, ScheduleEntry> {
  const order = topoSort(tasks);
  const byId = new Map(tasks.map(t => [t.id, t]));
  const dependents = new Map<string, string[]>(tasks.map(t => [t.id, []]));
  for (const t of tasks) {
    for (const dep of new Set(t.dependsOn)) dependents.get(dep)?.push(t.id);
  }

  const due = new Map<string, string>();
  const deadline = addDays(eventDate, -bufferDays);
  for (let i = order.length - 1; i >= 0; i--) {
    const id = order[i];
    let latest = deadline;
    for (const childId of dependents.get(id) ?? []) {
      const child = byId.get(childId);
      const childDue = due.get(childId);
      if (!child || !childDue) continue;
      const childStart = addDays(childDue, -child.durationDays);
      if (childStart < latest) latest = childStart;
    }
    due.set(id, latest);
  }

  const finish = new Map<string, string>();
  for (const id of order) {
    const t = byId.get(id);
    if (!t) continue;
    let start = today;
    for (const dep of t.dependsOn) {
      const depFinish = finish.get(dep);
      if (depFinish && depFinish > start) start = depFinish;
    }
    finish.set(id, t.status === 'done' ? today : addDays(start, t.durationDays));
  }

  const result: Record<string, ScheduleEntry> = {};
  for (const t of tasks) {
    const dueDate = due.get(t.id) ?? deadline;
    result[t.id] = {
      startDate: addDays(dueDate, -t.durationDays),
      dueDate,
      atRisk: t.status !== 'done' && (finish.get(t.id) ?? today) > dueDate,
    };
  }
  return result;
}

/** A task is blocked while any of its prerequisites is not done. Done tasks are never blocked. */
export function getBlockedIds(tasks: Task[]): Set<string> {
  const status = new Map(tasks.map(t => [t.id, t.status]));
  const blocked = new Set<string>();
  for (const t of tasks) {
    if (t.status === 'done') continue;
    if (t.dependsOn.some(dep => status.get(dep) !== 'done')) blocked.add(t.id);
  }
  return blocked;
}
