'use client';
import { useState, useEffect } from 'react';

const AXES = ['diagnosis', 'independence', 'precision', 'verification', 'recovery', 'test_ownership'];
const AXIS_LABELS = {
  diagnosis:    'Diagnosis',
  independence: 'Independ.',
  precision:    'Precision',
  verification: 'Verificat.',
  recovery:     'Recovery',
  test_ownership: 'Tests',
};
const DIFFICULTY_COLORS = { Easy: '#4caf50', Medium: '#ff9800', Hard: '#f44336' };

function fmtDuration(ms) {
  if (!ms) return '–';
  const s = Math.round(ms / 1000);
  const m = Math.floor(s / 60);
  return m > 0 ? `${m}m ${String(s % 60).padStart(2, '0')}s` : `${s}s`;
}

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function MiniScoreBar({ label, score }) {
  const pct   = Math.max(0, Math.min(100, score ?? 0));
  const color = pct >= 70 ? '#5cb87e' : pct >= 40 ? '#d4883a' : '#d9534f';
  return (
    <div className="hs-score-row">
      <span className="hs-score-label">{label}</span>
      <div className="hs-score-bar-wrap">
        <div className="hs-score-bar" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="hs-score-num" style={{ color }}>{pct}</span>
    </div>
  );
}

function SessionCard({ session, onView }) {
  const scores = {
    diagnosis:     session.score_diagnosis,
    independence:  session.score_independence,
    precision:     session.score_precision,
    verification:  session.score_verification,
    recovery:      session.score_recovery,
    test_ownership: session.score_test_ownership,
  };
  const vals = Object.values(scores).filter((v) => v !== null && v !== undefined);
  const avg  = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
  const avgColor = avg === null ? 'var(--text-muted)' : avg >= 70 ? '#5cb87e' : avg >= 40 ? '#d4883a' : '#d9534f';

  return (
    <div className="hs-card">
      <div className="hs-card-header">
        <div className="hs-card-meta">
          <span className="hs-company">{session.scenario_company}</span>
          <span className="hs-difficulty" style={{ color: DIFFICULTY_COLORS[session.scenario_difficulty] ?? 'var(--text-muted)' }}>
            {session.scenario_difficulty}
          </span>
        </div>
        <span className="hs-card-date">{fmtDate(session.completed_at)} · {fmtDuration(session.duration_ms)}</span>
      </div>

      <h3 className="hs-scenario-title">{session.scenario_title}</h3>

      {session.headline && (
        <p className="hs-headline">"{session.headline}"</p>
      )}

      <div className="hs-scores">
        {AXES.map((k) => (
          <MiniScoreBar key={k} label={AXIS_LABELS[k]} score={scores[k]} />
        ))}
      </div>

      <div className="hs-card-footer">
        {avg !== null && (
          <span className="hs-avg" style={{ color: avgColor }}>Avg {avg}</span>
        )}
        <button className="hs-view-btn" onClick={() => onView(session)}>
          View Report →
        </button>
      </div>
    </div>
  );
}

export default function HistoryScreen({ onBack, onViewSession }) {
  const [sessions, setSessions] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);

  useEffect(() => {
    fetch('/api/sessions')
      .then((r) => r.json())
      .then(({ sessions }) => setSessions(sessions ?? []))
      .catch((e) => {
        console.error('session history load failed:', e);
        setError('Could not load your session history. Try again in a moment.');
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="hs-root">
      <header className="hs-header">
        <button className="hs-back" onClick={onBack}>← Back to scenarios</button>
        <div className="hs-header-center">
          <span className="hs-title">Session History</span>
          {!loading && !error && (
            <span className="hs-count">
              {sessions.length} session{sessions.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </header>

      {loading && <div className="hs-state">Loading history…</div>}
      {error   && <div className="hs-state hs-state--error">Failed to load: {error}</div>}

      {!loading && !error && sessions.length === 0 && (
        <div className="hs-state">
          <div className="hs-empty-icon">📊</div>
          <p>No sessions yet. Complete a scenario to see your history here.</p>
        </div>
      )}

      {!loading && sessions.length > 0 && (
        <main className="hs-main">
          <div className="hs-grid">
            {sessions.map((s) => (
              <SessionCard key={s.id} session={s} onView={onViewSession} />
            ))}
          </div>
        </main>
      )}
    </div>
  );
}
