import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkRateLimit, rateLimitResponse } from '@/lib/rateLimit';
import { readJsonCapped } from '@/lib/inputLimits';
import { str, nullableNum, obj } from '@/lib/validate';
import { MOMENTS } from '@/lib/researchPrompts';

const MAX_NOTE = 2_000;
// Answers are a handful of short ids plus one free-text note, so the whole
// payload is tiny. The cap exists to keep a scripted client from using the
// table as storage.
const MAX_RESEARCH_CHARS = 20_000;

// Options are authored as [id, label] pairs in a .js module, so TypeScript
// widens them to string[] rather than a tuple. Only index 0 is read here.
type Question = { id: string; multi?: boolean; options: string[][] };

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  const rl = checkRateLimit(user.id, 'research', 12);
  if (!rl.ok) return rateLimitResponse(rl.retryAfter!);

  const parsed = await readJsonCapped<Record<string, unknown>>(req, MAX_RESEARCH_CHARS);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;

  const moment = str(body?.moment, 40);
  const spec = (MOMENTS as Record<string, { questions: Question[] }>)[moment];
  if (!spec) return NextResponse.json({ ok: false, error: 'unknown_moment' }, { status: 400 });

  // Answers are rebuilt from the server's own question set rather than trusted
  // from the client. Without this the table would accept any key and any value,
  // and the tally views downstream would be reporting whatever a caller chose
  // to send instead of what the survey actually asked.
  const submitted = obj(body?.answers);
  const answers: Record<string, string | string[]> = {};

  for (const q of spec.questions) {
    const raw = submitted[q.id];
    if (raw === undefined || raw === null) continue;
    const valid = new Set(q.options.map((o) => o[0]));

    if (q.multi) {
      if (!Array.isArray(raw)) continue;
      const picked = raw.filter((v): v is string => typeof v === 'string' && valid.has(v));
      if (picked.length > 0) answers[q.id] = picked;
    } else if (typeof raw === 'string' && valid.has(raw)) {
      answers[q.id] = raw;
    }
  }

  const note = str(submitted.note, MAX_NOTE).trim();
  if (note) answers.note = note;

  // A prompt that was shown and dismissed with nothing chosen is not worth a
  // row, but it is worth not asking again. The client marks it seen either way.
  if (Object.keys(answers).length === 0) {
    return NextResponse.json({ ok: true, stored: false });
  }

  const attemptId = str(body?.attemptId, 64);
  const admin = createAdminClient();
  const { error } = await admin.from('user_research').insert({
    user_id:        user.id,
    user_email:     user.email ?? null,
    moment,
    answers,
    scenario_id:    str(body?.scenarioId, 200) || null,
    scenario_title: str(body?.scenarioTitle, 300) || null,
    part_index:     nullableNum(body?.partIndex, 0, 100),
    // Postgres rejects '' for uuid, so an absent attempt has to be null.
    attempt_id:     /^[0-9a-f-]{36}$/i.test(attemptId) ? attemptId : null,
  });

  if (error) {
    // Never surface this to the user: a failed survey write must not look like
    // a failed action. The client ignores the status and closes regardless.
    console.error('research insert failed:', error.message);
    return NextResponse.json({ ok: false, error: 'insert_failed' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, stored: true });
}
