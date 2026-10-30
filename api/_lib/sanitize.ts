// api/_lib/sanitize.ts

/** Removes HTML tags and control characters from a string. */
export function stripTags(input: string): string {
  return input
    .replace(/<[^>]*>/g, '')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim();
}

/** Recursively sanitizes every string in a JSON-like value. */
export function deepSanitize<T>(value: T): T {
  if (typeof value === 'string') return stripTags(value) as unknown as T;
  if (Array.isArray(value)) return value.map(deepSanitize) as unknown as T;
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, deepSanitize(v)]),
    ) as T;
  }
  return value;
}
