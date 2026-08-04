'use client';

const FREE_FEATURES = [
  '2 AI-coached sessions per month',
  'First 3 tracks: Python, JavaScript, TypeScript',
  'AI chat coaching during sessions',
  'Full session review with radar chart & scoring',
  'Session history',
];

const PRO_EXTRA = [
  '100 AI-coached sessions per month',
  'All 7 tracks: SQL, React, Code Review & Large Codebase unlocked',
  'Priority support',
];

function CheckIcon({ color = 'var(--green)' }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
      <circle cx="8" cy="8" r="7" fill={color} fillOpacity="0.15" />
      <path d="M4.5 8L7 10.5L11.5 6" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function SubscriptionScreen({ tier, sessionsUsed, sessionLimit, daysUntilReset, onUpgrade, onManageSub, onBack }) {
  const isPro = tier === 'pro';

  return (
    <div className="sub-root">
      <div className="sub-header">
        <button className="sub-back" onClick={onBack}>← Back</button>
        <h1 className="sub-heading">Subscription Plan</h1>
      </div>

      <div className="sub-body">
        <p className="sub-current-label">
          You are currently on the <span className={`sub-tier-chip sub-tier-chip--${isPro ? 'pro' : 'free'}`}>{isPro ? 'Pro' : 'Free'}</span> plan
        </p>

        {!isPro && (
          <div className="sub-usage-bar-wrap">
            <div className="sub-usage-labels">
              <span>{sessionsUsed} of {sessionLimit} sessions used this month</span>
              <span className="sub-usage-reset">Resets in {daysUntilReset}d</span>
            </div>
            <div className="sub-usage-track">
              <div
                className="sub-usage-fill"
                style={{
                  width: `${Math.min(100, (sessionsUsed / sessionLimit) * 100)}%`,
                  background: sessionsUsed >= sessionLimit ? 'var(--red, #d9534f)' : 'var(--orange)',
                }}
              />
            </div>
          </div>
        )}

        <div className="sub-cards">
          {/* Free card */}
          <div className={`sub-card ${!isPro ? 'sub-card--active' : ''}`}>
            <div className="sub-card-header">
              <span className="sub-card-name">Free</span>
              <span className="sub-card-price">$0<span className="sub-card-period">/month</span></span>
              {!isPro && <span className="sub-current-badge">Current plan</span>}
            </div>
            <ul className="sub-feature-list">
              {FREE_FEATURES.map(f => (
                <li key={f} className="sub-feature-item">
                  <CheckIcon color="var(--text-muted)" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Pro card */}
          <div className={`sub-card sub-card--pro ${isPro ? 'sub-card--active' : ''}`}>
            <div className="sub-card-header">
              <span className="sub-card-name">Pro</span>
              <span className="sub-card-price">$9<span className="sub-card-period">/month</span></span>
              {isPro && <span className="sub-current-badge sub-current-badge--pro">Current plan</span>}
            </div>
            <p className="sub-card-includes">Everything in Free, plus:</p>
            <ul className="sub-feature-list">
              {PRO_EXTRA.map(f => (
                <li key={f} className="sub-feature-item">
                  <CheckIcon color="var(--green)" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>

            {isPro ? (
              <button className="sub-manage-btn" onClick={onManageSub}>
                Manage subscription
              </button>
            ) : (
              <>
                <button className="sub-upgrade-btn" onClick={onUpgrade}>
                  Upgrade to Pro →
                </button>
                <p className="sub-legal-note">
                  Renews monthly, cancel anytime. Payments are non-refundable. By upgrading
                  you agree to the{' '}
                  <a href="/terms" target="_blank" rel="noopener noreferrer">Terms</a> and{' '}
                  <a href="/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</a>{' '}
                  and consent to immediate access to the service.
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
