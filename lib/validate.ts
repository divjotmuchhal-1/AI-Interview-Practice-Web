/**
 * Server-side input coercion helpers.
 *
 * Browser validation is a UX affordance, not a control: any client can be
 * bypassed with curl. Every value that reaches the database or an external API
 * is coerced and bounded here, on the server, regardless of what the UI enforces.
 *
 * These helpers never throw. They coerce to a safe value so a malformed request
 * produces a clean 400 or a clamped row, never an unhandled 500.
 */

/**
 * A finite number clamped to [min, max]; `fallback` when absent or unparseable.
 *
 * Non-finite input (NaN, Infinity) returns `fallback` rather than clamping, so
 * posting Infinity cannot be laundered into the maximum allowed value.
 */
export function num(v: unknown, min: number, max: number, fallback = 0): number {
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

/** An integer score in [0, 100]. */
export function score(v: unknown): number {
  return Math.round(num(v, 0, 100, 0));
}

/** A trimmed string truncated to `max`; `fallback` when absent or not a string. */
export function str(v: unknown, max: number, fallback = ''): string {
  if (typeof v !== 'string') return fallback;
  return v.trim().slice(0, max);
}

/** A string that must be present and non-empty, else null (caller returns 400). */
export function requiredStr(v: unknown, max: number): string | null {
  const s = str(v, max);
  return s.length > 0 ? s : null;
}

/** A nullable number: null stays null (used for metrics that are legitimately absent). */
export function nullableNum(v: unknown, min: number, max: number): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : null;
}

export function bool(v: unknown): boolean {
  return v === true;
}

/** A plain object, or {} for anything else (arrays and null included). */
export function obj(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

/**
 * An array capped at `maxItems`, with each item's serialized size bounded so a
 * single request cannot store an unbounded blob.
 */
export function cappedArray(v: unknown, maxItems: number, maxTotalChars: number): unknown[] {
  if (!Array.isArray(v)) return [];
  const items = v.slice(0, maxItems);
  let total = 0;
  const out: unknown[] = [];
  for (const item of items) {
    let size: number;
    try {
      size = JSON.stringify(item)?.length ?? 0;
    } catch {
      continue; // circular or unserializable: drop it
    }
    if (total + size > maxTotalChars) break;
    total += size;
    out.push(item);
  }
  return out;
}
