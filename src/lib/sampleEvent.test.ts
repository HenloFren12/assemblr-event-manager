// src/lib/sampleEvent.test.ts
import { describe, expect, it } from 'vitest';
import { assertValidOwners } from '../../shared/applyPatch';
import { topoSort } from '../../shared/dependencyEngine';
import { EventProfileSchema, TaskSchema } from '../../shared/schemas';
import { buildSampleEvent } from './sampleEvent';

describe('buildSampleEvent', () => {
  const { profile, tasks } = buildSampleEvent('2026-10-30');

  it('produces a valid profile and valid tasks', () => {
    expect(EventProfileSchema.safeParse(profile).success).toBe(true);
    expect(tasks.every(t => TaskSchema.safeParse(t).success)).toBe(true);
  });
  it('has an acyclic graph and only active owners', () => {
    expect(() => topoSort(tasks)).not.toThrow();
    const active = new Set(profile.volunteers.filter(v => v.active).map(v => v.id));
    expect(() => assertValidOwners(tasks, active)).not.toThrow();
  });
  it('is dated 21 days after the supplied day', () => {
    expect(profile.date).toBe('2026-11-20');
  });
});
