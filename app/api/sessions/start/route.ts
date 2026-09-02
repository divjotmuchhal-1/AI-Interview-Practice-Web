import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { readJsonCapped } from '@/lib/inputLimits';
import { str, requiredStr, bool, obj } from '@/lib/validate';

// Records that a user opened a scenario in the workspace. Fires for every
// start, including practice-mode runs that consume no quota, so abandoned
// attempts are visible. See supabase/session_starts.sql.
//
// Deliberately does not gate on entitlement: this is observation, not
// authorisation. The quota check lives in /api/subscription/consume.

// The body is a handful of short fields; anything larger is not ours.
const MAX_START_CHARS = 4_000;

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  const parsed = await readJsonCapped<{ scenario?: unknown; config?: unknown }>(
    req,
    MAX_START_CHARS,
  );
  if (!parsed.ok) return parsed.response;

  const scenario = obj(parsed.data.scenario);
  const config   = obj(parsed.data.config);

  const scenarioId = requiredStr(scenario.id, 200);
  if (!scenarioId) {
    return NextResponse.json({ error: 'scenario_id_required' }, { status: 400 });
  }

  // The inserted id is returned so the workspace can post heartbeats against
  // this attempt. Without it there is no handle to attach progress to.
  const { data, error } = await supabase.from('session_starts').insert({
    user_id:             user.id,
    scenario_id:         scenarioId,
    scenario_title:      str(scenario.title, 300),
    scenario_difficulty: str(scenario.difficulty, 40),
    ai_enabled:          bool(config.aiEnabled),
    practice_mode:       bool(config.practiceMode),
    hard_mode:           bool(config.hardMode),
    answer_key_allowed:  bool(config.answerKeyAllowed),
  })
    .select('id')
    .single();

  if (error) {
    // Never fail the user's session over telemetry: the client ignores this
    // response and starts the session regardless.
    console.error('session_start insert failed:', error.message);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
  return NextResponse.json({ ok: true, attemptId: data?.id ?? null });
}
