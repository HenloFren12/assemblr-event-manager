// api/_lib/gemini.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { rateLimit } from './rateLimit';
import { deepSanitize, stripTags } from './sanitize';

const Schema = z.object({ ok: z.boolean() });

function geminiReply(text: string) {
  return { ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text }] } }] }) };
}

describe('generateStructured', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.GEMINI_API_KEY = 'test-key';
  });
  afterEach(() => vi.unstubAllGlobals());

  it('returns parsed JSON on the first valid answer', async () => {
    const fetchMock = vi.fn().mockResolvedValue(geminiReply('{"ok":true}'));
    vi.stubGlobal('fetch', fetchMock);
    const { generateStructured } = await import('./gemini');
    await expect(generateStructured(Schema, { system: 's', user: 'u' })).resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('strips markdown fences and retries once after invalid JSON', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(geminiReply('not json'))
      .mockResolvedValueOnce(geminiReply('```json\n{"ok":true}\n```'));
    vi.stubGlobal('fetch', fetchMock);
    const { generateStructured } = await import('./gemini');
    await expect(generateStructured(Schema, { system: 's', user: 'u' })).resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const secondBody = JSON.parse(fetchMock.mock.calls[1][1].body as string);
    expect(secondBody.contents[0].parts[0].text).toContain('previous answer was rejected');
  });

  it('retries when the semantic check fails, then gives up with AiError', async () => {
    const fetchMock = vi.fn().mockResolvedValue(geminiReply('{"ok":true}'));
    vi.stubGlobal('fetch', fetchMock);
    const { generateStructured, AiError } = await import('./gemini');
    await expect(
      generateStructured(Schema, { system: 's', user: 'u' }, () => { throw new Error('bad graph'); }),
    ).rejects.toBeInstanceOf(AiError);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('throws AiError when the API key is missing or the API errors', async () => {
    const { generateStructured, AiError } = await import('./gemini');
    delete process.env.GEMINI_API_KEY;
    await expect(generateStructured(Schema, { system: 's', user: 'u' })).rejects.toBeInstanceOf(AiError);
    process.env.GEMINI_API_KEY = 'k';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 429, json: async () => ({}) }));
    await expect(generateStructured(Schema, { system: 's', user: 'u' })).rejects.toThrow(/429/);
  });
});

describe('rateLimit', () => {
  it('blocks after the limit and recovers after the window', () => {
    const t0 = 1_000_000;
    expect(rateLimit('k1', 2, 60_000, t0).ok).toBe(true);
    expect(rateLimit('k1', 2, 60_000, t0 + 1000).ok).toBe(true);
    const blocked = rateLimit('k1', 2, 60_000, t0 + 2000);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
    expect(rateLimit('k1', 2, 60_000, t0 + 61_000).ok).toBe(true);
  });
  it('tracks keys independently', () => {
    expect(rateLimit('a', 1, 60_000, 5).ok).toBe(true);
    expect(rateLimit('b', 1, 60_000, 5).ok).toBe(true);
  });
});

describe('sanitize', () => {
  it('strips tags and control characters', () => {
    expect(stripTags('<script>alert(1)</script>Hello\u0000')).toBe('alert(1)Hello');
  });
  it('sanitizes nested values and leaves numbers alone', () => {
    expect(deepSanitize({ a: '<b>x</b>', n: 5, list: ['<i>y</i>'], nested: { z: null } }))
      .toEqual({ a: 'x', n: 5, list: ['y'], nested: { z: null } });
  });
});
