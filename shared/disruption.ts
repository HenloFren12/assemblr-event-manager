// shared/disruption.ts
import type { Disruption, EventProfile } from './schemas.js';

/** Applies the deterministic part of a disruption to the profile. The AI handles the rest. */
export function applyDisruptionToProfile(profile: EventProfile, d: Disruption): EventProfile {
  switch (d.kind) {
    case 'volunteer_dropout': {
      const dropped = new Set(d.volunteerIds);
      return {
        ...profile,
        volunteers: profile.volunteers.map(v => (dropped.has(v.id) ? { ...v, active: false } : v)),
      };
    }
    case 'budget_cut':
      return { ...profile, budgetCash: Math.max(0, profile.budgetCash - d.amount) };
    case 'date_shift':
      return { ...profile, date: d.newDate };
    case 'weather':
    case 'custom':
      return profile;
  }
}
