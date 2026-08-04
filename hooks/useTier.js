import { useState, useEffect, useCallback } from 'react';

export const FREE_SESSION_LIMIT = 2;
export const FREE_TRACK_LIMIT   = 3;
export const PRO_SESSION_LIMIT  = 60;

export function useTier() {
  const [sub, setSub] = useState({
    status:                   'free',
    sessions_used_this_month: 0,
    session_limit:            FREE_SESSION_LIMIT,
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
  const isLocked     = sessionsUsed >= sessionLimit;

  const daysUntilReset = (() => {
    const now  = new Date();
    const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return Math.ceil((next - now) / (1000 * 60 * 60 * 24));
  })();

  const consumeSession = useCallback(() => {
    setSub(prev => ({ ...prev, sessions_used_this_month: prev.sessions_used_this_month + 1 }));
    fetch('/api/subscription/consume', { method: 'POST' })
      .then(r => { if (!r.ok) fetchSub(); }) // rejected: re-sync with server truth
      .catch(() => {});
  }, [fetchSub]);

  const upgradeToPro = useCallback(async () => {
    const res = await fetch('/api/stripe/checkout', { method: 'POST' });
    const { url } = await res.json();
    window.location.href = url;
  }, []);

  const manageSub = useCallback(async () => {
    const res = await fetch('/api/stripe/portal', { method: 'POST' });
    const { url } = await res.json();
    window.location.href = url;
  }, []);

  return {
    tier,
    sessionsUsed,
    sessionLimit,
    isLocked,
    loading,
    daysUntilReset,
    consumeSession,
    upgradeToPro,
    manageSub,
    refreshSub: fetchSub,
  };
}
