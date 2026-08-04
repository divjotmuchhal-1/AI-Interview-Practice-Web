'use client';

import { useMemo } from 'react';
import { formatCall, formatValue } from '@/utils/testRunner';

const IS_MAC = typeof navigator !== 'undefined' && /Mac/.test(navigator.platform);

export default function TestPanel({ results, scenario, isLastPart, onNextPart, onRunTests, isRunning }) {
  const { moduleError, visible = [], hidden = [], consoleOutput } = results ?? { moduleError: null, visible: [], hidden: [], consoleOutput: null };
  const { functionName = '', inputKeys = [], language } = scenario.testRunner;

  const totalPass  = results && !moduleError ? [...visible, ...hidden].filter((t) => t.passed).length : 0;
  const totalCount = visible.length + hidden.length;
  const allPass    = results && totalPass === totalCount && totalCount > 0 && !moduleError;

  // New stamp per results object so row-entry animations replay on every run.
  const runStamp = useMemo(() => Date.now(), [results]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="test-panel">
      <div className="test-panel-header">
        <span className="test-panel-label">Test Results</span>
        {results && !moduleError && (
          <span className={`test-panel-score ${allPass ? 'score--pass score--allpass' : 'score--fail'}`}>
            {totalPass} / {totalCount} passing
          </span>
        )}
        <button className={`btn-run-tests ${isRunning ? 'btn-run-tests--running' : ''}`} onClick={onRunTests} disabled={isRunning}>
          {isRunning ? (
            <><span className="btn-run-spinner" aria-hidden="true" />Running</>
          ) : (
            <>▶ Run Tests<kbd className="btn-run-kbd">{IS_MAC ? '⌘↵' : 'Ctrl↵'}</kbd></>
          )}
        </button>
      </div>

      {results && !moduleError && totalCount > 0 && (
        <div className="test-progress" aria-hidden="true">
          <div
            className={`test-progress-fill ${allPass ? 'test-progress-fill--pass' : ''}`}
            style={{ width: `${(totalPass / totalCount) * 100}%` }}
          />
        </div>
      )}

      <div className="test-panel-body">
        {!results && (
          <div className="test-empty-state">
            <span>Run tests to see results</span>
            <span className="test-empty-hint"><kbd>{IS_MAC ? '⌘' : 'Ctrl'}</kbd> + <kbd>↵</kbd> to run</span>
          </div>
        )}

        {results && moduleError && (
          <div className="test-module-error">
            <span className="test-icon test-icon--fail">✗</span>
            <div>
              <div className="test-error-title">Failed to load your code</div>
              <pre className="test-error-message">{moduleError}</pre>
            </div>
          </div>
        )}

        {results && !moduleError && visible.length > 0 && (
          <section className="test-section">
            <div className="test-section-title">
              Visible tests
              <span className="test-section-count">{visible.filter((t) => t.passed).length}/{visible.length}</span>
            </div>
            {visible.map((t, i) => <VisibleTestRow key={`${runStamp}-${t.description}`} test={t} index={i} functionName={functionName} inputKeys={inputKeys} isSql={language === 'sql'} />)}
          </section>
        )}

        {results && !moduleError && hidden.length > 0 && (
          <section className="test-section">
            <div className="test-section-title">
              Hidden tests
              <span className="test-section-count">{hidden.filter((t) => t.passed).length}/{hidden.length}</span>
            </div>
            {hidden.map((t, i) => <HiddenTestRow key={`${runStamp}-${t.description}`} test={t} index={visible.length + i} />)}
          </section>
        )}

        {results && consoleOutput != null && (
          <section className="test-section test-console-section">
            <div className="test-section-title">tests.py output</div>
            <pre className={`test-console ${consoleOutput.trim() === '' ? 'test-console--empty' : ''}`}>
              {consoleOutput.trim() === '' ? 'No output. Add print() calls to tests.py to see results here.' : consoleOutput}
            </pre>
          </section>
        )}

        {allPass && !isLastPart && (
          <div className="test-next-part">
            <span className="test-next-part-label"><span className="test-next-part-check">✓</span> All tests passing</span>
            <button className="test-next-part-btn" onClick={onNextPart}>Next Part →</button>
          </div>
        )}
        {allPass && isLastPart && (
          <div className="test-next-part test-next-part--complete">
            <span className="test-next-part-label"><span className="test-next-part-check">✓</span> Scenario complete 🎉</span>
          </div>
        )}
      </div>
    </div>
  );
}

function VisibleTestRow({ test, index = 0, functionName, inputKeys, isSql }) {
  const { passed, description, input, expectedOutput, actual, error, isDeterminism } = test;
  return (
    <div className={`test-row ${passed ? 'test-row--pass' : 'test-row--fail'}`} style={{ '--row-i': index }}>
      <span className={`test-icon ${passed ? 'test-icon--pass' : 'test-icon--fail'}`}>{passed ? '✓' : '✗'}</span>
      <div className="test-row-content">
        <div className="test-description">{description}</div>
        {!passed && (
          <div className="test-details">
            {!isSql && (
              <div className="test-detail-row">
                <span className="test-detail-label">call</span>
                <code className="test-detail-value test-call">{formatCall(functionName, inputKeys, input)}</code>
              </div>
            )}
            <div className="test-detail-row">
              <span className="test-detail-label">expected</span>
              <code className="test-detail-value test-expected">
                {isDeterminism ? '(same value on every call)' : formatValue(expectedOutput)}
              </code>
            </div>
            {error ? (
              <div className="test-detail-row">
                <span className="test-detail-label">error</span>
                <code className="test-detail-value test-actual-fail">{error}</code>
              </div>
            ) : (
              <div className="test-detail-row">
                <span className="test-detail-label">actual</span>
                <code className="test-detail-value test-actual-fail">{formatValue(actual)}</code>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function HiddenTestRow({ test, index = 0 }) {
  const { passed, description } = test;
  return (
    <div className={`test-row ${passed ? 'test-row--pass' : 'test-row--fail'}`} style={{ '--row-i': index }}>
      <span className={`test-icon ${passed ? 'test-icon--pass' : 'test-icon--fail'}`}>{passed ? '✓' : '✗'}</span>
      <div className="test-row-content"><div className="test-description">{description}</div></div>
    </div>
  );
}
