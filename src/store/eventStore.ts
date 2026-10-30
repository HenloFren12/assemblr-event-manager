// src/store/eventStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { EventProfile } from '../../shared/schemas';

interface EventState {
  profile: EventProfile | null;
  setProfile: (profile: EventProfile) => void;
  reset: () => void;
}

export const useEventStore = create<EventState>()(
  persist(
    set => ({
      profile: null,
      setProfile: profile => set({ profile }),
      reset: () => set({ profile: null }),
    }),
    { name: 'assemblr-event' },
  ),
);
