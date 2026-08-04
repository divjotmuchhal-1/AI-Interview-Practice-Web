import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  const { scenario, metrics, grade, events } = await req.json();

  const { error } = await supabase.from('sessions').insert({
    user_id:              user.id,
    scenario_id:          scenario.id,
    scenario_title:       scenario.title,
    scenario_company:     scenario.company,
    scenario_difficulty:  scenario.difficulty,
    duration_ms:          metrics.totalMs,
    prompt_count:         metrics.promptCount,
    test_run_count:       metrics.testRunCount,
    code_edit_count:      metrics.codeEditCount,
    rubber_stamp_rate:    metrics.rubberStampRate,
    recovery_rate:        metrics.recoveryRate,
    acted_before_asked:   metrics.actedBeforeAsked,
    tested_before_asked:  metrics.testedBeforeAsked,
    score_diagnosis:      grade.scores.diagnosis,
    score_independence:   grade.scores.independence,
    score_precision:      grade.scores.precision,
    score_verification:   grade.scores.verification,
    score_recovery:       grade.scores.recovery,
    score_test_ownership: grade.scores.test_ownership,
    headline:   grade.headline,
    strengths:  grade.strengths,
    watchouts:  grade.watchouts,
    evidence:   grade.evidence,
    events,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
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

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ sessions: data ?? [] });
}
