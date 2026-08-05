import { createAdminClient } from '@/lib/supabase/admin';

const WINDOW_MS = 60_000;

const store = new Map<string, { count: number; resetAt: number }>();

// Prune expired entries to prevent unbounded memory growth
function prune() {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.resetAt) store.delete(key);
  }
}

export interface RateLimitResult {
  ok: boolean;
  retryAfter?: number; // seconds until the window resets
}

export function checkRateLimit(userId: string, route: string, limit: number): RateLimitResult {
  const key = `${userId}:${route}`;
  const now = Date.now();

  if (store.size > 10_000) prune();

  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { ok: true };
  }

  if (entry.count >= limit) {
    return { ok: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
  }

  entry.count++;
  return { ok: true };
}

export function rateLimitResponse(retryAfter: number): Response {
  return new Response('Too Many Requests', {
    status: 429,
    headers: { 'Retry-After': String(retryAfter) },
  });
}

// ── Durable limits (survive serverless instance recycling) ──────────────────
//
// The in-memory limiter above is per-instance: it stops bursts, but a user
// spreading requests across recycled instances effectively bypasses it. These
// hourly/daily ceilings are counted in Postgres (supabase/rate_limits.sql), so
// they hold no matter which instance serves the request. They are the actual
// protection against credit drain.

export const AI_LIMITS = {
  chat:     { hourly: 100, daily: 400 },
  grade:    { hourly: 20,  daily: 60  },
  solution: { hourly: 20,  daily: 60  },
} as const;

export interface DurableLimitResult {
  ok: boolean;
  retryAfter?: number;
  scope?: 'hourly' | 'daily';
}

async function checkWindow(
  userId: string,
  route: string,
  limit: number,
  windowSeconds: number,
): Promise<{ ok: boolean; retryAfter: number } | null> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc('check_rate_limit', {
    p_user_id: userId,
    p_route: route,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });
  if (error) return null; // caller decides how to handle infrastructure failure
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return null;
  const resetAt = new Date(row.reset_at).getTime();
  return { ok: row.allowed, retryAfter: Math.max(1, Math.ceil((resetAt - Date.now()) / 1000)) };
}

/**
 * Enforce hourly and daily ceilings for an AI route.
 * On database failure this falls back to allowing the request: the per-minute
 * in-memory limiter still applies, so a DB outage degrades protection rather
 * than taking the whole app down.
 */
export async function checkDurableRateLimit(
  userId: string,
  route: keyof typeof AI_LIMITS,
): Promise<DurableLimitResult> {
  const { hourly, daily } = AI_LIMITS[route];

  const hour = await checkWindow(userId, `${route}:h`, hourly, 3600);
  if (hour && !hour.ok) return { ok: false, retryAfter: hour.retryAfter, scope: 'hourly' };

  const day = await checkWindow(userId, `${route}:d`, daily, 86_400);
  if (day && !day.ok) return { ok: false, retryAfter: day.retryAfter, scope: 'daily' };

  return { ok: true };
}
