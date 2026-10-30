// api/handlers.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { addDays, todayIST } from '../shared/dependencyEngine';
import type { EventProfile } from '../shared/schemas';

function mockRes() {
  const res = {
    statusCode: 0,
    body: undefined as unknown,
    headers: {} as Record<string, string>,
    status(code: number) { this.statusCode = code; return this; },
    json(payload: unknown) { this.body = payload; return this; },
    setHeader(k: string, v: string) { this.headers[k] = v; return this; },
  };
  return res;
}
const reqOf = (body: unknown, method = 'POST') =>
  ({ method, body, headers: { 'x-forwarded-for': `1.2.3.${Math.floor(Math.random() * 250)}` } }) as never;

const profile: EventProfile = {
  type: 'Diwali mela', date: addDays(todayIST(), 20), attendees: 300, venueType: 'outdoor', budgetCash: 25000,
  inKindNotes: 'School ground donated', priorities: ['safety'], nonNegotiables: [], culturalNotes: '',
  volunteers: [
    { id: 'v1', name: 'Asha', skills: ['logistics'], availability: 'flexible', active: true },
    { id: 'v2', name: 'Ravi', skills: ['sound'], availability: 'weekends', active: true },
  ],
};

const aiPlan = {
  tasks: [
    { id: 't1', title: 'Confirm venue', category: 'venue', ownerId: 'v1', dependsOn: [], durationDays: 2, priority: 'must', costEstimate: 0 },
    { id: 't2', title: 'Sound permit', category: 'permits', ownerId: 'v1', dependsOn: ['t1'], durationDays: 3, priority: 'must', costEstimate: 500 },
    { id: 't3', title: 'Book sound system', category: 'sound', ownerId: 'v2', dependsOn: ['t2'], durationDays: 2, priority: 'should', costEstimate: 4000 },
  ],
  assumptions: ['No rain'],
};

function stubGemini(...answers: unknown[]) {
  const fn = vi.fn();
  for (const a of answers) {
    fn.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(a) }] } }] }) });
  }
  vi.stubGlobal('fetch', fn);
  return fn;
}

describe('API handlers', () => {
  beforeEach(() => { vi.resetModules(); process.env.GEMINI_API_KEY = 'k'; });
  afterEach(() => vi.unstubAllGlobals());

  it('POST /api/plan returns scheduled tasks', async () => {
    stubGemini(aiPlan);
    const { default: handler } = await import('./plan');
    const res = mockRes();
    await handler(reqOf(profile), res as never);
    expect(res.statusCode).toBe(200);
    const body = res.body as { tasks: { id: string; dueDate: string; status: string }[] };
    expect(body.tasks).toHaveLength(3);
    expect(body.tasks.every(t => t.status === 'todo')).toBe(true);
    expect(body.tasks[2].dueDate).toBe(addDays(profile.date, -2));
  });

  it('rejects wrong methods, bad input and too-near dates', async () => {
    const { default: handler } = await import('./plan');
    let res = mockRes();
    await handler(reqOf(profile, 'GET'), res as never);
    expect(res.statusCode).toBe(405);
    res = mockRes();
    await handler(reqOf({ ...profile, attendees: -4 }), res as never);
    expect(res.statusCode).toBe(400);
    res = mockRes();
    await handler(reqOf({ ...profile, date: todayIST() }), res as never);
    expect(res.statusCode).toBe(400);
  });

  it('retries when the AI invents an owner, then succeeds', async () => {
    const bad = { ...aiPlan, tasks: aiPlan.tasks.map(t => (t.id === 't3' ? { ...t, ownerId: 'ghost' } : t)) };
    const fetchMock = stubGemini(bad, aiPlan);
    const { default: handler } = await import('./plan');
    const res = mockRes();
    await handler(reqOf(profile), res as never);
    expect(res.statusCode).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('returns a generic 502 without leaking details when the AI keeps failing', async () => {
    stubGemini({ nope: 1 }, { nope: 2 });
    const { default: handler } = await import('./plan');
    const res = mockRes();
    await handler(reqOf(profile), res as never);
    expect(res.statusCode).toBe(502);
    expect(JSON.stringify(res.body)).not.toMatch(/zod|stack|GEMINI/i);
  });

  it('POST /api/replan reassigns work away from a dropped volunteer', async () => {
    stubGemini(aiPlan);
    const { default: plan } = await import('./plan');
    const planRes = mockRes();
    await plan(reqOf(profile), planRes as never);
    const tasks = (planRes.body as { tasks: unknown[] }).tasks;

    const droppedProfile = { ...profile, volunteers: profile.volunteers.map(v => (v.id === 'v2' ? { ...v, active: false } : v)) };
    const patch = {
      added: [], removed: [], tradeoffs: ['Ravi was the only sound person'], summary: 'Moved sound work to Asha.',
      modified: [{ id: 't3', changes: { ownerId: 'v1', reason: 'Ravi dropped out' } }],
    };
    stubGemini(patch);
    const { default: replan } = await import('./replan');
    const res = mockRes();
    await replan(reqOf({ profile: droppedProfile, tasks, disruption: { kind: 'volunteer_dropout', volunteerIds: ['v2'] } }), res as never);
    expect(res.statusCode).toBe(200);
    const out = res.body as { tasks: { id: string; ownerId: string }[] };
    expect(out.tasks.find(t => t.id === 't3')?.ownerId).toBe('v1');
  });

  it('POST /api/outreach returns WhatsApp and email text', async () => {
    stubGemini({ whatsapp: 'Namaste! Join us.', emailSubject: 'Sponsor our mela', emailBody: 'Dear Sir...' });
    const { default: handler } = await import('./outreach');
    const res = mockRes();
    await handler(reqOf({ profile, kind: 'sponsor', audience: 'Local sweet shop owner', language: 'en' }), res as never);
    expect(res.statusCode).toBe(200);
    expect((res.body as { whatsapp: string }).whatsapp).toContain('Namaste');
  });

  it('rate limits after too many plan requests from one IP', async () => {
    stubGemini(...Array(12).fill(aiPlan));
    const { default: handler } = await import('./plan');
    const sameIp = { method: 'POST', body: profile, headers: { 'x-forwarded-for': '9.9.9.9' } } as never;
    let last = mockRes();
    for (let i = 0; i < 11; i++) { last = mockRes(); await handler(sameIp, last as never); }
    expect(last.statusCode).toBe(429);
    expect(last.headers['Retry-After']).toBeDefined();
  });
});
