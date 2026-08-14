// Single source of truth for AI session quota and pack pricing.
//
// These numbers and rules are mirrored in supabase/credits.sql, which enforces
// them under a row lock. Change both together.

export const FREE_SESSION_LIMIT = 2;

// Legacy monthly subscription. No new ones are sold; the constant stays so
// existing subscribers keep working until they lapse.
export const PRO_SESSION_LIMIT = 60;

// The one-time pack. Interview prep is a burst need rather than a habit, so a
// pack matches how people actually use this and avoids India's RBI e-mandate
// rules, which govern recurring card charges.
export const PACK_SESSIONS   = 25;
export const PACK_VALID_DAYS = 90;
export const PACK_PRICE_USD  = 12;

function isCurrentMonth(iso: string | null | undefined): boolean {
  if (!iso) return false;
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return false;
  const now = new Date();
  return then.getFullYear() === now.getFullYear() && then.getMonth() === now.getMonth();
}

/**
 * Purchased credits that are still usable. Expired credits stay in the column
 * for auditing but cannot be spent, so every read has to check the expiry.
 */
export function usableCredits(
  creditsRemaining: number | null | undefined,
  expiresAt: string | null | undefined,
): number {
  const n = creditsRemaining ?? 0;
  if (n <= 0) return 0;
  if (!expiresAt) return n;
  const exp = new Date(expiresAt);
  if (Number.isNaN(exp.getTime())) return n;
  return exp.getTime() > Date.now() ? n : 0;
}

/**
 * How many free AI sessions this account may use this month.
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
 *
 * Purchased credits are separate and are spent only after this allowance runs
 * out — see supabase/credits.sql.
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
