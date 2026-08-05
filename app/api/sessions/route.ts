import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { readJsonCapped } from '@/lib/inputLimits';
import { num, score, str, requiredStr, nullableNum, bool, obj, cappedArray } from '@/lib/validate';

// Session event logs are the bulk of the payload; everything else is small.
const MAX_SESSION_CHARS = 500_000;
const MAX_EVENTS = 2_000;
const MAX_EVENTS_CHARS = 400_000;

const DAY_MS = 24 * 60 * 60 * 1000;

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  const parsed = await readJsonCapped<{
    scenario?: unknown; metrics?: unknown; grade?: unknown; events?: unknown;
  }>(req, MAX_SESSION_CHARS);
  if (!parsed.ok) return parsed.response;

  // Every field is coerced and bounded: this body is untrusted regardless of
  // what the UI sends, and unvalidated access here would 500 on a malformed
  // request or write out-of-range values into the table.
  const scenario = obj(parsed.data.scenario);
  const metrics  = obj(parsed.data.metrics);
  const grade    = obj(parsed.data.grade);
  const scores   = obj(grade.scores);

  const scenarioId = requiredStr(scenario.id, 200);
  if (!scenarioId) {
    return NextResponse.json({ error: 'scenario_id_required' }, { status: 400 });
  }

  const { error } = await supabase.from('sessions').insert({
    user_id:              user.id,
    scenario_id:          scenarioId,
    scenario_title:       str(scenario.title, 300),
    scenario_company:     str(scenario.company, 120),
    scenario_difficulty:  str(scenario.difficulty, 40),
    duration_ms:          num(metrics.totalMs, 0, DAY_MS),
    prompt_count:         num(metrics.promptCount, 0, 10_000),
    test_run_count:       num(metrics.testRunCount, 0, 10_000),
    code_edit_count:      num(metrics.codeEditCount, 0, 100_000),
    rubber_stamp_rate:    num(metrics.rubberStampRate, 0, 1),
    recovery_rate:        nullableNum(metrics.recoveryRate, 0, 1),
    acted_before_asked:   bool(metrics.actedBeforeAsked),
    tested_before_asked:  bool(metrics.testedBeforeAsked),
    score_diagnosis:      score(scores.diagnosis),
    score_independence:   score(scores.independence),
    score_precision:      score(scores.precision),
    score_verification:   score(scores.verification),
    score_recovery:       score(scores.recovery),
    score_test_ownership: score(scores.test_ownership),
    headline:   str(grade.headline, 500),
    strengths:  str(grade.strengths, 2_000),
    watchouts:  str(grade.watchouts, 2_000),
    evidence:   obj(grade.evidence),
    events:     cappedArray(parsed.data.events, MAX_EVENTS, MAX_EVENTS_CHARS),
  });

  if (error) {
    console.error('session insert failed:', error.message);
    return NextResponse.json({ error: 'insert_failed' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('user_id', user.id)
    .order('completed_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('session list failed:', error.message);
    return NextResponse.json({ error: 'query_failed' }, { status: 500 });
  }
  return NextResponse.json({ sessions: data ?? [] });
}
