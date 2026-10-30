// api/_lib/rateLimit.ts
// Best-effort, per-instance sliding window. Good enough for a hackathon; use Upstash/Redis for production.
const hits = new Map<string, number[]>();

export function rateLimit(
  key: string,
  limit: number,
  windowMs = 60_000,
  now = Date.now(),
): { ok: boolean; retryAfterSec: number } {
  const recent = (hits.get(key) ?? []).filter(t => now - t < windowMs);
  if (recent.length >= limit) {
    hits.set(key, recent);
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil((windowMs - (now - recent[0])) / 1000)) };
  }
  recent.push(now);
  hits.set(key, recent);

  if (hits.size > 5000) {
    for (const [k, v] of hits) {
      if (v.every(t => now - t >= windowMs)) hits.delete(k);
    }
  }
  return { ok: true, retryAfterSec: 0 };
}

export function clientIp(forwardedFor: string | string[] | undefined): string {
  const raw = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
  return (raw ?? 'unknown').split(',')[0].trim() || 'unknown';
}
