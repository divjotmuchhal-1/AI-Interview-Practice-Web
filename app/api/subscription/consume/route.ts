import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const FREE_SESSION_LIMIT = 2;
const PRO_SESSION_LIMIT  = 60;

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  const admin = createAdminClient();
  const { data: existing } = await admin
    .from('user_subscriptions')
    .select('sessions_used_this_month, sessions_reset_at, status')
    .eq('user_id', user.id)
    .single();

  const now        = new Date();
  const resetAt    = existing ? new Date(existing.sessions_reset_at) : new Date(0);
  const needsReset =
    resetAt.getFullYear() !== now.getFullYear() ||
    resetAt.getMonth()    !== now.getMonth();

  const currentUsed = needsReset ? 0 : (existing?.sessions_used_this_month ?? 0);
  const limit       = existing?.status === 'pro' ? PRO_SESSION_LIMIT : FREE_SESSION_LIMIT;

  if (currentUsed >= limit) {
    return NextResponse.json(
      { ok: false, error: 'session_limit_reached', sessions_used_this_month: currentUsed, session_limit: limit },
      { status: 403 },
    );
  }

  await admin.from('user_subscriptions').upsert({
    user_id:                  user.id,
    sessions_used_this_month: currentUsed + 1,
    sessions_reset_at:        needsReset ? now.toISOString() : (existing?.sessions_reset_at ?? now.toISOString()),
    updated_at:               now.toISOString(),
  });

  return NextResponse.json({ ok: true });
}
