// api/outreach.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { OutreachRequestSchema, OutreachResponseSchema } from '../shared/schemas.js';
import { AiError, generateStructured } from './_lib/gemini.js';
import { OUTREACH_SYSTEM, buildOutreachUserPrompt } from './_lib/prompts.js';
import { clientIp, rateLimit } from './_lib/rateLimit.js';
import { deepSanitize } from './_lib/sanitize.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const limit = rateLimit(`outreach:${clientIp(req.headers['x-forwarded-for'])}`, 20);
  if (!limit.ok) {
    res.setHeader('Retry-After', String(limit.retryAfterSec));
    return res.status(429).json({ error: 'Too many requests. Please wait a moment.' });
  }

  const parsed = OutreachRequestSchema.safeParse(deepSanitize(req.body));
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid outreach request' });
  }
  const { profile, kind, audience, language } = parsed.data;

  try {
    const message = await generateStructured(OutreachResponseSchema, {
      system: OUTREACH_SYSTEM,
      user: buildOutreachUserPrompt(profile, kind, audience, language),
      temperature: 0.7,
    });
    return res.status(200).json(message);
  } catch (e) {
    console.error('outreach failed', e instanceof Error ? e.message : e);
    const status = e instanceof AiError ? 502 : 500;
    return res.status(status).json({ error: 'Could not write the message. Please try again.' });
  }
}
