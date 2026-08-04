'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import RadarChart from '@/components/RadarChart';

const SCORE_KEYS = [
  'score_diagnosis',
  'score_independence',
  'score_precision',
  'score_verification',
  'score_recovery',
  'score_test_ownership',
];

const AXIS_LABELS = {
  score_diagnosis:      'Diagnosis',
  score_independence:   'Independence',
  score_precision:      'Precision',
  score_verification:   'Verification',
  score_recovery:       'Recovery',
  score_test_ownership: 'Test Ownership',
};

function mean(arr) {
  const v = arr.filter(x => x != null && !isNaN(x));
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
}

function sessionAvg(s) {
  return mean(SCORE_KEYS.map(k => s[k]));
}

function computeStats(sessions) {
  if (!sessions.length) return null;

  const avgs      = sessions.map(sessionAvg);
  const validAvgs = avgs.filter(v => v != null);
  const overallAvg = validAvgs.length ? Math.round(mean(validAvgs)) : null;
  const bestAvg    = validAvgs.length ? Math.round(Math.max(...validAvgs)) : null;

  const durVals    = sessions.map(s => s.duration_ms).filter(v => v != null && v > 0);
  const avgDuration = durVals.length ? Math.round(mean(durVals) / 60000) : null;

  const axisAvgs = {};
  for (const k of SCORE_KEYS) {
    const v = mean(sessions.map(s => s[k]));
    axisAvgs[k] = v != null ? Math.round(v) : null;
  }

  const recent = sessions.slice(0, 3);
  const older  = sessions.slice(3);
  const axisTrend = {};
  for (const k of SCORE_KEYS) {
    const rAvg = mean(recent.map(s => s[k]).filter(v => v != null));
    const oAvg = mean(older.map(s => s[k]).filter(v => v != null));
    axisTrend[k] = rAvg != null && oAvg != null ? Math.round(rAvg - oAvg) : null;
  }

  const radarScores = {};
  for (const k of SCORE_KEYS) {
    radarScores[k.replace('score_', '')] = axisAvgs[k] ?? 0;
  }

  // Chronological (oldest → newest) for the trend chart
  const trendData = [...sessions].reverse().map(s => {
    const a = sessionAvg(s);
    return a != null ? Math.round(a) : null;
  }).filter(v => v != null);

  return { overallAvg, bestAvg, avgDuration, axisAvgs, axisTrend, radarScores, trendData };
}

// ── Avatar ─────────────────────────────────────────────────────────────────────

function Avatar({ email }) {
  const raw = (email ?? '').split('@')[0];
  const initials = raw.length >= 2
    ? (raw[0] + raw[1]).toUpperCase()
    : raw.toUpperCase() || '?';
  return <div className="pf-avatar">{initials}</div>;
}

// ── Stat card ──────────────────────────────────────────────────────────────────

function StatCard({ value, label, accent }) {
  return (
    <div className="pf-stat-card" style={{ '--stat-accent': accent }}>
      <div className="pf-stat-accent-bar" />
      <div className="pf-stat-num">{value ?? '–'}</div>
      <div className="pf-stat-label">{label}</div>
    </div>
  );
}

// ── Trend chart ────────────────────────────────────────────────────────────────

