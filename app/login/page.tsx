'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

type Mode = 'sign_in' | 'sign_up' | 'forgot' | 'reset';

function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M1 10s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
      <circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M1 10s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
      <circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
      <line x1="3" y1="3" x2="17" y2="17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}


export default function LoginPage() {
  const [mode, setMode]                   = useState<Mode>('sign_in');
  const [name, setName]                   = useState('');
  const [email, setEmail]                 = useState('');
  const [password, setPassword]           = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError]                 = useState('');
  const [info, setInfo]                   = useState('');
  const [loading, setLoading]             = useState(false);
  const [showPassword, setShowPassword]   = useState(false);
  const [showConfirm, setShowConfirm]     = useState(false);
  useEffect(() => {
    // ?error= from /auth/callback redirect
    const params = new URLSearchParams(window.location.search);
    const qErr = params.get('error');
    if (qErr) { setError(decodeURIComponent(qErr)); return; }

    // #error= from Supabase implicit-flow errors (e.g. otp_expired)
    const hash = window.location.hash;
    if (hash.includes('error=')) {
      const hParams = new URLSearchParams(hash.slice(1));
      const desc = hParams.get('error_description') ?? hParams.get('error');
      if (desc) setError(desc.replace(/\+/g, ' '));
    }

    // ?mode=reset → show new-password form after clicking the reset email link
    if (params.get('mode') === 'reset') setMode('reset');
  }, []);

  function switchMode(next: Mode) {
    setMode(next);
    setError('');
    setInfo('');
    setName('');
    setConfirmPassword('');
  }

  async function handleSubmit() {
    setError(''); setInfo(''); setLoading(true);
    const supabase = createClient();

    if (mode === 'sign_in') {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
      else window.location.href = '/practice';

    } else if (mode === 'sign_up') {
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        setLoading(false);
        return;
      }
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${location.origin}/auth/callback`,
          data: { name },
        },
      });
      if (error) setError(error.message);
      else setInfo('Check your email for a confirmation link.');

    } else if (mode === 'forgot') {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${location.origin}/auth/callback?type=recovery`,
      });
      if (error) setError(error.message);
      else setInfo('Password reset email sent.');

    } else if (mode === 'reset') {
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        setLoading(false);
        return;
      }
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setError(error.message);
      } else {
        await supabase.auth.signOut();
        setMode('sign_in');
        setPassword('');
        setConfirmPassword('');
        setInfo('Password updated. Sign in with your new password.');
      }
    }
    setLoading(false);
  }

  async function handleGoogle() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${location.origin}/auth/callback`,
        queryParams: { prompt: 'select_account' },
      },
    });
  }

  return (
    <div className="auth-root">
      <div className="auth-orb auth-orb--1" aria-hidden="true" />
      <div className="auth-orb auth-orb--2" aria-hidden="true" />
      <div className="auth-fragments" aria-hidden="true">
        <div className="auth-cf auth-cf--1">{`def get(self, key):
    if key not in self.cache:
        return -1
    node = self.cache[key]
    self._remove(node)
    self._add(node)
    return node.val`}</div>
        <div className="auth-cf auth-cf--2">{`SELECT u.id,
  SUM(t.amount) AS total_spent,
  COUNT(*) AS tx_count
FROM users u
JOIN transactions t
  ON t.user_id = u.id
GROUP BY u.id
ORDER BY total_spent DESC;`}</div>
        <div className="auth-cf auth-cf--3">{`const queue = amounts.map((amt) => {
  const captured = state;
  // BUG: stale snapshot
  return () => captured + amt;
});
for (const upd of queue) {
  state = upd();
}`}</div>
        <div className="auth-cf auth-cf--4">{`on(event, handler) {
  this.subs[event] ??= [];
  const wrapped = () => handler();
  this.subs[event].push(wrapped);
}
off(event, handler) {
  this.subs[event] = this.subs[event]
    ?.filter(h => h !== handler);
}`}</div>
        <div className="auth-cf auth-cf--5">{`export async function withAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const header = req.headers.authorization;
  const token = header?.split(' ')[1];
  if (!token) return res.status(401);
  next();
}`}</div>
        <div className="auth-cf auth-cf--6">{`def resolve(self, name):
    if name in self.resolved:
        return self.resolved[name]
    for dep in self.graph[name]:
        self.resolve(dep)
    self.resolved.add(name)
    return name`}</div>
      </div>
      <div className="auth-card">
        <Link href="/" className="auth-back-link">← Back to home</Link>
        <div className="auth-logo-row">
          <div className="auth-logo-mark" aria-hidden="true">{'</>'}</div>
          <div className="auth-logo">AI Interview Practice</div>
        </div>
        <p className="auth-tagline">Sharpen your AI-assisted coding skills.</p>

        {mode === 'reset' && (
          <p className="auth-tagline" style={{ marginTop: 4 }}>Choose a new password for your account.</p>
        )}

        {mode !== 'forgot' && mode !== 'reset' && (
          <button className="auth-oauth-btn" onClick={handleGoogle} disabled={loading}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
              <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>
        )}

        {mode !== 'forgot' && mode !== 'reset' && <div className="auth-divider"><span>or</span></div>}

        <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="auth-form">
          {mode === 'sign_up' && (
            <input
              className="auth-input"
              type="text"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoComplete="name"
            />
          )}

          {mode !== 'reset' && (
            <input
              className="auth-input"
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete={mode === 'sign_up' ? 'email' : 'username'}
            />
          )}

          {(mode === 'sign_in' || mode === 'sign_up' || mode === 'reset') && (
            <div className="auth-input-wrap">
              <input
                className="auth-input"
                type={showPassword ? 'text' : 'password'}
                placeholder={mode === 'reset' ? 'New password' : 'Password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete={mode === 'sign_in' ? 'current-password' : 'new-password'}
              />
              <button type="button" className="auth-eye-btn" onClick={() => setShowPassword(v => !v)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          )}

          {(mode === 'sign_up' || mode === 'reset') && (
            <div className="auth-input-wrap">
              <input
                className="auth-input"
                type={showConfirm ? 'text' : 'password'}
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
              <button type="button" className="auth-eye-btn" onClick={() => setShowConfirm(v => !v)} aria-label={showConfirm ? 'Hide password' : 'Show password'}>
                {showConfirm ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          )}

          {error && <p className="auth-error">{error}</p>}
          {info  && <p className="auth-info">{info}</p>}

          <button className="auth-submit-btn" type="submit" disabled={loading}>
            {loading ? 'Loading…' :
              mode === 'sign_in'  ? 'Sign in' :
              mode === 'sign_up'  ? 'Create account' :
              mode === 'reset'    ? 'Set new password' :
              'Send reset link'}
          </button>
        </form>

        <div className="auth-links">
          {mode === 'sign_in' ? (
            <>
              <button className="auth-link" onClick={() => switchMode('sign_up')}>
                Create an account
              </button>
              <button className="auth-link" onClick={() => switchMode('forgot')}>
                Forgot password?
              </button>
            </>
          ) : (
            <button className="auth-link" onClick={() => switchMode('sign_in')}>
              Back to sign in
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
