import { useState, useEffect, useCallback } from 'react';
import { track } from '@/lib/track';

export { FREE_SESSION_LIMIT, PRO_SESSION_LIMIT } from '@/lib/sessionLimits';
import { FREE_SESSION_LIMIT } from '@/lib/sessionLimits';

export const FREE_TRACK_LIMIT = 3;

export function useTier() {
  const [sub, setSub] = useState({
    status:                   'free',
    sessions_used_this_month: 0,
    session_limit:            FREE_SESSION_LIMIT,
    trial_available:          false,
    credits_remaining:        0,
    credits_expire_at:        null,
  });
  const [loading, setLoading] = useState(true);

  const fetchSub = useCallback(() => {
    fetch('/api/subscription')
      .then(r => r.json())
      .then(data => setSub(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchSub(); }, [fetchSub]);

  const tier         = sub.status === 'pro' ? 'pro' : 'free';
  const sessionsUsed = sub.sessions_used_this_month ?? 0;
  const sessionLimit = sub.session_limit ?? FREE_SESSION_LIMIT;
  const trialAvailable = Boolean(sub.trial_available);
  const credits        = sub.credits_remaining ?? 0;
  const creditsExpireAt = sub.credits_expire_at ?? null;
  // A pending tryout, or purchased credits, keeps AI available regardless of
  // how much of the free monthly allowance has been spent.
  const isLocked     = !trialAvailable && sessionsUsed >= sessionLimit && credits <= 0;

  const daysUntilReset = (() => {
    const now  = new Date();
    const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return Math.ceil((next - now) / (1000 * 60 * 60 * 24));
  })();

  const consumeSession = useCallback(() => {
    // Optimistic update mirroring supabase/credits.sql: spend the free monthly
    // allowance first, and only then a purchased credit.
    setSub(prev => {
      const limit = prev.session_limit ?? FREE_SESSION_LIMIT;
      const used  = prev.sessions_used_this_month ?? 0;
      return used < limit
        ? { ...prev, sessions_used_this_month: used + 1 }
        : { ...prev, credits_remaining: Math.max(0, (prev.credits_remaining ?? 0) - 1) };
    });
    fetch('/api/subscription/consume', { method: 'POST' })
      .then(r => { if (!r.ok) fetchSub(); }) // rejected: re-sync with server truth
      .catch(() => {});
  }, [fetchSub]);

  // Both flows redirect to a Stripe-hosted page. Parsing is guarded because an
  // error response may have no body, which would throw on res.json().
  const goToStripe = useCallback(async (endpoint, failureMessage) => {
    try {
      const res = await fetch(endpoint, { method: 'POST' });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.url) throw new Error(data?.error ?? 'no_url');
      window.location.href = data.url;
    } catch (err) {
      console.error(endpoint + ' failed:', err);
      alert(failureMessage);
    }
  }, []);

  const upgradeToPro = useCallback(
    () => {
      track('upgrade_clicked');
      return goToStripe('/api/stripe/checkout', 'Could not start checkout. Please try again in a moment.');
    },
    [goToStripe],
  );

  const manageSub = useCallback(
    () => goToStripe('/api/stripe/portal', 'Could not open billing management. Please try again in a moment.'),
    [goToStripe],
  );

  return {
    tier,
    sessionsUsed,
    sessionLimit,
    trialAvailable,
    credits,
    creditsExpireAt,
    isLocked,
    loading,
    daysUntilReset,
    consumeSession,
    upgradeToPro,
    manageSub,
    refreshSub: fetchSub,
  };
}