function TrendChart({ trendData }) {
  if (!trendData || trendData.length < 2) return null;

  const VW = 480, VH = 152;
  const PAD = { top: 22, right: 16, bottom: 30, left: 34 };
  const cw = VW - PAD.left - PAD.right;
  const ch = VH - PAD.top - PAD.bottom;
  const n  = trendData.length;

  const toX = i => PAD.left + (n === 1 ? cw / 2 : (i / (n - 1)) * cw);
  const toY = v => PAD.top + ch - (v / 100) * ch;

  const pts  = trendData.map((v, i) => ({ x: toX(i), y: toY(v), v }));
  const maxV = Math.max(...trendData);

  const area = [
    `M ${pts[0].x} ${toY(0)}`,
    ...pts.map(p => `L ${p.x} ${p.y}`),
    `L ${pts[n - 1].x} ${toY(0)}`,
    'Z',
  ].join(' ');

  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  return (
    <svg viewBox={`0 0 ${VW} ${VH}`} className="pf-trend-svg" aria-hidden="true">
      <defs>
        <linearGradient id="pf-trend-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#e8774a" stopOpacity={0.36} />
          <stop offset="100%" stopColor="#e8774a" stopOpacity={0.02} />
        </linearGradient>
      </defs>

      {/* Horizontal gridlines */}
      {[25, 50, 75, 100].map(v => (
        <g key={v}>
          <line
            x1={PAD.left} y1={toY(v)}
            x2={VW - PAD.right} y2={toY(v)}
            stroke="rgba(255,255,255,0.045)" strokeWidth={1}
          />
          <text
            x={PAD.left - 7} y={toY(v) + 3.5}
            textAnchor="end" fontSize={8.5}
            fill="rgba(138,127,114,0.65)" fontFamily="inherit"
          >{v}</text>
        </g>
      ))}

      {/* Baseline */}
      <line
        x1={PAD.left} y1={VH - PAD.bottom}
        x2={VW - PAD.right} y2={VH - PAD.bottom}
        stroke="rgba(255,255,255,0.06)" strokeWidth={1}
      />

      {/* Area + line */}
      <path d={area} fill="url(#pf-trend-grad)" />
      <path d={line} fill="none" stroke="#e8774a" strokeWidth={2}
        strokeLinejoin="round" strokeLinecap="round" />

      {/* Dots */}
      {pts.map((p, i) => {
        const isPeak = p.v === maxV;
        const isEdge = i === 0 || i === n - 1;
        const showLabel = isPeak || isEdge;
        return (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={isPeak ? 4.5 : 3.5}
              fill="#e8774a" stroke="var(--bg-surface)" strokeWidth={2} />
            {showLabel && (
              <text x={p.x} y={p.y - 10} textAnchor="middle"
                fontSize={9} fill="#e8774a" fontFamily="inherit" fontWeight="600">
                {p.v}
              </text>
            )}
          </g>
        );
      })}

      {/* Session labels on x-axis (only when not too many) */}
      {n <= 12 && pts.map((p, i) => (
        <text key={i} x={p.x} y={VH - PAD.bottom + 14}
          textAnchor="middle" fontSize={7.5}
          fill="rgba(138,127,114,0.55)" fontFamily="inherit">
          #{i + 1}
        </text>
      ))}
    </svg>
  );
}

// ── Skill breakdown ────────────────────────────────────────────────────────────

