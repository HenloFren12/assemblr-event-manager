// shared/applyPatch.test.ts
import { describe, it, expect } from 'vitest';
import { PatchError, applyPatch, buildTasks } from './applyPatch';
import { GraphError } from './dependencyEngine';
import { EMPTY_PATCH, mk } from './testUtils';

const EVENT = '2026-11-20';
const TODAY = '2026-10-30';

describe('applyPatch', () => {
  const base = [mk('t1', [], 2), mk('t2', ['t1'], 1)];

  it('removes a task and strips it from dependsOn', () => {
    const out = applyPatch(base, { ...EMPTY_PATCH, removed: ['t1'] }, EVENT, TODAY);
    expect(out.map(t => t.id)).toEqual(['t2']);
    expect(out[0].dependsOn).toEqual([]);
  });

  it('applies field changes without touching other tasks', () => {
    const patch = { ...EMPTY_PATCH, modified: [{ id: 't2', changes: { priority: 'nice' as const } }] };
    const out = applyPatch(base, patch, EVENT, TODAY);
    expect(out.find(t => t.id === 't2')?.priority).toBe('nice');
    expect(out.find(t => t.id === 't1')?.priority).toBe('must');
  });

  it('adds new tasks as todo and reschedules everything', () => {
    const added = { id: 't3', title: 'Setup', category: 'misc' as const, ownerId: null, dependsOn: ['t2'],
      durationDays: 1, priority: 'must' as const, costEstimate: 0 };
    const out = applyPatch(base, { ...EMPTY_PATCH, added: [added] }, EVENT, TODAY);
    const byId = Object.fromEntries(out.map(t => [t.id, t]));
    expect(byId.t3.status).toBe('todo');
    expect(byId.t3.dueDate).toBe('2026-11-18');
    expect(byId.t2.dueDate).toBe('2026-11-17');
    expect(byId.t1.dueDate).toBe('2026-11-16');
  });

  it('rejects unknown ids, duplicate ids and edits to completed tasks', () => {
    expect(() => applyPatch(base, { ...EMPTY_PATCH, removed: ['t9'] }, EVENT, TODAY)).toThrow(PatchError);
    expect(() => applyPatch(base, { ...EMPTY_PATCH, modified: [{ id: 't9', changes: {} }] }, EVENT, TODAY)).toThrow(PatchError);
    const dup = { id: 't1', title: 'x', category: 'misc' as const, ownerId: null, dependsOn: [],
      durationDays: 1, priority: 'must' as const, costEstimate: 0 };
    expect(() => applyPatch(base, { ...EMPTY_PATCH, added: [dup] }, EVENT, TODAY)).toThrow(/already exists/);
    const withDone = [mk('t1', [], 1, { status: 'done' })];
    expect(() => applyPatch(withDone, { ...EMPTY_PATCH, removed: ['t1'] }, EVENT, TODAY)).toThrow(/completed/);
  });

  it('throws GraphError when the patch creates a cycle', () => {
    const patch = { ...EMPTY_PATCH, modified: [{ id: 't1', changes: { dependsOn: ['t2'] } }] };
    expect(() => applyPatch(base, patch, EVENT, TODAY)).toThrow(GraphError);
  });

  it('forces reassignment away from inactive volunteers', () => {
    const owned = [mk('t1', [], 1, { ownerId: 'v2' })];
    const active = new Set(['v1']);
    expect(() => applyPatch(owned, EMPTY_PATCH, EVENT, TODAY, active)).toThrow(/inactive or unknown/);
    const fix = { ...EMPTY_PATCH, modified: [{ id: 't1', changes: { ownerId: 'v1' } }] };
    expect(applyPatch(owned, fix, EVENT, TODAY, active)[0].ownerId).toBe('v1');
  });

  it('ignores owners of completed tasks during validation', () => {
    const owned = [mk('t1', [], 1, { ownerId: 'v2', status: 'done' })];
    expect(() => applyPatch(owned, EMPTY_PATCH, EVENT, TODAY, new Set(['v1']))).not.toThrow();
  });
});

describe('buildTasks', () => {
  it('creates todo tasks with computed due dates', () => {
    const ai = [
      { id: 't1', title: 'Permit', category: 'permits' as const, ownerId: null, dependsOn: [],
        durationDays: 3, priority: 'must' as const, costEstimate: 0 },
      { id: 't2', title: 'Sound', category: 'sound' as const, ownerId: null, dependsOn: ['t1'],
        durationDays: 2, priority: 'should' as const, costEstimate: 3000 },
    ];
    const out = buildTasks(ai, EVENT, TODAY);
    expect(out.every(t => t.status === 'todo')).toBe(true);
    expect(out[0].dueDate).toBe('2026-11-16');
    expect(out[1].dueDate).toBe('2026-11-18');
  });
});
