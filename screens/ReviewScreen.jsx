'use client';

import { useState, useEffect, useRef } from 'react';
import RadarChart from '@/components/RadarChart';
import { computeMetrics, buildGradingPrompt, buildCodeReviewGradingPrompt, redactLeakedAnswer } from '@/utils/scoring';

function fmtMs(ms) {
  if (ms === null || ms === undefined) return '–';
  const s = Math.round(ms / 1000);
  const m = Math.floor(s / 60);
  return m > 0 ? `${m}m ${String(s % 60).padStart(2, '0')}s` : `${s}s`;
}


const AXIS_LABELS = {
  diagnosis: 'Diagnosis', independence: 'Independence', precision: 'Precision',
  verification: 'Verification', recovery: 'Recovery', test_ownership: 'Test Ownership',
};

function ScoreBar({ axisKey, score, evidence }) {
  const label = AXIS_LABELS[axisKey] ?? axisKey;
  const pct   = Math.max(0, Math.min(100, score ?? 0));
  const color = pct >= 70 ? '#5cb87e' : pct >= 40 ? '#d4883a' : '#d9534f';
  return (
    <div className="rv-score-row">
      <div className="rv-score-label">{label}</div>
      <div className="rv-score-bar-wrap">
        <div className="rv-score-bar" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="rv-score-num">{pct}</span>
      {evidence && <div className="rv-score-evidence">{evidence}</div>}
    </div>
  );
}


