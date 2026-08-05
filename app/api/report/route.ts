import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkRateLimit, rateLimitResponse } from '@/lib/rateLimit';
import { readJsonCapped } from '@/lib/inputLimits';

const MAX_DESCRIPTION = 5000;
// Reports carry a code snapshot; cap the whole payload so the table cannot be
// bloated with arbitrarily large bodies.
const MAX_REPORT_CHARS = 200_000;

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  const rl = checkRateLimit(user.id, 'report', 5);
  if (!rl.ok) return rateLimitResponse(rl.retryAfter!);

  const parsed = await readJsonCapped<Record<string, unknown>>(req, MAX_REPORT_CHARS);
  if (!parsed.ok) return parsed.response;

  const body = parsed.data;
  const description = (body?.description ?? '').toString().trim();
  if (!description) {
    return NextResponse.json({ ok: false, error: 'description_required' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin.from('issue_reports').insert({
    user_id:        user.id,
    user_email:     user.email ?? null,
    scenario_id:    (body?.scenarioId ?? '').toString().slice(0, 200),
    scenario_title: (body?.scenarioTitle ?? '').toString().slice(0, 300),
    part_index:     Number.isInteger(body?.partIndex) ? body.partIndex : null,
    part_title:     (body?.partTitle ?? '').toString().slice(0, 300),
    description:    description.slice(0, MAX_DESCRIPTION),
    code_snapshot:  body?.files && typeof body.files === 'object' ? body.files : null,
  });

  if (error) {
    // Table missing or insert failure: client falls back to the mailto path.
    console.error('issue report insert failed:', error.message);
    return NextResponse.json({ ok: false, error: 'insert_failed' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
