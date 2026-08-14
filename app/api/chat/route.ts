import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit, checkDurableRateLimit, rateLimitResponse } from '@/lib/rateLimit';
import { hasAiEntitlement, aiLockedResponse } from '@/lib/aiEntitlement';
import { consumeAiCall, aiBudgetExhaustedResponse } from '@/lib/aiBudget';
import { MAX_CHARS, MAX_MESSAGES, readJsonCapped, promptSize, tooLargeResponse } from '@/lib/inputLimits';
import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  // Burst limit (per instance), then durable hourly/daily ceilings.
  const rl = checkRateLimit(user.id, 'chat', 30);
  if (!rl.ok) return rateLimitResponse(rl.retryAfter!);

  const durable = await checkDurableRateLimit(user.id, 'chat');
  if (!durable.ok) return rateLimitResponse(durable.retryAfter!);

  if (!(await hasAiEntitlement(user.id))) return aiLockedResponse();

  const parsed = await readJsonCapped<{ system?: unknown; messages?: unknown; max_tokens?: number }>(
    req, MAX_CHARS.chat,
  );
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;

  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return Response.json({ error: 'messages_required' }, { status: 400 });
  }
  if (body.messages.length > MAX_MESSAGES) {
    return Response.json({ error: 'too_many_messages' }, { status: 413 });
  }
  // Guard the text that actually reaches the model, not just the raw body.
  if (promptSize(body.system, body.messages) > MAX_CHARS.chat) {
    return tooLargeResponse(MAX_CHARS.chat);
  }

  // Spend one AI call. Placed after validation so a malformed request cannot
  // burn the user's balance, and before the provider call so a rejected request
  // never costs us anything.
  if (!(await consumeAiCall(user.id))) return aiBudgetExhaustedResponse();

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  // Model and token cap are pinned server-side: body values are untrusted and
  // letting the client choose would allow expensive models / huge outputs on our key.
  const stream = client.messages.stream({
    model:      'claude-sonnet-4-6',
    // Coaching replies are one question or observation. Capping output here is
    // the cheapest lever on per-turn cost: output bills at 5x input.
    max_tokens: Math.min(body.max_tokens ?? 600, 600),
    system:     body.system as Anthropic.MessageCreateParams['system'],
    messages:   body.messages as Anthropic.MessageParam[],
  });

  const readable = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      try {
        for await (const event of stream) {
          controller.enqueue(enc.encode(`data: ${JSON.stringify(event)}\n\n`));
        }
      } catch (err) {
        // Provider failures are logged server-side only. The client gets a
        // generic marker so it can show a friendly message without seeing
        // upstream error text.
        console.error('chat stream failed:', err instanceof Error ? err.message : err);
        controller.enqueue(enc.encode(`data: ${JSON.stringify({ type: 'stream_error' })}\n\n`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      'Content-Type':  'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection':    'keep-alive',
    },
  });
}
