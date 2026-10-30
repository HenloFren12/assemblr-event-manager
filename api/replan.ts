// api/replan.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyPatch } from '../shared/applyPatch.js';
import { todayIST } from '../shared/dependencyEngine.js';
import { PatchSchema, ReplanRequestSchema } from '../shared/schemas.js';
import { AiError, generateStructured } from './_lib/gemini.js';
import { REPLAN_SYSTEM, buildReplanUserPrompt } from './_lib/prompts.js';
import { clientIp, rateLimit } from './_lib/rateLimit.js';
import { deepSanitize } from './_lib/sanitize.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const limit = rateLimit(`replan:${clientIp(req.headers['x-forwarded-for'])}`, 20);
  if (!limit.ok) {
    res.setHeader('Retry-After', String(limit.retryAfterSec));
    return res.status(429).json({ error: 'Too many requests. Please wait a moment.' });
  }

  const parsed = ReplanRequestSchema.safeParse(deepSanitize(req.body));
  if (!parsed.success) {
    return res.status(400).json({
      error: 'Invalid replan request',
      details: parsed.error.issues.slice(0, 5).map(i => `${i.path.join('.')}: ${i.message}`),
    });
  }
  const { profile, tasks, disruption } = parsed.data;
  const today = todayIST();
  const activeIds = new Set(profile.volunteers.filter(v => v.active).map(v => v.id));

  try {
    const patch = await generateStructured(
      PatchSchema,
      { system: REPLAN_SYSTEM, user: buildReplanUserPrompt(profile, tasks, disruption, today), temperature: 0.3 },
      p => {
        applyPatch(tasks, p, profile.date, today, activeIds); // throws if the patch is invalid
      },
    );
    const updated = applyPatch(tasks, patch, profile.date, today, activeIds);
    return res.status(200).json({ patch, tasks: updated });
  } catch (e) {
    console.error('replan failed', e instanceof Error ? e.message : e);
    const status = e instanceof AiError ? 502 : 500;
    return res.status(status).json({ error: 'Could not adapt the plan. Please try again.' });
  }
}
