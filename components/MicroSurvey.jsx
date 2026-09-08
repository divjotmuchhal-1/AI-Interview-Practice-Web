'use client';

import { useState } from 'react';
import { MOMENTS, markAsked } from '@/lib/researchPrompts';

/**
 * One prompt, shown at one of the four research moments.
 *
 * Everything here is built around not costing the user anything. It never
 * blocks: the caller's action (leaving a session, going back to scenarios) runs
 * the moment the component closes, and the write is fire and forget. A failed
 * or slow request must never turn "I wanted to leave" into "the app hung", so
 * the response is not awaited before onClose.
 */
export default function MicroSurvey({ moment, context = {}, onClose }) {
  const spec = MOMENTS[moment];
  const [answers, setAnswers] = useState({});
  const [note, setNote] = useState('');
  const [sent, setSent] = useState(false);

  if (!spec) return null;

  const pick = (q, value) => {
    setAnswers((prev) => {
      if (!q.multi) return { ...prev, [q.id]: value };
      const current = Array.isArray(prev[q.id]) ? prev[q.id] : [];
      return {
        ...prev,
        [q.id]: current.includes(value)
          ? current.filter((v) => v !== value)
          : [...current, value],
      };
    });
  };

  const isPicked = (q, value) =>
    q.multi ? (answers[q.id] || []).includes(value) : answers[q.id] === value;

  const answered = Object.keys(answers).length > 0 || note.trim().length > 0;

  const finish = (submit) => {
    if (sent) return;
    setSent(true);
    markAsked(moment);

    if (submit && answered) {
      const payload = { ...answers };
      if (note.trim()) payload.note = note.trim();
      fetch('/api/research', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          moment,
          answers: payload,
          scenarioId:    context.scenarioId,
          scenarioTitle: context.scenarioTitle,
          partIndex:     context.partIndex,
          attemptId:     context.attemptId,
        }),
        keepalive: true, // survives the navigation this prompt usually precedes
      }).catch(() => {});
    }
    onClose();
  };

  return (
    <div className="ms-overlay" onClick={() => finish(false)}>
      <div
        className="ms-modal"
        role="dialog"
        aria-modal="true"
        aria-label={spec.title}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="ms-title">{spec.title}</h3>
        <p className="ms-subtitle">{spec.subtitle}</p>

        {spec.questions.map((q) => (
          <div className="ms-question" key={q.id}>
            <span className="ms-label">{q.label}</span>
            <div className="ms-options">
              {q.options.map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={`ms-option${isPicked(q, value) ? ' ms-option--on' : ''}`}
                  aria-pressed={isPicked(q, value)}
                  onClick={() => pick(q, value)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        ))}

        {spec.note && (
          <div className="ms-question">
            <span className="ms-label">
              {spec.note.label} <span className="ms-optional">optional</span>
            </span>
            <textarea
              className="ms-textarea"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              maxLength={2000}
            />
          </div>
        )}

        <div className="ms-actions">
          <button type="button" className="ms-skip" onClick={() => finish(false)}>
            Skip
          </button>
          <button
            type="button"
            className="ms-submit"
            onClick={() => finish(true)}
            disabled={!answered}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
