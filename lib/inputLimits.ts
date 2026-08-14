/**
 * Request-size guards for AI endpoints.
 *
 * `max_tokens` on the Anthropic call caps OUTPUT only. Without an input cap a
 * caller can paste an arbitrarily large payload (App Router route handlers have
 * no default body-size limit), and input tokens are billed. These caps bound the
 * per-request cost; the rate limiters in lib/rateLimit.ts bound the request count.
 *
 * Sizing: the largest real scenario context is ~5k characters. Caps are set well
 * above realistic usage so legitimate sessions are never rejected.
 */

// ~4 characters per token, so 80k chars is roughly 20k input tokens.
export const MAX_CHARS = {
  // Sized so that even a request at the cap, on a fully uncached prefix, keeps
  // the worst-case cost of a session pack below what the pack sells for.
  chat:     40_000,
  grade:    40_000,
  solution: 40_000,
} as const;

export const MAX_MESSAGES = 60;

export function tooLargeResponse(limit: number): Response {
  return Response.json(
    { error: 'request_too_large', message: `Request exceeds the ${limit} character limit.` },
    { status: 413 },
  );
}

// The complementary optional members (`response?` / `data?`) let TypeScript
// narrow this union reliably at call sites via `if (!result.ok)`.
export type ReadResult<T> =
  | { ok: true;  data: T;          response?: undefined }
  | { ok: false; data?: undefined; response: Response };

/**
 * Read and parse a JSON body, rejecting oversized payloads before they are
 * parsed (and before they reach the AI provider).
 */
export async function readJsonCapped<T = unknown>(
  req: Request,
  maxChars: number,
): Promise<ReadResult<T>> {
  // Fast path: trust Content-Length to reject obvious abuse without buffering.
  const declared = Number(req.headers.get('content-length') ?? 0);
  if (declared > maxChars * 2) return { ok: false, response: tooLargeResponse(maxChars) };

  const raw = await req.text();
  if (raw.length > maxChars) return { ok: false, response: tooLargeResponse(maxChars) };

  try {
    return { ok: true, data: JSON.parse(raw) as T };
  } catch {
    return { ok: false, response: Response.json({ error: 'invalid_json' }, { status: 400 }) };
  }
}

/** Total character count of the text actually sent to the model. */
export function promptSize(system: unknown, messages: unknown): number {
  const textOf = (v: unknown): string => {
    if (typeof v === 'string') return v;
    if (Array.isArray(v)) return v.map(textOf).join('');
    if (v && typeof v === 'object') {
      const o = v as Record<string, unknown>;
      return (typeof o.text === 'string' ? o.text : '') + (o.content ? textOf(o.content) : '');
    }
    return '';
  };
  return textOf(system).length + textOf(messages).length;
}
