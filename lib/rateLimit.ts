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
