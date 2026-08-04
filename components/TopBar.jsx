'use client';

function formatTime(seconds) {
  if (seconds <= 0) return '00:00';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function TopBar({
  scenario, part, partIndex, onBack, onPrevPart, onNextPart,
  secondsLeft, practiceMode,
  onEndSession, hardMode, onReportIssue,
}) {
  const totalParts = scenario.parts.length;
  const isFirst    = partIndex === 0;
  const isLast     = partIndex === totalParts - 1;
  const isWarning  = !practiceMode && secondsLeft > 0 && secondsLeft <= 5 * 60;
  const isExpired  = !practiceMode && secondsLeft <= 0;

  return (
    <div className="topbar">
      <div className="topbar-left">
        <button className="topbar-back" onClick={onBack}>← Back</button>
        <span className="topbar-title">{scenario.title}</span>
      </div>

      <div className="topbar-center">
        <div className="topbar-part-nav">
          <button className="topbar-nav-btn" onClick={onPrevPart} disabled={isFirst}>‹</button>
          <span className="topbar-part-indicator">
            Part {partIndex + 1} of {totalParts}: {part.title}
          </span>
          <button className="topbar-nav-btn" onClick={onNextPart} disabled={isLast}>›</button>
        </div>
      </div>

      <div className="topbar-right">
        <button
          className="topbar-report-btn"
          onClick={onReportIssue}
          title="Something broken in this scenario? Tell us."
        >
          Report issue
        </button>
        <button className="topbar-end-btn" onClick={onEndSession}>End Session</button>
        {hardMode && (
          <span className="topbar-mode-badge topbar-mode-badge--hard">🔥 Hard</span>
        )}
        <span className="topbar-mode-badge">
          {practiceMode ? '∞ Practice' : '⏱ Timed'}
        </span>
        {practiceMode ? (
          <div className="topbar-timer topbar-timer--practice">
            <span className="topbar-timer-value">∞</span>
          </div>
        ) : (
          <div className={`topbar-timer ${isWarning ? 'topbar-timer--warning' : ''} ${isExpired ? 'topbar-timer--expired' : ''}`}>
            <span className="topbar-timer-value">
              {secondsLeft < 0 ? `+${formatTime(-secondsLeft)}` : formatTime(secondsLeft)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
