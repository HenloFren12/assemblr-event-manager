// shared/dependencyEngine.test.ts
import { describe, it, expect } from 'vitest';
import {
  GraphError, addDays, computeSchedule, daysBetween, getBlockedIds, todayIST, topoSort,
} from './dependencyEngine';
import { mk } from './testUtils';

describe('addDays / daysBetween / todayIST', () => {
  it('crosses month and year boundaries', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-11-01', -1)).toBe('2026-10-31');
  });
  it('handles leap days', () => {
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
  });
  it('counts days between dates', () => {
    expect(daysBetween('2026-10-30', '2026-11-03')).toBe(4);
  });
  it('uses the IST calendar day, not UTC', () => {
    expect(todayIST(new Date('2026-10-30T20:00:00Z'))).toBe('2026-10-31');
    expect(todayIST(new Date('2026-10-30T10:00:00Z'))).toBe('2026-10-30');
  });
});

describe('topoSort', () => {
  it('puts prerequisites before dependents', () => {
    const order = topoSort([mk('t3', ['t2']), mk('t2', ['t1']), mk('t1')]);
    expect(order.indexOf('t1')).toBeLessThan(order.indexOf('t2'));
    expect(order.indexOf('t2')).toBeLessThan(order.indexOf('t3'));
  });
  it('throws on a cycle', () => {
    expect(() => topoSort([mk('t1', ['t2']), mk('t2', ['t1'])])).toThrow(GraphError);
  });
  it('throws on an unknown dependency', () => {
    expect(() => topoSort([mk('t1', ['t9'])])).toThrow(/unknown task t9/);
  });
  it('throws on a self dependency', () => {
    expect(() => topoSort([mk('t1', ['t1'])])).toThrow(/depends on itself/);
  });
  it('throws on duplicate ids', () => {
    expect(() => topoSort([mk('t1'), mk('t1')])).toThrow(/Duplicate/);
  });
  it('returns an empty array for no tasks', () => {
    expect(topoSort([])).toEqual([]);
  });
});

describe('computeSchedule', () => {
  const chain = [mk('t1', [], 3), mk('t2', ['t1'], 2)];

  it('schedules backwards from the event date minus a 2-day buffer', () => {
    const s = computeSchedule(chain, '2026-11-20', '2026-10-30');
    expect(s.t2.dueDate).toBe('2026-11-18');
    expect(s.t2.startDate).toBe('2026-11-16');
    expect(s.t1.dueDate).toBe('2026-11-16');
    expect(s.t1.startDate).toBe('2026-11-13');
    expect(s.t1.atRisk).toBe(false);
    expect(s.t2.atRisk).toBe(false);
  });

  it('flags tasks that cannot finish in time', () => {
    const s = computeSchedule(chain, '2026-11-03', '2026-10-30');
    expect(s.t1.atRisk).toBe(true);
    expect(s.t2.atRisk).toBe(true);
  });

  it('never flags completed tasks and frees their dependents', () => {
    const done = [mk('t1', [], 3, { status: 'done' }), mk('t2', ['t1'], 2)];
    const s = computeSchedule(done, '2026-11-03', '2026-10-30');
    expect(s.t1.atRisk).toBe(false);
    expect(s.t2.atRisk).toBe(false);
  });

  it('uses the earliest start across several dependents', () => {
    const tasks = [mk('t1', [], 1), mk('t2', ['t1'], 1), mk('t3', ['t1'], 5)];
    const s = computeSchedule(tasks, '2026-11-20', '2026-10-30');
    expect(s.t1.dueDate).toBe('2026-11-13');
  });
});

describe('getBlockedIds', () => {
  it('blocks a task until all prerequisites are done', () => {
    const tasks = [mk('t1'), mk('t2', ['t1'])];
    expect([...getBlockedIds(tasks)]).toEqual(['t2']);
    const after = [mk('t1', [], 1, { status: 'done' }), mk('t2', ['t1'])];
    expect(getBlockedIds(after).size).toBe(0);
  });
  it('never blocks a completed task', () => {
    const tasks = [mk('t1'), mk('t2', ['t1'], 1, { status: 'done' })];
    expect(getBlockedIds(tasks).has('t2')).toBe(false);
  });
});
