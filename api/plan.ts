// api/plan.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { buildTasks, assertValidOwners } from '../shared/applyPatch.js';
import { daysBetween, topoSort, todayIST } from '../shared/dependencyEngine.js';
import { AiPlanSchema, EventProfileSchema } from '../shared/schemas.js';
import { AiError, generateStructured } from './_lib/gemini.js';
import { PLAN_SYSTEM, buildPlanUserPrompt } from './_lib/prompts.js';
import { clientIp, rateLimit } from './_lib/rateLimit.js';
import { deepSanitize } from './_lib/sanitize.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const limit = rateLimit(`plan:${clientIp(req.headers['x-forwarded-for'])}`, 10);
  if (!limit.ok) {
    res.setHeader('Retry-After', String(limit.retryAfterSec));
    return res.status(429).json({ error: 'Too many requests. Please wait a moment.' });
  }

  const parsed = EventProfileSchema.safeParse(deepSanitize(req.body));
  if (!parsed.success) {
    return res.status(400).json({
      error: 'Invalid event details',
      details: parsed.error.issues.slice(0, 5).map(i => `${i.path.join('.')}: ${i.message}`),
    });
  }
  const profile = parsed.data;
  const today = todayIST();
  if (daysBetween(today, profile.date) < 3) {
    return res.status(400).json({ error: 'The event date must be at least 3 days from today.' });
  }

  const activeIds = new Set(profile.volunteers.filter(v => v.active).map(v => v.id));
  try {
    const ai = await generateStructured(
      AiPlanSchema,
      { system: PLAN_SYSTEM, user: buildPlanUserPrompt(profile, today), temperature: 0.3 },
      plan => {
        topoSort(plan.tasks);
        assertValidOwners(buildTasks(plan.tasks, profile.date, today), activeIds);
      },
    );
    const tasks = buildTasks(ai.tasks, profile.date, today);
    return res.status(200).json({ tasks, assumptions: ai.assumptions });
  } catch (e) {
    console.error('plan failed', e instanceof Error ? e.message : e);
    const status = e instanceof AiError ? 502 : 500;
    return res.status(status).json({ error: 'Could not generate a plan. Please try again.' });
  }
}
