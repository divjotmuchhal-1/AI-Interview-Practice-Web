'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function ChangePasswordScreen({ onBack }) {
  const [newPassword,     setNewPassword]     = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [success,  setSuccess]  = useState(false);

  async function handleSubmit() {
    setError('');
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setLoading(false);
    if (error) setError(error.message);
    else setSuccess(true);
  }

  return (
    <div className="auth-root">
      <div className="auth-orb auth-orb--1" aria-hidden="true" />
      <div className="auth-orb auth-orb--2" aria-hidden="true" />
      <div className="auth-card">
        <div className="auth-logo-row">
          <div className="auth-logo-mark" aria-hidden="true">{'</>'}</div>
          <div className="auth-logo">Change Password</div>
        </div>

        {success ? (
          <>
            <p className="auth-info" style={{ textAlign: 'center' }}>
              Password updated successfully.
            </p>
            <button className="auth-submit-btn" onClick={onBack}>
              Back to practice
            </button>
          </>
        ) : (
          <form
            onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}
            className="auth-form"
          >
            <input
              className="auth-input"
              type="password"
              placeholder="New password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
            <input
              className="auth-input"
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
            {error && <p className="auth-error">{error}</p>}
            <button className="auth-submit-btn" type="submit" disabled={loading}>
              {loading ? 'Updating…' : 'Update password'}
            </button>
            <button
              type="button"
              className="auth-link"
              style={{ margin: '0 auto' }}
              onClick={onBack}
            >
              Cancel
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
