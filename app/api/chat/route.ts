import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit, checkDurableRateLimit, rateLimitResponse } from '@/lib/rateLimit';
import { hasAiEntitlement, aiLockedResponse } from '@/lib/aiEntitlement';
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

  const body = await req.json();

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  // Model and token cap are pinned server-side: body values are untrusted and
  // letting the client choose would allow expensive models / huge outputs on our key.
  const stream = client.messages.stream({
    model:      'claude-sonnet-4-6',
    max_tokens: Math.min(body.max_tokens ?? 1024, 2048),
    system:     body.system,
    messages:   body.messages,
  });

  const readable = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      try {
        for await (const event of stream) {
          controller.enqueue(enc.encode(`data: ${JSON.stringify(event)}\n\n`));
        }
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
