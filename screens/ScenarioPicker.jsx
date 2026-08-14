'use client';
import { useState, useEffect, useCallback, useRef } from 'react';

function UserIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
      <circle cx="8" cy="5.5" r="2.75" stroke="currentColor" strokeWidth="1.6" />
      <path d="M2.5 14c0-3 2.5-4.75 5.5-4.75S13.5 11 13.5 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
import { TRACKS, SCENARIOS } from '@/data/scenarios';
import { FREE_SESSION_LIMIT, PACK_SESSIONS, PACK_PRICE_USD } from '@/lib/sessionLimits';

const FREE_TRACK_LIMIT = 3;

const DIFFICULTY_COLORS = {
  Easy:   '#4caf50',
  Medium: '#ff9800',
  Hard:   '#f44336',
};

const COMPANY_COLORS = {
  Amazon:     { bg: 'rgba(255,153,0,0.12)',   text: '#ff9900', border: 'rgba(255,153,0,0.28)' },
  Google:     { bg: 'rgba(66,133,244,0.12)',  text: '#4e9af4', border: 'rgba(66,133,244,0.28)' },
  Meta:       { bg: 'rgba(0,130,251,0.12)',   text: '#29a0fb', border: 'rgba(0,130,251,0.28)' },
  Netflix:    { bg: 'rgba(229,9,20,0.12)',    text: '#e83848', border: 'rgba(229,9,20,0.28)' },
  Microsoft:  { bg: 'rgba(0,164,239,0.12)',   text: '#00a4ef', border: 'rgba(0,164,239,0.28)' },
  Vercel:     { bg: 'rgba(255,255,255,0.07)', text: '#d9d9d9', border: 'rgba(255,255,255,0.16)' },
  Stripe:     { bg: 'rgba(99,91,255,0.12)',   text: '#8b85ff', border: 'rgba(99,91,255,0.28)' },
  Cloudflare: { bg: 'rgba(244,129,32,0.12)',  text: '#f48120', border: 'rgba(244,129,32,0.28)' },
  Airbnb:     { bg: 'rgba(255,90,95,0.12)',   text: '#ff5a5f', border: 'rgba(255,90,95,0.28)' },
  Uber:       { bg: 'rgba(255,255,255,0.07)', text: '#d9d9d9', border: 'rgba(255,255,255,0.16)' },
};

// ── Track icons ───────────────────────────────────────────────────────────────

function IconPython() {
  return (
    <svg viewBox="0 0 20 20" fill="none" width="20" height="20" aria-hidden="true">
      <path d="M5.5 6C5.5 4.3 6.8 3 8.5 3h3C13.2 3 14.5 4.3 14.5 6c0 1.7-1.3 3-3 3h-3C6.8 9 5.5 10.3 5.5 12c0 1.7 1.3 3 3 3h3c1.7 0 3-1.3 3-3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
      <circle cx="8.5" cy="3" r="1.1" fill="currentColor"/>
      <circle cx="11.5" cy="15" r="1.1" fill="currentColor"/>
    </svg>
  );
}

function IconJS() {
  return (
    <svg viewBox="0 0 20 20" fill="none" width="20" height="20" aria-hidden="true">
      <path d="M7 2.5H5.5A1.5 1.5 0 0 0 4 4v4L2 10l2 2v4c0 .83.67 1.5 1.5 1.5H7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M13 2.5h1.5A1.5 1.5 0 0 1 16 4v4l2 2-2 2v4c0 .83-.67 1.5-1.5 1.5H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="10" cy="10" r="1.5" fill="currentColor"/>
    </svg>
  );
}

function IconTS() {
  return (
    <svg viewBox="0 0 20 20" fill="none" width="20" height="20" aria-hidden="true">
      <path d="M7.5 6L3 10.5 7.5 15" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M11.5 7H17M14.5 7v7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
    </svg>
  );
}

