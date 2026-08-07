import { createAdminClient } from '@/lib/supabase/admin';
import { sessionLimitFor } from '@/lib/sessionLimits';

// After a user consumes their final session, AI features (chat, grading) stay
// available for this long so the in-flight session can finish normally. The
// window starts at the last consume (updated_at) and cannot be extended while
// locked, because the consume endpoint rejects over-limit requests without
// touching the row.
const LAST_SESSION_GRACE_MS = 3 * 60 * 60 * 1000; // 3 hours

/**
 * Server-side check: is this user currently entitled to AI features?
 * True when they have session quota remaining, or their final consumed
 * session is still within the grace window.
 */
export async function hasAiEntitlement(userId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data: sub } = await admin
    .from('user_subscriptions')
    .select('sessions_used_this_month, sessions_reset_at, status, updated_at, trial_used, trial_used_at')
    .eq('user_id', userId)
    .single();

  if (!sub) return true; // no row yet: brand-new user, nothing consumed

  const now     = new Date();
  const resetAt = new Date(sub.sessions_reset_at);
  const isNewMonth =
    resetAt.getFullYear() !== now.getFullYear() ||
    resetAt.getMonth()    !== now.getMonth();

  const used  = isNewMonth ? 0 : (sub.sessions_used_this_month ?? 0);
  const limit = sessionLimitFor(sub.status, Boolean(sub.trial_used), sub.trial_used_at);

  // An unused tryout still entitles the user, even at quota.
  if (!sub.trial_used) return true;
  if (used < limit) return true;

  const lastConsume = sub.updated_at ? new Date(sub.updated_at).getTime() : 0;
  return now.getTime() - lastConsume < LAST_SESSION_GRACE_MS;
}

export function aiLockedResponse(): Response {
  return Response.json(
    { error: 'ai_feedback_locked', message: 'AI session limit reached for this month.' },
    { status: 403 },
  );
}
