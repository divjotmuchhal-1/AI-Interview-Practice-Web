import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const FREE_SESSION_LIMIT = 2;
const PRO_SESSION_LIMIT  = 60;

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  const admin = createAdminClient();
  const { data } = await admin
    .from('user_subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (!data) {
    return NextResponse.json({
      status:                   'free',
      sessions_used_this_month: 0,
      session_limit:            FREE_SESSION_LIMIT,
    });
  }

  const resetAt = new Date(data.sessions_reset_at);
  const now     = new Date();
  const needsReset =
    resetAt.getFullYear() !== now.getFullYear() ||
    resetAt.getMonth()    !== now.getMonth();

  if (needsReset) {
    await admin
      .from('user_subscriptions')
      .update({ sessions_used_this_month: 0, sessions_reset_at: now.toISOString() })
      .eq('user_id', user.id);
    data.sessions_used_this_month = 0;
  }

  const limit = data.status === 'pro' ? PRO_SESSION_LIMIT : FREE_SESSION_LIMIT;

  return NextResponse.json({
    status:                   data.status,
    sessions_used_this_month: data.sessions_used_this_month,
    session_limit:            limit,
  });
}