function IconSQL() {
  return (
    <svg viewBox="0 0 20 20" fill="none" width="20" height="20" aria-hidden="true">
      <ellipse cx="10" cy="5.5" rx="6.5" ry="2.5" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M3.5 5.5v9c0 1.38 2.91 2.5 6.5 2.5s6.5-1.12 6.5-2.5v-9" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M3.5 10c0 1.38 2.91 2.5 6.5 2.5S16.5 11.38 16.5 10" stroke="currentColor" strokeWidth="1.3"/>
    </svg>
  );
}

function IconReact() {
  return (
    <svg viewBox="0 0 20 20" fill="none" width="20" height="20" aria-hidden="true">
      <ellipse cx="10" cy="10" rx="8.5" ry="3.2" stroke="currentColor" strokeWidth="1.3"/>
      <ellipse cx="10" cy="10" rx="8.5" ry="3.2" stroke="currentColor" strokeWidth="1.3" transform="rotate(60 10 10)"/>
      <ellipse cx="10" cy="10" rx="8.5" ry="3.2" stroke="currentColor" strokeWidth="1.3" transform="rotate(120 10 10)"/>
      <circle cx="10" cy="10" r="1.8" fill="currentColor"/>
    </svg>
  );
}

function IconCodeReview() {
  return (
    <svg viewBox="0 0 20 20" fill="none" width="20" height="20" aria-hidden="true">
      <rect x="2.5" y="2" width="11" height="13" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M6 6.5h5M6 9.5h3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      <circle cx="15.5" cy="15.5" r="3.5" fill="var(--bg-card,#1f2023)" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M13.8 15.5l1.2 1.2 2.2-2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function IconSystems() {
  return (
    <svg viewBox="0 0 20 20" fill="none" width="20" height="20" aria-hidden="true">
      <rect x="1" y="1.5" width="6" height="4" rx="1" stroke="currentColor" strokeWidth="1.3"/>
      <rect x="7" y="8" width="6" height="4" rx="1" stroke="currentColor" strokeWidth="1.3"/>
      <rect x="13" y="14.5" width="6" height="4" rx="1" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M4 5.5v3c0 .83.67 1.5 1.5 1.5H7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      <path d="M10 12v2.5c0 .83.67 1.5 1.5 1.5H13" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  );
}

const TRACK_ICONS = {
  'python-debug':  <IconPython />,
  'js-build':      <IconJS />,
  'ts-debug':      <IconTS />,
  'sql-analytics': <IconSQL />,
  'react-hooks':   <IconReact />,
  'code-review':   <IconCodeReview />,
  'systems-debug': <IconSystems />,
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(iso) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return `${days}d ago`;
}

// ── Jump back in strip ────────────────────────────────────────────────────────

function JumpBack({ session, onSelect }) {
  const scenario = SCENARIOS.find(s => s.id === session.scenario_id);
  if (!scenario) return null;

  const events = session.events ?? [];
  const advances = events.filter(e => e.type === 'part_advanced');
  const furthestPart = advances.length
    ? Math.max(...advances.map(e => e.data.to))
    : 0;
  const totalParts = scenario.parts.length;

  const scoreVals = [
    session.score_diagnosis, session.score_independence, session.score_precision,
    session.score_verification, session.score_recovery, session.score_test_ownership,
  ].filter(v => v != null);
  const avg = scoreVals.length
    ? Math.round(scoreVals.reduce((a, b) => a + b, 0) / scoreVals.length)
    : null;
  const avgColor = avg == null ? 'var(--text-muted)'
    : avg >= 70 ? '#5cb87e'
    : avg >= 40 ? '#d4883a'
    : '#d9534f';

  return (
    <div className="jump-back">
      <div className="jump-back-left">
        <span className="jump-back-eyebrow">Jump back in</span>
        <div className="jump-back-row">
          <span className="jump-back-company">{session.scenario_company}</span>
          <span className="jump-back-sep" aria-hidden="true">·</span>
          <span className="jump-back-title">{session.scenario_title}</span>
          <span className="jump-back-sep" aria-hidden="true">·</span>
          <span className="jump-back-diff" style={{ color: DIFFICULTY_COLORS[session.scenario_difficulty] }}>
            {session.scenario_difficulty}
          </span>
          {totalParts > 1 && (
            <>
              <span className="jump-back-sep" aria-hidden="true">·</span>
              <span className="jump-back-detail">Part {furthestPart + 1}/{totalParts}</span>
            </>
          )}
          {avg != null && (
            <>
              <span className="jump-back-sep" aria-hidden="true">·</span>
              <span className="jump-back-score" style={{ color: avgColor }}>Score {avg}</span>
            </>
          )}
        </div>
      </div>
      <div className="jump-back-right">
        <span className="jump-back-when">{timeAgo(session.completed_at)}</span>
        <button className="jump-back-btn" onClick={() => onSelect(scenario)}>
          Practice again <span aria-hidden="true">→</span>
        </button>
      </div>
    </div>
  );
}

// ── Stats row ─────────────────────────────────────────────────────────────────

function IconCalendar() {
  return (
    <svg viewBox="0 0 14 14" fill="none" width="13" height="13" aria-hidden="true">
      <rect x="1" y="2.5" width="12" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M4 1.5v2M10 1.5v2M1 6h12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  );
}

function IconTarget() {
  return (
    <svg viewBox="0 0 14 14" fill="none" width="13" height="13" aria-hidden="true">
      <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.3"/>
      <circle cx="7" cy="7" r="2.5" stroke="currentColor" strokeWidth="1.2"/>
      <circle cx="7" cy="7" r=".8" fill="currentColor"/>
    </svg>
  );
}

function IconTrend() {
  return (
    <svg viewBox="0 0 14 14" fill="none" width="13" height="13" aria-hidden="true">
      <path d="M1.5 10.5L5 7L8 9L12.5 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M10 3.5h2.5V6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function StatsRow({ stats }) {
  const scoreColor = stats.avgScore == null ? 'var(--text-primary)'
    : stats.avgScore >= 70 ? '#5cb87e'
    : stats.avgScore >= 40 ? '#d4883a'
    : '#d9534f';

  return (
    <div className="stats-row">
      <div className="stats-item">
        <span className="stats-item-label">
          <IconCalendar />
          Sessions
        </span>
        <span className="stats-value">{stats.sessions}</span>
      </div>
      <div className="stats-item">
        <span className="stats-item-label">
          <IconTarget />
          Problems Solved
        </span>
        <span className="stats-value">
          {stats.solved}<span className="stats-value-total">/{SCENARIOS.length}</span>
        </span>
      </div>
      <div className="stats-item">
        <span className="stats-item-label">
          <IconTrend />
          Avg Score
        </span>
        <span className="stats-value" style={{ color: scoreColor }}>
          {stats.avgScore != null ? stats.avgScore : '-'}
        </span>
      </div>
    </div>
  );
}

// ── Tier banner ───────────────────────────────────────────────────────────────

function TierBanner({ tier, sessionsUsed, sessionLimit, isLocked, daysUntilReset, onUpgrade, trialAvailable = false, credits = 0 }) {
  if (tier === 'pro') {
    const remaining = Math.max(0, sessionLimit - sessionsUsed);
    const pctLeft = (remaining / sessionLimit) * 100;
    const fillColor = pctLeft > 33 ? 'var(--green)' : pctLeft > 10 ? 'var(--orange)' : 'var(--red)';
    return (
      <div className={`tier-banner tier-banner--pro ${isLocked ? 'tier-banner--locked' : ''}`}>
        <span className="tier-badge tier-badge--pro">Pro</span>
        <div className="tier-pro-meter">
          <span className="tier-pro-label">
            {isLocked
              ? <>AI sessions used · resets in {daysUntilReset}d</>
              : <><span className="tier-pro-num">{remaining}</span> sessions left</>}
          </span>
          <div className="tier-pro-track">
            <div className="tier-pro-fill" style={{ width: `${pctLeft}%`, background: fillColor }} />
          </div>
        </div>
      </div>
    );
  }

  const remaining = Math.max(0, sessionLimit - sessionsUsed);
  const pct = (sessionsUsed / sessionLimit) * 100;

  // Purchased credits are spent only after the free allowance runs out, so once
  // someone holds a pack the free counter stops being the useful number.
  if (credits > 0) {
    return (
      <div className="tier-banner tier-banner--free">
        <span className="tier-badge tier-badge--free">Pack</span>
        <div className="tier-usage">
          <span className="tier-text">
            {remaining > 0
              ? `${remaining} free + ${credits} pack sessions left`
              : `${credits} pack session${credits === 1 ? '' : 's'} left`}
          </span>
        </div>
        <button className="tier-upgrade-btn" onClick={onUpgrade}>Top up →</button>
      </div>
    );
  }

  return (
    <div className={`tier-banner ${isLocked ? 'tier-banner--locked' : 'tier-banner--free'}`}>
      <span className="tier-badge tier-badge--free">Free</span>
      <div className="tier-usage">
        <span className="tier-text">
          {isLocked
            ? `Free sessions used · resets in ${daysUntilReset}d`
            : trialAvailable
              ? `Free tryout ready · then ${FREE_SESSION_LIMIT}/month`
              : `${remaining} of ${sessionLimit} AI sessions left`}
        </span>
        <div className="tier-bar-wrap">
          <div className={`tier-bar ${isLocked ? 'tier-bar--full' : ''}`} style={{ width: `${pct}%` }} />
        </div>
      </div>
      <button className="tier-upgrade-btn" onClick={onUpgrade}>{`Get ${PACK_SESSIONS} →`}</button>
    </div>
  );
}

// ── Chevron icon ──────────────────────────────────────────────────────────────

function Chevron({ open }) {
  return (
    <svg
      className={`track-chevron ${open ? 'track-chevron--open' : ''}`}
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M5 7.5L10 12.5L15 7.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ── Track section ─────────────────────────────────────────────────────────────

function LockIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="3" y="7" width="10" height="8" rx="2" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M5 7V5a3 3 0 0 1 6 0v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

function TrackSection({ track, onSelect, isLocked, tierLocked, isOpen, onToggle, completedIds, index, onUpgrade }) {
  const { scenarios, color, colorDim } = track;

  const trackRef = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); io.disconnect(); } },
      { threshold: 0.08 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);


  const diffCounts = scenarios.reduce((acc, s) => {
    acc[s.difficulty] = (acc[s.difficulty] || 0) + 1;
    return acc;
  }, {});

  const durations = scenarios.map(s => s.durationMinutes);
  const minDur    = Math.min(...durations);
  const maxDur    = Math.max(...durations);
  const durLabel  = minDur === maxDur ? `${minDur} min` : `${minDur}–${maxDur} min`;

  const total   = scenarios.length;
  const done    = scenarios.filter(s => completedIds.has(s.id)).length;
  const allDone = done === total && total > 0;

  return (
    <div ref={trackRef} id={`track-${track.id}`} className={`track${visible ? ' is-visible' : ''}${tierLocked ? ' track--tier-locked' : ''}`} style={{ '--track-color': color, '--track-dim': colorDim, transitionDelay: visible ? `${index * 80}ms` : '0ms' }}>
      <button className="track-header" onClick={onToggle} aria-expanded={isOpen}>
        <span className="track-icon" aria-hidden="true">
          {TRACK_ICONS[track.id]}
        </span>
        <div className="track-info">
          <div className="track-label">{track.trackLabel}</div>
          <h2 className="track-title">{track.title}</h2>
          <p className="track-description">{track.description}</p>
          {!tierLocked && (
            <div className="track-progress-pips">
              {scenarios.map((s) => (
                <span key={s.id} className={`pip${completedIds.has(s.id) ? ' pip--done' : ''}`} />
              ))}
              <span className={`track-progress-count${allDone ? ' track-progress-count--done' : ''}`}>
                {done}/{total}
              </span>
            </div>
          )}
          <div className="track-stats">
            <div className="track-diff-group">
              {['Easy', 'Medium', 'Hard'].map(d => diffCounts[d] ? (
                <span key={d} className="track-diff-pip">
                  <span className="track-diff-dot" style={{ background: DIFFICULTY_COLORS[d] }} />
                  {diffCounts[d]} {d}
                </span>
              ) : null)}
            </div>
            <span className="track-stat-sep" aria-hidden="true" />
            <span className="track-meta-stat">{durLabel}</span>
          </div>
        </div>

        <div className="track-aside">
          {tierLocked
            ? <span className="track-pro-badge"><LockIcon /> Pro</span>
            : <span className="track-count">{scenarios.length} problem{scenarios.length !== 1 ? 's' : ''}</span>
          }
          <Chevron open={isOpen} />
        </div>
      </button>

      <div className={`track-body ${isOpen ? 'track-body--open' : ''}`} aria-hidden={!isOpen}>
        <div className="track-body-inner">
          {tierLocked && (
            <div className="track-tier-gate">
              <p className="track-tier-gate-msg">This track is available on the Pro plan.</p>
              <button className="track-tier-gate-btn" onClick={onUpgrade}>{`Unlock all tracks — $${PACK_PRICE_USD}`}</button>
            </div>
          )}
          <div className={`track-grid ${tierLocked ? 'track-grid--blurred' : ''}`}>
            {scenarios.map((scenario, idx) => (
              <ScenarioCard
                key={scenario.id}
                scenario={scenario}
                onSelect={onSelect}
                isLocked={isLocked}
                tierLocked={tierLocked}
                index={idx}
                completed={completedIds.has(scenario.id)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Scenario card ─────────────────────────────────────────────────────────────

function ScenarioCard({ scenario, onSelect, isLocked, tierLocked = false, index = 0, completed = false }) {
  const co = COMPANY_COLORS[scenario.company] ?? { bg: 'rgba(255,255,255,0.06)', text: 'var(--text-muted)', border: 'rgba(255,255,255,0.12)' };

  return (
    <div
      className={`scenario-card ${isLocked ? 'scenario-card--ai-locked' : ''} ${tierLocked ? 'scenario-card--tier-locked' : ''}`}
      style={{ '--card-i': index }}
    >
      <div className="scenario-card-top">
        <div className="scenario-card-meta">
          <span
            className="company-badge"
            style={{ background: co.bg, color: co.text, border: `1px solid ${co.border}` }}
          >
            {scenario.company}
          </span>
          <span className="scenario-difficulty" style={{ color: DIFFICULTY_COLORS[scenario.difficulty] }}>
            {scenario.difficulty}
          </span>
          {completed && !tierLocked && <span className="scenario-done-badge">✓ Done</span>}
        </div>
        <h3 className="scenario-title">{scenario.title}</h3>
        <p className="scenario-description">{scenario.description}</p>
      </div>

      <div className="scenario-card-bottom">
        <div className="scenario-tags">
          {scenario.tags.map(tag => (
            <span key={tag} className="scenario-tag">{tag}</span>
          ))}
        </div>
        <div className="scenario-footer">
          <span className="scenario-meta-item">
            {scenario.parts.length} {scenario.parts.length === 1 ? 'part' : 'parts'}
          </span>
          <span className="scenario-meta-item">{scenario.durationMinutes} min</span>
          <button
            className={`btn-start ${isLocked && !tierLocked ? 'btn-start--locked' : ''} ${tierLocked ? 'btn-start--tier-locked' : ''}`}
            onClick={() => !tierLocked && onSelect(scenario)}
            disabled={tierLocked}
            title={isLocked && !tierLocked ? 'AI sessions used up: practice without the AI coach' : undefined}
          >
            {tierLocked ? <><LockIcon /> Pro</> : isLocked ? <>Practice<span className="btn-start-arrow" aria-hidden="true">→</span></> : <>Start<span className="btn-start-arrow" aria-hidden="true">→</span></>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Logo mark ─────────────────────────────────────────────────────────────────

function LogoMark() {
  return (
    <svg width="34" height="34" viewBox="0 0 34 34" fill="none" aria-hidden="true" className="picker-logo-mark">
      <rect width="34" height="34" rx="9" fill="var(--orange)" fillOpacity="0.1"/>
      <rect width="34" height="34" rx="9" stroke="var(--orange)" strokeOpacity="0.3" strokeWidth="1"/>
      <path d="M14 9.5L9 17L14 24.5" stroke="var(--orange)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M20 9.5L25 17L20 24.5" stroke="var(--orange)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

// ── Onboarding modal ─────────────────────────────────────────────────────────

function OnboardingModal({ onDone }) {
  const [step, setStep] = useState(1);
  const freeTracks = TRACKS.slice(0, FREE_TRACK_LIMIT);

  return (
    <div className="onboard-backdrop" role="dialog" aria-modal="true" aria-label="Welcome">
      <div className="onboard-modal">
        {step === 1 ? (
          <>
            <div className="onboard-brand">
              <svg width="42" height="42" viewBox="0 0 34 34" fill="none" aria-hidden="true">
                <rect width="34" height="34" rx="9" fill="var(--orange)" fillOpacity="0.12"/>
                <rect width="34" height="34" rx="9" stroke="var(--orange)" strokeOpacity="0.3" strokeWidth="1"/>
                <path d="M14 9.5L9 17L14 24.5" stroke="var(--orange)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M20 9.5L25 17L20 24.5" stroke="var(--orange)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h2 className="onboard-heading">Your coding interview coach</h2>
            <p className="onboard-body">
              Solve real problems in the exact formats used at Google, Amazon, Meta, and Stripe.
              Python debugging, JavaScript build-outs, SQL analytics, React, and more.
              After every session the AI breaks down your approach and tells you where to improve.
            </p>
            <div className="onboard-features">
              <span className="onboard-feature">Real interview formats</span>
              <span className="onboard-feature">AI coaching after every session</span>
              <span className="onboard-feature">Free to start</span>
            </div>
            <div className="onboard-actions">
              <button className="onboard-primary" onClick={() => setStep(2)}>
                Pick your first track →
              </button>
              <button className="onboard-skip" onClick={() => onDone(null)}>
                Browse on my own
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="onboard-step2-top">
              <button className="onboard-back-btn" onClick={() => setStep(1)}>← Back</button>
              <button className="onboard-skip" onClick={() => onDone(null)}>Skip</button>
            </div>
            <h2 className="onboard-heading onboard-heading--sm">Pick your first track</h2>
            <p className="onboard-subhead">All three are free. Pick what fits your next interview.</p>
            <div className="onboard-tracks">
              {freeTracks.map(track => (
                <button
                  key={track.id}
                  className="onboard-track-card"
                  style={{ '--track-color': track.color, '--track-dim': track.colorDim }}
                  onClick={() => onDone(track.id)}
                >
                  <span className="onboard-track-icon">{TRACK_ICONS[track.id]}</span>
                  <span className="onboard-track-eyebrow">{track.trackLabel}</span>
                  <h3 className="onboard-track-title">{track.title}</h3>
                  <p className="onboard-track-desc">{track.description}</p>
                  <span className="onboard-track-meta">{track.scenarios.length} problems</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Main picker ───────────────────────────────────────────────────────────────

export default function ScenarioPicker({
  onSelect,
  tier,
  sessionsUsed,
  sessionLimit,
  isLocked,
  daysUntilReset,
  trialAvailable,
  credits = 0,
  onUpgrade,
  onSubscription,
  onSignOut,
  onProfile,
}) {
  // The first track starts expanded so arriving users see real scenarios rather
  // than a column of collapsed cards with no obvious next step.
  const [openTracks, setOpenTracks] = useState(() => (TRACKS[0] ? [TRACKS[0].id] : []));
  const [completedIds, setCompletedIds] = useState(() => new Set());
  const [lastSession, setLastSession] = useState(null);
  const [stats, setStats] = useState({ sessions: 0, solved: 0, avgScore: null });
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && !localStorage.getItem('aip_onboarded')) {
      const t = setTimeout(() => setShowOnboarding(true), 500);
      return () => clearTimeout(t);
    }
  }, []);

  const handleOnboardingDone = useCallback((trackId) => {
    localStorage.setItem('aip_onboarded', '1');
    setShowOnboarding(false);
    // Picking a track opens only that one, so the choice is reflected directly.
    if (trackId) {
      setOpenTracks([trackId]);
      setTimeout(() => {
        document.getElementById(`track-${trackId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 300);
    }
  }, []);

  useEffect(() => {
    fetch('/api/sessions')
      .then(r => r.json())
      .then(({ sessions }) => {
        if (!sessions) return;
        const ids = new Set(sessions.map(s => s.scenario_id));
        setCompletedIds(ids);
        setLastSession(sessions[0] ?? null);

        const SCORE_KEYS = [
          'score_diagnosis', 'score_independence', 'score_precision',
          'score_verification', 'score_recovery', 'score_test_ownership',
        ];
        const sessionAvgs = sessions
          .map(s => {
            const vals = SCORE_KEYS.map(k => s[k]).filter(v => v != null);
            return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
          })
          .filter(v => v != null);
        const avgScore = sessionAvgs.length
          ? Math.round(sessionAvgs.reduce((a, b) => a + b, 0) / sessionAvgs.length)
          : null;

        setStats({ sessions: sessions.length, solved: ids.size, avgScore });
      })
      .catch(() => {});
  }, []);


  const toggleTrack = useCallback((id) => {
    setOpenTracks(prev =>
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    );
  }, []);

  return (
    <div className="picker-root">
      {showOnboarding && <OnboardingModal onDone={handleOnboardingDone} />}
      <header className="picker-header">
        <div className="picker-header-inner">
          <div className="picker-header-top">
            <div className="picker-header-left">
              <div className="picker-logo-wrap">
                <LogoMark />
                <div className="picker-logo-text">
                  <h1 className="picker-logo">AI Interview Practice</h1>
                  <p className="picker-subtitle">
                    AI-coached practice for your next coding interview.
                  </p>
                </div>
              </div>
            </div>
            <div className="picker-header-right">
              <TierBanner
                tier={tier}
                sessionsUsed={sessionsUsed}
                sessionLimit={sessionLimit}
                isLocked={isLocked}
                daysUntilReset={daysUntilReset}
                onUpgrade={onUpgrade}
                trialAvailable={trialAvailable}
                credits={credits}
              />
              <div className="picker-user-menu">
                {onSubscription && (
                  <button className="picker-user-btn" onClick={onSubscription}>
                    Plans
                  </button>
                )}
                {onProfile && (
                  <button className="picker-user-btn picker-user-btn--profile" onClick={onProfile}>
                    <UserIcon />
                    Profile
                  </button>
                )}
                {onSignOut && (
                  <button className="picker-user-btn picker-user-btn--signout" onClick={onSignOut}>
                    Sign Out
                  </button>
                )}
              </div>
            </div>
          </div>
          <StatsRow stats={stats} />
        </div>
      </header>

      <main className="picker-main">
        {lastSession && <JumpBack session={lastSession} onSelect={onSelect} />}
        <p className="picker-section-title">Practice Tracks</p>
        <div className="tracks-container">
          {TRACKS.map((track, i) => (
            <TrackSection
              key={track.id}
              track={track}
              onSelect={onSelect}
              isLocked={isLocked}
              tierLocked={tier === 'free' && i >= FREE_TRACK_LIMIT}
              isOpen={openTracks.includes(track.id)}
              onToggle={() => toggleTrack(track.id)}
              completedIds={completedIds}
              index={i}
              onUpgrade={onUpgrade}
            />
          ))}
        </div>
      </main>
    </div>
  );
}
