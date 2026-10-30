// src/store/planStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { withSchedule } from '../../shared/applyPatch';
import { todayIST } from '../../shared/dependencyEngine';
import type { Patch, Task, TaskStatus } from '../../shared/schemas';

const MAX_HISTORY = 10;

interface PlanState {
  tasks: Task[];
  assumptions: string[];
  eventDate: string | null;
  lastPatch: Patch | null;
  history: { tasks: Task[]; eventDate: string | null }[];
  setPlan: (tasks: Task[], assumptions: string[], eventDate: string) => void;
  setStatus: (id: string, status: TaskStatus) => void;
  delayTask: (id: string, extraDays: number) => void;
  applyReplan: (tasks: Task[], patch: Patch, eventDate: string) => void;
  undo: () => void;
  reset: () => void;
}

export const usePlanStore = create<PlanState>()(
  persist(
    (set, get) => ({
      tasks: [],
      assumptions: [],
      eventDate: null,
      lastPatch: null,
      history: [],

      setPlan: (tasks, assumptions, eventDate) =>
        set({ tasks, assumptions, eventDate, lastPatch: null, history: [] }),

      setStatus: (id, status) =>
        set(s => ({ tasks: s.tasks.map(t => (t.id === id ? { ...t, status } : t)) })),

      // A delayed task needs more days. Due dates of its prerequisites are recomputed automatically.
      delayTask: (id, extraDays) => {
        const { tasks, eventDate } = get();
        if (!eventDate || extraDays < 1) return;
        const next = tasks.map(t =>
          t.id === id ? { ...t, durationDays: Math.min(60, t.durationDays + extraDays) } : t,
        );
        set({ tasks: withSchedule(next, eventDate, todayIST()) });
      },

      applyReplan: (tasks, patch, eventDate) =>
        set(s => ({
          history: [{ tasks: s.tasks, eventDate: s.eventDate }, ...s.history].slice(0, MAX_HISTORY),
          tasks,
          lastPatch: patch,
          eventDate,
        })),

      undo: () =>
        set(s => {
          const [previous, ...rest] = s.history;
          if (!previous) return s;
          return { tasks: previous.tasks, eventDate: previous.eventDate, history: rest, lastPatch: null };
        }),

      reset: () => set({ tasks: [], assumptions: [], eventDate: null, lastPatch: null, history: [] }),
    }),
    {
      name: 'assemblr-plan',
      partialize: s => ({ tasks: s.tasks, assumptions: s.assumptions, eventDate: s.eventDate }),
    },
  ),
);
