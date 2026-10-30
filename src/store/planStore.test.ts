// src/store/planStore.test.ts
import { beforeEach, describe, expect, it } from 'vitest';
import { EMPTY_PATCH, mk } from '../../shared/testUtils';
import { usePlanStore } from './planStore';

const EVENT = '2099-01-30';

describe('planStore', () => {
  beforeEach(() => usePlanStore.getState().reset());

  it('sets a plan and updates task status', () => {
    const { setPlan, setStatus } = usePlanStore.getState();
    setPlan([mk('t1'), mk('t2', ['t1'])], ['assumed rain-free'], EVENT);
    setStatus('t1', 'done');
    expect(usePlanStore.getState().tasks[0].status).toBe('done');
    expect(usePlanStore.getState().assumptions).toEqual(['assumed rain-free']);
  });

  it('delaying a task lengthens it and pulls its prerequisites earlier', () => {
    const { setPlan, delayTask } = usePlanStore.getState();
    setPlan([mk('t1', [], 1), mk('t2', ['t1'], 2)], [], EVENT);
    delayTask('t2', 3);
    const [t1, t2] = usePlanStore.getState().tasks;
    expect(t2.durationDays).toBe(5);
    // deadline = 30 Jan - 2 days buffer = 28 Jan; t2 now starts 23 Jan, so t1 must finish by then
    expect(t2.dueDate).toBe('2099-01-28');
    expect(t1.dueDate).toBe('2099-01-23');
  });

  it('keeps history on replan and restores it on undo', () => {
    const { setPlan, applyReplan, undo } = usePlanStore.getState();
    const original = [mk('t1'), mk('t2')];
    setPlan(original, [], EVENT);
    applyReplan([mk('t1')], { ...EMPTY_PATCH, removed: ['t2'] }, '2099-01-25');
    expect(usePlanStore.getState().tasks).toHaveLength(1);
    expect(usePlanStore.getState().eventDate).toBe('2099-01-25');
    undo();
    expect(usePlanStore.getState().tasks).toHaveLength(2);
    expect(usePlanStore.getState().eventDate).toBe(EVENT);
    expect(usePlanStore.getState().lastPatch).toBeNull();
  });

  it('undo with no history changes nothing', () => {
    usePlanStore.getState().setPlan([mk('t1')], [], EVENT);
    usePlanStore.getState().undo();
    expect(usePlanStore.getState().tasks).toHaveLength(1);
  });

  it('caps history at 10 snapshots', () => {
    const { setPlan, applyReplan } = usePlanStore.getState();
    setPlan([mk('t1')], [], EVENT);
    for (let i = 0; i < 15; i++) applyReplan([mk('t1')], EMPTY_PATCH, EVENT);
    expect(usePlanStore.getState().history).toHaveLength(10);
  });
});
