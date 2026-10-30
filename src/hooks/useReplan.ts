// src/hooks/useReplan.ts
import { useCallback, useState } from 'react';
import { applyDisruptionToProfile } from '../../shared/disruption';
import type { Disruption } from '../../shared/schemas';
import { replan } from '../lib/apiClient';
import { useEventStore } from '../store/eventStore';
import { usePlanStore } from '../store/planStore';

export function useReplan() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async (disruption: Disruption): Promise<boolean> => {
    const { profile, setProfile } = useEventStore.getState();
    const { tasks, applyReplan } = usePlanStore.getState();
    if (!profile || tasks.length === 0) return false;
    setBusy(true);
    setError(null);
    try {
      const updatedProfile = applyDisruptionToProfile(profile, disruption);
      const res = await replan({ profile: updatedProfile, tasks, disruption });
      setProfile(updatedProfile); // commit only after the AI patch succeeded
      applyReplan(res.tasks, res.patch, updatedProfile.date);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
      return false;
    } finally {
      setBusy(false);
    }
  }, []);

  return { run, busy, error };
}
