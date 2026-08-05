import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit, checkDurableRateLimit, rateLimitResponse } from '@/lib/rateLimit';
import { hasAiEntitlement, aiLockedResponse } from '@/lib/aiEntitlement';
import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  const rl = checkRateLimit(user.id, 'grade', 5);
  if (!rl.ok) return rateLimitResponse(rl.retryAfter!);

  const durable = await checkDurableRateLimit(user.id, 'grade');
  if (!durable.ok) return rateLimitResponse(durable.retryAfter!);

  // AI grading is a paid-session feature: spamming end-session while over the
  // limit must not burn API spend.
  if (!(await hasAiEntitlement(user.id))) return aiLockedResponse();

  const { prompt } = await req.json();
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const msg = await client.messages.create({
    model:      'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    messages:   [{ role: 'user', content: prompt }],
  });

  const block = msg.content[0];
  const text = block?.type === 'text' ? block.text : '';
  return Response.json({ text });
}
