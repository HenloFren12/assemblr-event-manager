// shared/budget.test.ts
import { describe, it, expect } from 'vitest';
import { summarizeBudget } from './budget';
import { applyDisruptionToProfile } from './disruption';
import { mk } from './testUtils';
import type { EventProfile } from './schemas';

describe('summarizeBudget', () => {
  it('totals by category and reports the overage', () => {
    const tasks = [
      mk('t1', [], 1, { category: 'food', costEstimate: 8000, inKindOption: 'Ask a local sweet shop' }),
      mk('t2', [], 1, { category: 'food', costEstimate: 2000 }),
      mk('t3', [], 1, { category: 'sound', costEstimate: 5000 }),
    ];
    const s = summarizeBudget(tasks, 12000);
    expect(s.totalEstimated).toBe(15000);
    expect(s.byCategory).toEqual({ food: 10000, sound: 5000 });
    expect(s.overBy).toBe(3000);
    expect(s.remaining).toBe(0);
    expect(s.inKindSavingsPotential).toBe(8000);
  });

  it('handles no tasks and a zero budget', () => {
    const s = summarizeBudget([], 0);
    expect(s).toEqual({ totalEstimated: 0, byCategory: {}, remaining: 0, overBy: 0, inKindSavingsPotential: 0 });
  });
});

describe('applyDisruptionToProfile', () => {
  const profile: EventProfile = {
    type: 'Diwali mela', date: '2026-11-20', attendees: 300, venueType: 'outdoor', budgetCash: 25000,
    inKindNotes: '', volunteers: [
      { id: 'v1', name: 'Asha', skills: [], availability: 'flexible', active: true },
      { id: 'v2', name: 'Ravi', skills: [], availability: 'weekends', active: true },
    ],
    priorities: [], nonNegotiables: [], culturalNotes: '',
  };

  it('marks dropped volunteers inactive and ignores unknown ids', () => {
    const out = applyDisruptionToProfile(profile, { kind: 'volunteer_dropout', volunteerIds: ['v2', 'v9'] });
    expect(out.volunteers.map(v => v.active)).toEqual([true, false]);
    expect(profile.volunteers[1].active).toBe(true);
  });

  it('subtracts a budget cut but never goes below zero', () => {
    expect(applyDisruptionToProfile(profile, { kind: 'budget_cut', amount: 10000 }).budgetCash).toBe(15000);
    expect(applyDisruptionToProfile(profile, { kind: 'budget_cut', amount: 99999 }).budgetCash).toBe(0);
  });

  it('moves the date and leaves the profile alone for weather', () => {
    expect(applyDisruptionToProfile(profile, { kind: 'date_shift', newDate: '2026-11-15' }).date).toBe('2026-11-15');
    expect(applyDisruptionToProfile(profile, { kind: 'weather', note: 'rain' })).toEqual(profile);
  });
});
