// Single source of truth for AI session quota.
//
// These numbers and rules are mirrored in supabase/trial_session.sql, which
// enforces them under a row lock. Change both together.

export const FREE_SESSION_LIMIT = 2;
export const PRO_SESSION_LIMIT  = 60;

function isCurrentMonth(iso: string | null | undefined): boolean {
  if (!iso) return false;
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return false;
  const now = new Date();
  return then.getFullYear() === now.getFullYear() && then.getMonth() === now.getMonth();
}

/**
 * How many AI sessions this account may use this month.
 *
 * The free tryout increments the same counter as any other session, so it shows
 * up in ai_sessions_used. To keep it genuinely free, it also adds one to that
 * month's limit: a free user's first session reads "1 of 3 used" and they still
 * have their full monthly allowance left.
 *
 * The bonus is scoped to the month the tryout was spent. trial_used stays true
 * forever, so keying off it alone would hand every free user 3 sessions every
 * month. A user who has not spent the tryout yet still gets the bonus, because
 * whatever session they start next is by definition the tryout.
 */
export function sessionLimitFor(
  status: string | null | undefined,
  trialUsed: boolean,
  trialUsedAt?: string | null,
): number {
  const base = status === 'pro' ? PRO_SESSION_LIMIT : FREE_SESSION_LIMIT;
  if (!trialUsed) return base + 1;
  return isCurrentMonth(trialUsedAt) ? base + 1 : base;
}
