// shared/readiness.test.ts
import { describe, it, expect } from 'vitest';
import { computeReadiness, readinessBreakdown } from './readiness';
import { mk } from './testUtils';

const ok = { t1: { atRisk: false }, t2: { atRisk: false } };

describe('computeReadiness', () => {
  it('returns 0 for an empty plan', () => {
    expect(computeReadiness([], {}, 1000, new Set())).toBe(0);
  });

  it('scores 90 when all open tasks are owned, on time and affordable', () => {
    const tasks = [mk('t1', [], 1, { ownerId: 'v1' }), mk('t2', [], 1, { ownerId: 'v1' })];
    expect(computeReadiness(tasks, ok, 1000, new Set(['v1']))).toBe(90);
  });

  it('scores 100 when everything is done', () => {
    const tasks = [mk('t1', [], 1, { status: 'done' }), mk('t2', [], 1, { status: 'done' })];
    expect(computeReadiness(tasks, ok, 0, new Set())).toBe(100);
  });

  it('drops when a volunteer becomes inactive', () => {
    const tasks = [mk('t1', [], 1, { ownerId: 'v1' }), mk('t2', [], 1, { ownerId: 'v2' })];
    expect(computeReadiness(tasks, ok, 1000, new Set(['v1']))).toBe(73);
  });

  it('drops when the budget covers only half the estimated cost', () => {
    const tasks = [
      mk('t1', [], 1, { ownerId: 'v1', costEstimate: 10000 }),
      mk('t2', [], 1, { ownerId: 'v1', costEstimate: 10000 }),
    ];
    expect(computeReadiness(tasks, ok, 10000, new Set(['v1']))).toBe(80);
  });

  it('weights must-have tasks above nice-to-have tasks', () => {
    const tasks = [
      mk('t1', [], 1, { ownerId: null, priority: 'nice' }),
      mk('t2', [], 1, { ownerId: 'v1', priority: 'must' }),
    ];
    const score = computeReadiness(tasks, ok, 1000, new Set(['v1']));
    expect(score).toBeGreaterThan(80);
  });

  it('never leaves the 0 to 100 range', () => {
    const tasks = [mk('t1', [], 1, { costEstimate: 1e9 })];
    const score = computeReadiness(tasks, { t1: { atRisk: true } }, 0, new Set());
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it('explains the score component by component', () => {
    const tasks = [mk('t1', [], 1, { ownerId: 'v1' }), mk('t2', [], 1, { ownerId: 'v2' })];
    expect(readinessBreakdown(tasks, ok, 1000, new Set(['v1']))).toEqual({
      ownership: 50, schedule: 100, budget: 100, progress: 0, score: 73,
    });
  });

  it('returns all zeros for an empty plan', () => {
    expect(readinessBreakdown([], {}, 1000, new Set())).toEqual({
      ownership: 0, schedule: 0, budget: 0, progress: 0, score: 0,
    });
  });
});