function SkillBreakdown({ axisAvgs, axisTrend }) {
  return (
    <div className="pf-skill-rows">
      {SCORE_KEYS.map((k, rowIdx) => {
        const score = axisAvgs[k];
        const trend = axisTrend[k];
        const barColor = score == null ? 'var(--text-muted)'
          : score >= 70 ? 'var(--green)'
          : score >= 45 ? 'var(--orange)'
          : 'var(--red)';
        const trendClass = trend == null ? 'pf-skill-trend--null'
          : trend > 0  ? 'pf-skill-trend--up'
          : trend < 0  ? 'pf-skill-trend--dn'
          : 'pf-skill-trend--flat';

        return (
          <div key={k} className="pf-skill-row" style={{ '--row-i': rowIdx }}>
            <span className="pf-skill-name">{AXIS_LABELS[k]}</span>
            <div className="pf-skill-bar-track">
              <div
                className="pf-skill-bar-fill"
                style={{ width: `${score ?? 0}%`, background: barColor }}
              />
            </div>
            <span className="pf-skill-score" style={{ color: barColor }}>
              {score ?? '–'}
            </span>
            <span className={`pf-skill-trend ${trendClass}`}>
              {trend == null ? '' : trend > 0 ? `↑ +${trend}` : trend < 0 ? `↓ ${trend}` : '→'}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Session filters / sort ────────────────────────────────────────────────────

const SORT_OPTIONS = [
  { value: 'date-desc',  label: 'Newest first' },
  { value: 'date-asc',   label: 'Oldest first' },
  { value: 'score-desc', label: 'Highest score' },
  { value: 'score-asc',  label: 'Lowest score' },
  { value: 'dur-desc',   label: 'Longest' },
  { value: 'dur-asc',    label: 'Shortest' },
];

const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];

function applyFiltersAndSort(sessions, { difficulty, sort }) {
  let out = [...sessions];
  if (difficulty) out = out.filter(s => s.scenario_difficulty === difficulty);
  out.sort((a, b) => {
    if (sort === 'date-desc')  return new Date(b.completed_at) - new Date(a.completed_at);
    if (sort === 'date-asc')   return new Date(a.completed_at) - new Date(b.completed_at);
    if (sort === 'score-desc') return (sessionAvg(b) ?? -1) - (sessionAvg(a) ?? -1);
    if (sort === 'score-asc')  return (sessionAvg(a) ?? 101) - (sessionAvg(b) ?? 101);
    if (sort === 'dur-desc')   return (b.duration_ms ?? 0) - (a.duration_ms ?? 0);
    if (sort === 'dur-asc')    return (a.duration_ms ?? 0) - (b.duration_ms ?? 0);
    return 0;
  });
  return out;
}

function HistoryControls({ difficulty, sort, onDifficulty, onSort, total, filtered }) {
  return (
    <div className="pf-history-controls">
      <div className="pf-filter-chips">
        <button
          className={`pf-filter-chip ${!difficulty ? 'pf-filter-chip--active' : ''}`}
          onClick={() => onDifficulty(null)}
        >All</button>
        {DIFFICULTIES.map(d => (
          <button
            key={d}
            className={`pf-filter-chip pf-filter-chip--${d.toLowerCase()} ${difficulty === d ? 'pf-filter-chip--active' : ''}`}
            onClick={() => onDifficulty(difficulty === d ? null : d)}
          >{d}</button>
        ))}
      </div>
      <div className="pf-sort-wrap">
        {filtered < total && (
          <span className="pf-filter-count">{filtered} of {total}</span>
        )}
        <select
          className="pf-sort-select"
          value={sort}
          onChange={e => onSort(e.target.value)}
        >
          {SORT_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

// ── Session card ───────────────────────────────────────────────────────────────

function fmtDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

function fmtDur(ms) {
  if (!ms) return '';
  return `${Math.round(ms / 60000)} min`;
}

function SessionCard({ session, onViewSession }) {
  const a     = sessionAvg(session);
  const score = a != null ? Math.round(a) : null;
  const color = score == null ? 'var(--text-muted)'
    : score >= 70 ? 'var(--green)'
    : score >= 45 ? 'var(--orange)'
    : 'var(--red)';

  return (
    <div className="pf-session-card">
      <div className="pf-session-top">
        <div className="pf-session-meta">
          <span className="pf-session-company">{session.scenario_company}</span>
          <span className="pf-session-difficulty">{session.scenario_difficulty}</span>
        </div>
        <div className="pf-session-score" style={{ color }}>
          {score ?? '–'}
        </div>
      </div>

      <div className="pf-session-title">{session.scenario_title}</div>

      {session.headline && (
        <p className="pf-session-headline">{session.headline}</p>
      )}

      <div className="pf-session-footer">
        <span className="pf-session-date">{fmtDate(session.completed_at)}</span>
        {session.duration_ms > 0 && (
          <span className="pf-session-dur">{fmtDur(session.duration_ms)}</span>
        )}
        <button className="pf-session-view-btn" onClick={() => onViewSession(session)}>
          View Report →
        </button>
      </div>
    </div>
  );
}

// ── Section heading ────────────────────────────────────────────────────────────

function SectionHeading({ children }) {
  return <h2 className="pf-section-heading">{children}</h2>;
}

// ── Empty state ────────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="pf-empty">
      <div className="pf-empty-glyph">◈</div>
      <p className="pf-empty-title">No sessions yet</p>
      <p className="pf-empty-sub">
        Complete your first scenario to see your diagnostic profile, skill breakdown,
        and improvement over time.
      </p>
    </div>
  );
}

// ── ProfileScreen ──────────────────────────────────────────────────────────────

export default function ProfileScreen({
  onBack,
  onViewSession,
  onChangePassword,
  onSignOut,
}) {
  const [user,       setUser]       = useState(null);
  const [sessions,   setSessions]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [difficulty, setDifficulty] = useState(null);
  const [sort,       setSort]       = useState('date-desc');

  useEffect(() => {
    const supabase = createClient();
    Promise.all([
      supabase.auth.getUser(),
      fetch('/api/sessions').then(r => r.json()),
    ]).then(([{ data }, res]) => {
      setUser(data.user ?? null);
      setSessions(res.sessions ?? []);
    }).finally(() => setLoading(false));
  }, []);

  const stats = sessions.length ? computeStats(sessions) : null;
  const visibleSessions = applyFiltersAndSort(sessions, { difficulty, sort });

  const emailHandle  = user?.email ?? '';
  const displayName  = emailHandle.split('@')[0]
    .replace(/[._-]+/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase()) || 'Your Profile';
  const joinedDate   = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : '';

  return (
    <div className="pf-root">
      {/* ── Header ── */}
      <header className="pf-header">
        <div className="pf-header-inner">
          <div className="pf-nav">
            <button className="pf-back-btn" onClick={onBack}>
              ← Back to Practice
            </button>
            <div className="picker-user-menu picker-user-menu--borderless">
              {onChangePassword && (
                <button className="picker-user-btn" onClick={onChangePassword}>
                  Change Password
                </button>
              )}
              {onSignOut && (
                <button className="picker-user-btn picker-user-btn--signout" onClick={onSignOut}>
                  Sign Out
                </button>
              )}
            </div>
          </div>

          <div className="pf-hero">
            <Avatar email={emailHandle} />
            <div className="pf-hero-info">
              <h1 className="pf-hero-name">{displayName}</h1>
              <p className="pf-hero-email">{emailHandle}</p>
              <p className="pf-hero-meta">
                {joinedDate && <span>Member since {joinedDate}</span>}
                {joinedDate && sessions.length > 0 && <span className="pf-hero-dot" aria-hidden="true" />}
                {sessions.length > 0 && (
                  <span>{sessions.length} session{sessions.length !== 1 ? 's' : ''} completed</span>
                )}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="pf-main">
        {loading && <div className="pf-loading">Loading profile…</div>}

        {!loading && !sessions.length && <EmptyState />}

        {!loading && stats && (
          <>
            {/* Stat row */}
            <div className="pf-stat-row">
              <StatCard
                value={sessions.length}
                label="Sessions Completed"
                accent="var(--accent)"
              />
              <StatCard
                value={stats.overallAvg}
                label="Average Score"
                accent="var(--green)"
              />
              <StatCard
                value={stats.bestAvg}
                label="Personal Best"
                accent="var(--amber)"
              />
              <StatCard
                value={stats.avgDuration != null ? `${stats.avgDuration}m` : null}
                label="Avg Duration"
                accent="#6b9fd4"
              />
            </div>

            {/* Charts row */}
            <div className="pf-charts-row">
              <div className="pf-card pf-chart-card">
                <SectionHeading>Score Trend</SectionHeading>
                {stats.trendData.length >= 2 ? (
                  <TrendChart trendData={stats.trendData} />
                ) : (
                  <p className="pf-chart-placeholder">
                    Complete a second session to see your score trend over time.
                  </p>
                )}
              </div>

              <div className="pf-card pf-radar-card">
                <SectionHeading>Skill Profile</SectionHeading>
                <div className="pf-radar-wrap">
                  <RadarChart scores={stats.radarScores} />
                </div>
              </div>
            </div>

            {/* Skill breakdown */}
            <div className="pf-card pf-breakdown-card">
              <SectionHeading>
                Skill Breakdown
                {sessions.length >= 4 && (
                  <span className="pf-section-sub">Trend vs. earlier sessions</span>
                )}
              </SectionHeading>
              <SkillBreakdown axisAvgs={stats.axisAvgs} axisTrend={stats.axisTrend} />
            </div>

            {/* Session history */}
            <div className="pf-sessions-section">
              <SectionHeading>
                Session History
                <span className="pf-section-sub">{sessions.length} total</span>
              </SectionHeading>
              <HistoryControls
                difficulty={difficulty}
                sort={sort}
                onDifficulty={setDifficulty}
                onSort={setSort}
                total={sessions.length}
                filtered={visibleSessions.length}
              />
              {visibleSessions.length === 0 ? (
                <p className="pf-filter-empty">No sessions match the current filter.</p>
              ) : (
                <div className="pf-sessions-grid">
                  {visibleSessions.map(s => (
                    <SessionCard key={s.id} session={s} onViewSession={onViewSession} />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