function ObjectiveSignals({ m }) {
  const rows = [
    ['Session duration', fmtMs(m.totalMs)],
    ['Overtime', m.wentOvertime ? fmtMs(m.overtimeMs) : 'none'],
    ['Prompts sent', m.promptCount],
    ['Test runs', m.testRunCount],
    ['Code edits', m.codeEditCount],
    ['AI applies', m.codeAppliedCount],
    ['First test run', fmtMs(m.msToFirstTest)],
    ['First code edit', fmtMs(m.msToFirstEdit)],
    ['First AI prompt', fmtMs(m.msToFirstPrompt)],
    ['Acted before asking AI', m.actedBeforeAsked ? 'yes' : 'no'],
    ['Tested before asking AI', m.testedBeforeAsked ? 'yes' : 'no'],
    ['Rubber-stamp rate', m.codeAppliedCount ? `${Math.round(m.rubberStampRate * 100)}%  (${m.rubberStamps}/${m.codeAppliedCount})` : 'n/a'],
    ['Recovery rate', m.recoveryAttempts ? `${Math.round(m.recoveryRate * 100)}%  (${m.recoverySuccesses}/${m.recoveryAttempts})` : 'n/a'],
  ];
  return (
    <table className="rv-signals-table">
      <tbody>
        {rows.map(([label, value]) => (
          <tr key={label}>
            <td className="rv-sig-label">{label}</td>
            <td className="rv-sig-value">{String(value)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function ReviewScreen({ events, scenario, onBack, preloadedGrade = null, aiFeedback = true, onUpgrade = null }) {
  const [grade,      setGrade]      = useState(preloadedGrade);
  const [grading,    setGrading]    = useState(!preloadedGrade && aiFeedback);
  const [gradeError, setGradeError] = useState(null);
  const [saved,      setSaved]      = useState(!!preloadedGrade);
  const calledRef = useRef(false);

  const metrics = computeMetrics(events);

  useEffect(() => {
    if (!aiFeedback) return; // practice run: no AI grading, session not saved
    if (preloadedGrade) return;
    if (calledRef.current) return;
    calledRef.current = true;

    const prompt = scenario.type === 'code-review'
      ? buildCodeReviewGradingPrompt(
          metrics, scenario,
          events.filter(e => e.type === 'code_edited').at(-1)?.data?.snapshot ?? '',
          scenario.parts[0]?.diff ?? '',
        )
      : buildGradingPrompt(metrics, scenario.title);

    fetch('/api/grade', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ prompt }),
    })
      .then((r) => r.json())
      .then(({ text, error }) => {
        if (error === 'ai_feedback_locked') throw new Error('AI session limit reached for this month');
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('No JSON in response');
        // Grading prompts contain the answer key and their output is shown to
        // the candidate: drop any field that reproduces answer content.
        const gradeData = redactLeakedAnswer(
          JSON.parse(jsonMatch[0]),
          scenario.parts?.[0]?.answer ?? '',
        );
        if (metrics.answerViewCount > 0) {
          gradeData.scores.independence = Math.min(gradeData.scores.independence ?? 0, 25);
          gradeData.scores.diagnosis    = Math.min(gradeData.scores.diagnosis    ?? 0, 35);
        }
        // Overtime penalty: deterministic cap on all axes, scaled by how far
        // past the limit the candidate went (relative to the timer length).
        if (metrics.wentOvertime && metrics.timerLimitMs) {
          const overRatio = metrics.overtimeMs / metrics.timerLimitMs;
          const cap = overRatio > 0.25 ? 70 : overRatio > 0.10 ? 80 : 90;
          for (const k of Object.keys(gradeData.scores)) {
            gradeData.scores[k] = Math.min(gradeData.scores[k] ?? 0, cap);
          }
        }
        setGrade(gradeData);

        fetch('/api/sessions', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ scenario, metrics, grade: gradeData, events }),
        })
          .then((r) => r.ok && setSaved(true))
          .catch(() => {});
      })
      // Internal error text stays in the console; users see a plain message.
      .catch((err) => {
        console.error('grading failed:', err);
        setGradeError(
          err?.message === 'AI session limit reached for this month'
            ? err.message
            : 'Scoring is unavailable right now. Your session signals are shown below.',
        );
      })
      .finally(() => setGrading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const scores   = grade?.scores   ?? {};
  const evidence = grade?.evidence ?? {};

  if (grading) {
    return (
      <div className="rv-root rv-loading-screen">
        <div className="rv-loading-orb" aria-hidden="true" />
        <div className="rv-loading-spinner">
          <span /><span /><span />
        </div>
        <p className="rv-loading-title">Analysing session…</p>
        <p className="rv-loading-sub">Generating your performance report</p>
      </div>
    );
  }

  return (
    <div className="rv-root">
      <div className="rv-header">
        <button className="rv-back" onClick={onBack}>← Back to scenarios</button>
        <div className="rv-header-center">
          <span className="rv-scenario-title">{scenario.title}</span>
          <span className="rv-badge">Session Review</span>
        </div>
        <div className="rv-header-right">
          {saved && <span className="rv-saved-badge">Saved ✓</span>}
          {!aiFeedback && <span className="rv-practice-badge">Practice session · not saved</span>}
          <span className="rv-calibration-note">Calibration signal, not a verdict</span>
        </div>
      </div>

      {grade && <div className="rv-headline">{grade.headline}</div>}
      {gradeError && <div className="rv-headline rv-headline--error">{gradeError}</div>}

      <div className="rv-body">
        <div className="rv-left">
          {aiFeedback && (
            <div className="rv-card rv-card--radar">
              <div className="rv-card-title">Performance Axes</div>
              <RadarChart scores={scores} />
            </div>
          )}
          <div className="rv-card">
            <div className="rv-card-title">Objective Signals</div>
            <ObjectiveSignals m={metrics} />
          </div>
        </div>

        <div className="rv-right">
          {!aiFeedback && (
            <div className="rv-card rv-ai-locked-card">
              <div className="rv-card-title">AI Feedback</div>
              <p className="rv-ai-locked-text">
                This was a practice run: your AI sessions for the month are used up, so scoring,
                strengths, and watch-outs are not generated. Your objective signals are on the left.
              </p>
              {onUpgrade && (
                <button className="rv-ai-locked-btn" onClick={onUpgrade}>
                  Upgrade to Pro for 60 AI sessions/month →
                </button>
              )}
            </div>
          )}
          {aiFeedback && (
          <div className="rv-card">
            <div className="rv-card-title">Scores</div>
            {Object.keys(AXIS_LABELS).map((key) => (
              <ScoreBar key={key} axisKey={key} score={scores[key] ?? 0} evidence={evidence[key]} />
            ))}
          </div>
          )}
          {grade && (
            <div className="rv-card">
              <div className="rv-feedback-row">
                <div>
                  <div className="rv-card-title rv-card-title--green">Strengths</div>
                  <p className="rv-feedback-text">{grade.strengths}</p>
                </div>
                <div>
                  <div className="rv-card-title rv-card-title--orange">Watch-outs</div>
                  <p className="rv-feedback-text">{grade.watchouts}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
