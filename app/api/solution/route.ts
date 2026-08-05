import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit, checkDurableRateLimit, rateLimitResponse } from '@/lib/rateLimit';
import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  const rl = checkRateLimit(user.id, 'solution', 10);
  if (!rl.ok) return rateLimitResponse(rl.retryAfter!);

  const durable = await checkDurableRateLimit(user.id, 'solution');
  if (!durable.ok) return rateLimitResponse(durable.retryAfter!);

  const { buggyCode, readme, partTitle, language } = await req.json();
  if (!buggyCode || !readme) return new Response('Missing fields', { status: 400 });

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const lang = language ?? 'Python';
  const fence = lang.toLowerCase() === 'sql' ? 'sql'
    : lang.toLowerCase().startsWith('type') ? 'typescript'
    : lang.toLowerCase().startsWith('java') ? 'javascript'
    : lang.toLowerCase();

  const prompt = `You are reviewing a buggy ${lang} implementation from a coding interview practice scenario.

Part: ${partTitle ?? 'Unknown'}

README (describes what is wrong):
${readme}

Buggy code (comments mark the bugs):
\`\`\`${fence}
${buggyCode}
\`\`\`

Produce a JSON object with exactly two keys:
- "fixedCode": the complete corrected ${lang} code as a string (no markdown fences, just the raw code). Only fix the bugs described; do not restructure anything else.
- "explanation": 2–4 sentences explaining what lines changed and why each change makes the code correct. Be specific about the line(s) that changed.

Respond with only the JSON object, no surrounding text.`;

  const msg = await client.messages.create({
    model:      'claude-haiku-4-5-20251001',
    max_tokens: 1500,
    messages:   [{ role: 'user', content: prompt }],
  });

  const block = msg.content[0];
  const raw = block?.type === 'text' ? block.text.trim() : '{}';

  try {
    // Strip possible markdown code fences the model may add
    const clean = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    const parsed = JSON.parse(clean);
    return Response.json(parsed);
  } catch {
    return Response.json({ fixedCode: '', explanation: raw });
  }
}
