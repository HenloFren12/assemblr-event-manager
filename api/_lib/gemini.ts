// api/_lib/gemini.ts
import type { z } from 'zod';

export class AiError extends Error {}

const MODEL = process.env.GEMINI_MODEL ?? 'gemini-2.5-flash';
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

interface CallOptions {
  system: string;
  user: string;
  temperature?: number;
  timeoutMs?: number;
}

async function callGemini({ system, user, temperature = 0.3, timeoutMs = 25_000 }: CallOptions): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new AiError('GEMINI_API_KEY is not configured');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: 'user', parts: [{ text: user }] }],
        generationConfig: { temperature, responseMimeType: 'application/json' },
      }),
    });
    if (!res.ok) throw new AiError(`Gemini request failed with status ${res.status}`);
    const data = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof text !== 'string') throw new AiError('Gemini returned no text');
    return text;
  } catch (e) {
    if (e instanceof AiError) throw e;
    throw new AiError(e instanceof Error && e.name === 'AbortError' ? 'Gemini request timed out' : 'Gemini request failed');
  } finally {
    clearTimeout(timer);
  }
}

function stripFences(raw: string): string {
  return raw.replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
}

/**
 * Calls the model, validates the JSON with Zod, runs an optional semantic check,
 * and retries ONCE with the validation error appended to the prompt.
 */
export async function generateStructured<S extends z.ZodTypeAny>(
  schema: S,
  opts: CallOptions,
  semanticCheck?: (value: z.infer<S>) => void,
): Promise<z.infer<S>> {
  let lastError = '';
  for (let attempt = 0; attempt < 2; attempt++) {
    const user =
      attempt === 0
        ? opts.user
        : `${opts.user}\n\nYour previous answer was rejected: ${lastError}\nReturn corrected JSON only.`;
    const raw = await callGemini({ ...opts, user });
    try {
      const parsed = schema.parse(JSON.parse(stripFences(raw))) as z.infer<S>;
      semanticCheck?.(parsed);
      return parsed;
    } catch (e) {
      lastError = e instanceof Error ? e.message.slice(0, 600) : 'invalid output';
    }
  }
  throw new AiError(`AI output failed validation: ${lastError}`);
}
