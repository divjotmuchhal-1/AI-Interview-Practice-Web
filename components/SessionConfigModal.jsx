'use client';
import { useState } from 'react';

function OptionCard({ label, description, selected, onClick, icon }) {
  return (
    <button
      className={`scm-option ${selected ? 'scm-option--selected' : ''}`}
      onClick={onClick}
      type="button"
    >
      <span className="scm-option-icon">{icon}</span>
      <span className="scm-option-body">
        <span className="scm-option-label">{label}</span>
        <span className="scm-option-desc">{description}</span>
      </span>
      <span className="scm-option-check">{selected ? '●' : '○'}</span>
    </button>
  );
}

function OptionGroup({ title, children }) {
  return (
    <div className="scm-group">
      <p className="scm-group-title">{title}</p>
      <div className="scm-group-options">{children}</div>
    </div>
  );
}

export default function SessionConfigModal({
  scenario, aiLocked = false, sessionsLeft = null, isFree = false,
  trialAvailable = false, credits = 0, onCancel, onStart, startError = null,
}) {
  const [practiceMode,    setPracticeMode]    = useState(false);
  const [hardMode,        setHardMode]        = useState(false);
  const [answerKeyHidden, setAnswerKeyHidden] = useState(false);

  // Starting now waits on the server to confirm the session was actually
  // spent, so the button has to show that it is working and must not be
  // clickable twice.
  const [starting, setStarting] = useState(false);

  const handleStart = async () => {
    if (starting) return;
    setStarting(true);
    try {
      await onStart({ practiceMode, hardMode, answerKeyAllowed: !answerKeyHidden });
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="scm-overlay" onClick={onCancel}>
      <div className="scm-modal" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="scm-header">
          <div className="scm-header-meta">
            <span className="scm-company">{scenario.company}</span>
            <span className="scm-dot">·</span>
            <span className={`scm-difficulty scm-difficulty--${scenario.difficulty.toLowerCase()}`}>{scenario.difficulty}</span>
            <span className="scm-dot">·</span>
            <span className="scm-duration">{scenario.durationMinutes} min</span>
          </div>
          <h2 className="scm-title">{scenario.title}</h2>
          {/* Reassure rather than instruct: the defaults are already the right
              choice for a first session, so nothing here blocks starting. */}
          <p className="scm-subtitle">
            Ready to go with the defaults below. Adjust them if you like, then start.
            Options are locked once the session begins.
          </p>
          {aiLocked && (
            <div className="scm-ai-locked-note">
              AI sessions used up for this month. This will be a practice run: the editor, tests, and answer key all work, but the AI coach and AI feedback are disabled and the session is not saved to history.
            </div>
          )}
          {/* Free users otherwise see only "2 of 2 AI sessions left", which reads
              as a hard cap on using the product at all and encourages hoarding.
              Say plainly that practice itself is never limited. */}
          {!aiLocked && trialAvailable && (
            <div className="scm-session-cost scm-session-cost--trial">
              <strong>Free tryout session.</strong> This one is on us: it does not use
              any of your monthly AI sessions.
            </div>
          )}
          {/* Free allowance is spent before purchased credits, so say which one
              this session will actually draw from. */}
          {!aiLocked && !trialAvailable && isFree && sessionsLeft !== null && sessionsLeft > 0 && (
            <div className="scm-session-cost">
              Uses 1 of your {sessionsLeft} free sessions this month
              {credits > 0 ? `, before touching your ${credits} pack sessions` : ''}.
              Practising without the AI coach is always unlimited.
            </div>
          )}
          {!aiLocked && !trialAvailable && isFree && sessionsLeft === 0 && credits > 0 && (
            <div className="scm-session-cost">
              Uses 1 of your {credits} pack session{credits === 1 ? '' : 's'}.
              Practising without the AI coach is always unlimited.
            </div>
          )}
        </div>

        {/* Options */}
        <div className="scm-body">
          <OptionGroup title="Timer">
            <OptionCard
              label="Timed"
              description={`${scenario.durationMinutes}-minute countdown simulating real interview pressure`}
              icon="⏱"
              selected={!practiceMode}
              onClick={() => setPracticeMode(false)}
            />
            <OptionCard
              label="Practice"
              description="No time limit. Focus on learning the concepts at your own pace"
              icon="∞"
              selected={practiceMode}
              onClick={() => setPracticeMode(true)}
            />
          </OptionGroup>

          <OptionGroup title="Coaching Intensity">
            <OptionCard
              label="Normal"
              description="Coach asks guiding questions and can offer directional hints when you're stuck"
              icon="💬"
              selected={!hardMode}
              onClick={() => setHardMode(false)}
            />
            <OptionCard
              label="Hard"
              description="Coach asks questions only, no hints or direction. You find the bug yourself"
              icon="🔥"
              selected={hardMode}
              onClick={() => setHardMode(true)}
            />
          </OptionGroup>

          <OptionGroup title="Answer Key">
            <OptionCard
              label="Available"
              description="You can reveal the answer at any time (counts against your independence score)"
              icon="🔓"
              selected={!answerKeyHidden}
              onClick={() => setAnswerKeyHidden(false)}
            />
            <OptionCard
              label="Hidden"
              description="Answer key is locked for the entire session, closest to a real interview"
              icon="🔒"
              selected={answerKeyHidden}
              onClick={() => setAnswerKeyHidden(true)}
            />
          </OptionGroup>
        </div>

        {/* Footer */}
        <div className="scm-mobile-note">
          Sessions need a desktop-sized screen: the code editor and panels do not fit on a phone.
          Come back from your computer to start this scenario.
        </div>
        {startError && <div className="scm-start-error" role="alert">{startError}</div>}
        <div className="scm-footer">
          <button className="scm-cancel" onClick={onCancel} type="button" disabled={starting}>
            Cancel
          </button>
          <button
            className="scm-start"
            onClick={handleStart}
            type="button"
            disabled={starting}
            autoFocus
          >
            {starting ? 'Starting…' : <>Start Session →</>}
          </button>
        </div>
      </div>
    </div>
  );
}
