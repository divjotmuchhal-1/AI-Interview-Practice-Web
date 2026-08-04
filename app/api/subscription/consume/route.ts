import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

// Limits live in the consume_session database function (supabase/consume_session.sql)
// so the check and the increment happen atomically.

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  const admin = createAdminClient();

  // Atomic check-and-increment under a row lock (supabase/consume_session.sql).
  // Read-then-write here would let two concurrent requests both pass the limit
  // check and each grant a session.
  const { data, error } = await admin.rpc('consume_session', { p_user_id: user.id });
  const result = Array.isArray(data) ? data[0] : data;

  if (error || !result) {
    console.error('consume_session failed:', error?.message ?? 'no result');
    return NextResponse.json({ ok: false, error: 'consume_failed' }, { status: 500 });
  }

  if (!result.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: 'session_limit_reached',
        sessions_used_this_month: result.sessions_used,
        session_limit: result.session_limit,
      },
      { status: 403 },
    );
  }

  return NextResponse.json({ ok: true });
}
