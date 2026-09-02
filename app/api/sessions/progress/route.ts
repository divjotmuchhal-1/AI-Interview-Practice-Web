import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { readJsonCapped } from '@/lib/inputLimits';
import { num, requiredStr, cappedArray } from '@/lib/validate';

// Heartbeat from an open workspace. Records how far a session got and what the
// user did, so an abandoned attempt leaves the same evidence a completed one
// does. Fires every 30s and once more on pagehide.
//
// This is the only way to tell a user who quit after 20 seconds from one who
// worked for 20 minutes and got stuck, and those need opposite fixes.

// A session's event log is the payload. Long sessions reach tens of KB; the cap
// is generous enough not to truncate a real one and small enough that a forged
// request cannot dump megabytes into the row.
const MAX_PROGRESS_CHARS = 300_000;
const MAX_EVENTS = 2_000;
const MAX_EVENTS_CHARS = 250_000;

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  const parsed = await readJsonCapped<{
    attemptId?: unknown; events?: unknown; partIndex?: unknown;
  }>(req, MAX_PROGRESS_CHARS);
  if (!parsed.ok) return parsed.response;

  const attemptId = requiredStr(parsed.data.attemptId, 64);
  if (!attemptId) return NextResponse.json({ error: 'attempt_required' }, { status: 400 });

  // record_session_progress verifies the attempt belongs to this user, so a
  // guessed id cannot write progress onto someone else's row.
  const admin = createAdminClient();
  const { data, error } = await admin.rpc('record_session_progress', {
    p_attempt_id: attemptId,
    p_user_id:    user.id,
    p_events:     cappedArray(parsed.data.events, MAX_EVENTS, MAX_EVENTS_CHARS),
    p_part_index: num(parsed.data.partIndex, 0, 50),
  });

  if (error) {
    // Telemetry must never surface to the user. The client ignores this.
    console.error('record_session_progress failed:', error.message);
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  return NextResponse.json({ ok: data !== false });
}
