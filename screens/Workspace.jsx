'use client';
import { useState, useCallback, useEffect, useRef } from 'react';
import { PanelGroup as Group, Panel, PanelResizeHandle as Separator } from 'react-resizable-panels';
import TopBar from '@/components/TopBar';
import Sidebar from '@/components/Sidebar';
import EditorPane from '@/components/EditorPane';
import TestPanel from '@/components/TestPanel';
import ChatPane from '@/components/ChatPane';
import DiffViewer from '@/components/DiffViewer';
import PartWarningModal from '@/components/PartWarningModal';
import ReportIssueModal from '@/components/ReportIssueModal';
import { runTests, warmupRunner } from '@/utils/testRunner';
import { stripBugComments } from '@/utils/stripBugComments';

export default function Workspace({ scenario, onBack, onEndSession, isAiLocked, onUpgrade, daysUntilReset, initialPracticeMode = false, initialHardMode = false, answerKeyAllowed = true }) {
  // ── Part navigation ──────────────────────────────────────────────────────────
  const [partIndex, setPartIndex] = useState(0);
  const part = scenario.parts[partIndex];

  // ── Editor state ─────────────────────────────────────────────────────────────
  // solution.py is used by the test runner internally, never shown in the editor.
  const HIDDEN_FILES = ['solution.py', 'solution.js'];
  const visibleEntries = (files) => {
    const all = Object.entries(files);
    const filtered = all.filter(([k]) => !HIDDEN_FILES.includes(k));
    return filtered.length > 0 ? filtered : all;
  };

  const [fileContents, setFileContents] = useState(() =>
    Object.fromEntries(
      visibleEntries(part.starterFiles).map(([k, v]) => [k, stripBugComments(v)])
    )
  );
  const [activeFile, setActiveFile] = useState(
    () => visibleEntries(part.starterFiles)[0]?.[0] ?? Object.keys(part.starterFiles)[0]
  );
  const [testResults, setTestResults] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [showReport, setShowReport] = useState(false);

  // ── Timer: locked to pre-session config ─────────────────────────────────────
  const totalSeconds = (scenario.durationMinutes ?? 30) * 60;
  const [secondsLeft, setSecondsLeft] = useState(totalSeconds);
  const practiceMode = initialPracticeMode;

  // ── Hard mode: locked to pre-session config ──────────────────────────────────
  const hardMode = initialHardMode;

  // Keeps counting into negative values after expiry: overtime is displayed
  // as +MM:SS and factored into grading.
  useEffect(() => {
    if (practiceMode) return;
    const id = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearInterval(id);
  }, [practiceMode]);

  const [showTimeUp, setShowTimeUp] = useState(false);
  const timeUpFiredRef = useRef(false);

  const isCodeReview = scenario.type === 'code-review';

  // Pre-warm the test runtime so the first "Run Tests" click is instant
  useEffect(() => {
    if (!isCodeReview) warmupRunner(scenario);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Session events ───────────────────────────────────────────────────────────
  const sessionStart = useRef(Date.now());
  const [events, setEvents] = useState([]);
  const editDebounce = useRef(null);

  const logEvent = useCallback((type, data) => {
    setEvents((prev) => [
      ...prev,
      { type, t: Date.now() - sessionStart.current, data },
    ]);
  }, []);

  // Fire the time's-up moment exactly once. Must come after logEvent is
  // declared: the dependency array is evaluated during render, so referencing
  // logEvent earlier hits its temporal dead zone and throws.
  useEffect(() => {
    if (practiceMode || secondsLeft > 0 || timeUpFiredRef.current) return;
    timeUpFiredRef.current = true;
    logEvent('timer_expired', { limitSeconds: totalSeconds });
    setShowTimeUp(true);
  }, [secondsLeft, practiceMode, logEvent, totalSeconds]);

  // ── Part switching ───────────────────────────────────────────────────────────
  // Keep per-part file snapshots so navigating back restores the user's edits.
  const savedFilesPerPart = useRef({});
  const fileContentsRef   = useRef(fileContents);
  fileContentsRef.current = fileContents; // always current without being a dep

  const goToPart = useCallback(
    (idx) => {
      if (idx < 0 || idx >= scenario.parts.length) return;
      // Persist current part's edits before leaving
      savedFilesPerPart.current[partIndex] = fileContentsRef.current;
      const next = scenario.parts[idx];
      logEvent('part_advanced', { from: partIndex, to: idx });
      setPartIndex(idx);
      // Restore saved edits if the user has visited this part before
      setFileContents(
        savedFilesPerPart.current[idx] ??
        Object.fromEntries(
          visibleEntries(next.starterFiles).map(([k, v]) => [k, stripBugComments(v)])
        )
      );
      setActiveFile(visibleEntries(next.starterFiles)[0]?.[0] ?? Object.keys(next.starterFiles)[0]);
      setTestResults(null);
    },
    [scenario, partIndex, logEvent],
  );

  const [showPartWarning, setShowPartWarning] = useState(false);

  const handleNextPart = useCallback(() => {
    const allPassed = testResults?.visible?.every((t) => t.passed);
    if (!allPassed) {
      setShowPartWarning(true);
      return;
    }
    goToPart(partIndex + 1);
  }, [testResults, partIndex, goToPart]);

  // ── File editing ─────────────────────────────────────────────────────────────
  const handleFileChange = useCallback((filename, content) => {
    setFileContents((prev) => ({ ...prev, [filename]: content }));
    clearTimeout(editDebounce.current);
    editDebounce.current = setTimeout(() => {
      logEvent('code_edited', { filename, snapshot: content });
    }, 1500);
  }, [logEvent]);

  // Playwright / devtools injection helper
  useEffect(() => {
    window.__setFileContent = (filename, content) =>
      setFileContents((prev) => ({ ...prev, [filename]: content }));
    return () => { delete window.__setFileContent; };
  }, []);

  // Apply code from AI chat: update React state AND Monaco model
  const handleApplyCode = useCallback((filename, code) => {
    setFileContents((prev) => ({ ...prev, [filename]: code }));
    logEvent('code_applied', { filename });
    try {
      const models = window.__monaco?.editor?.getModels() ?? [];
      const model = models.find((m) => m.uri.toString().includes(filename));
      if (model) model.setValue(code);
    } catch (_) {}
  }, [logEvent]);

  // ── Test runner ──────────────────────────────────────────────────────────────
  const handleRunTests = useCallback(async () => {
    setIsRunning(true);
    try {
      // Merge hidden files (e.g. solution.py) back in for the test runner only.
      // Exclude any file already in fileContents. It's being shown in the editor
      // (happens when solution.js is the only file in a scenario).
      const hiddenFiles = Object.fromEntries(
        Object.entries(part.starterFiles).filter(([k]) => HIDDEN_FILES.includes(k) && !(k in fileContents))
      );
      const results = await runTests({ ...fileContents, ...hiddenFiles }, scenario, partIndex);
      setTestResults(results);
      const all = [...(results.visible ?? []), ...(results.hidden ?? [])];
      logEvent('tests_run', {
        partIndex,
        moduleError: results.moduleError ?? null,
        passing: all.filter((t) => t.passed).length,
        total: all.length,
      });
    } catch (e) {
      const err = { moduleError: e.message, visible: [], hidden: [] };
      setTestResults(err);
      logEvent('tests_run', { partIndex, moduleError: e.message, passing: 0, total: 0 });
    }
    setIsRunning(false);
  }, [fileContents, scenario, partIndex, logEvent]);

  // Cmd/Ctrl+Enter runs tests from anywhere in the workspace, including the editor.
  useEffect(() => {
    if (isCodeReview) return;
    const onKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        if (!isRunning) handleRunTests();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleRunTests, isRunning, isCodeReview]);

  const isLastPart = partIndex === scenario.parts.length - 1;

  return (
    <div className="workspace-root">
      {/* Shown via CSS only below the mobile breakpoint */}
      <div className="workspace-mobile-gate" role="alert">
        <span className="workspace-mobile-gate-icon" aria-hidden="true">💻</span>
        <h2 className="workspace-mobile-gate-title">This workspace needs a bigger screen</h2>
        <p className="workspace-mobile-gate-text">
          The code editor, tests, and AI coach are built for desktop. Widen this window or
          rotate a tablet to landscape to continue, or leave and restart from a computer.
        </p>
        <button className="workspace-mobile-gate-btn" onClick={onBack}>← Leave session</button>
      </div>
      <TopBar
        scenario={scenario}
        part={part}
        partIndex={partIndex}
        onBack={onBack}
        onPrevPart={() => goToPart(partIndex - 1)}
        onNextPart={handleNextPart}
        secondsLeft={secondsLeft}
        practiceMode={practiceMode}
        onEndSession={() => onEndSession(events)}
        hardMode={hardMode}
        onReportIssue={() => setShowReport(true)}
      />

      {showReport && (
        <ReportIssueModal
          scenario={scenario}
          part={part}
          partIndex={partIndex}
          files={fileContents}
          onClose={() => setShowReport(false)}
        />
      )}

      {showTimeUp && (
        <div className="tum-overlay">
          <div className="tum-modal" role="alertdialog" aria-labelledby="tum-title">
            <div className="tum-icon" aria-hidden="true">⏰</div>
            <h2 className="tum-title" id="tum-title">Time&apos;s up</h2>
            <p className="tum-text">
              The {scenario.durationMinutes}-minute timer has run out. You can keep working
              in overtime, but overtime is recorded and will lower your score.
            </p>
            <div className="tum-actions">
              <button className="tum-continue" onClick={() => setShowTimeUp(false)}>
                Continue in overtime
              </button>
              <button className="tum-end" onClick={() => onEndSession(events)}>
                End session now
              </button>
            </div>
          </div>
        </div>
      )}

      <Group direction="horizontal" className="workspace-panels">
        {/* ── Sidebar ───────────────────────────────────────── */}
        <Panel defaultSize={22} minSize={14} id="sidebar">
          <Sidebar
            files={fileContents}
            activeFile={activeFile}
            onFileSelect={setActiveFile}
            readme={part.readme}
            answer={part.answer ?? null}
            answerFiles={part.answerFiles ?? null}
            starterFiles={part.starterFiles}
            partTitle={part.title}
            answerKeyAllowed={answerKeyAllowed}
            onViewAnswer={() => logEvent('answer_viewed', { partIndex })}
          />
        </Panel>

        <Separator className="resize-handle resize-handle--col" />

        {/* ── Center: editor + test panel (or diff + findings) ─ */}
        <Panel defaultSize={53} minSize={25} id="center">
          <Group direction="vertical">
            {isCodeReview ? (
              <>
                <Panel defaultSize={60} minSize={25} id="diff">
                  <DiffViewer diff={part.diff} />
                </Panel>
                <Separator className="resize-handle resize-handle--row" />
                <Panel defaultSize={40} minSize={15} id="findings">
                  <EditorPane
                    fileContents={fileContents}
                    activeFile={activeFile}
                    onFileSelect={setActiveFile}
                    onFileChange={handleFileChange}
                    editorKey={`${scenario.id}-part-${partIndex}`}
                  />
                </Panel>
              </>
            ) : (
              <>
                <Panel defaultSize={65} minSize={20} id="editor">
                  <EditorPane
                    fileContents={fileContents}
                    activeFile={activeFile}
                    onFileSelect={setActiveFile}
                    onFileChange={handleFileChange}
                    editorKey={`${scenario.id}-part-${partIndex}`}
                  />
                </Panel>
                <Separator className="resize-handle resize-handle--row" />
                <Panel defaultSize={35} minSize={15} id="tests">
                  <TestPanel
                    results={testResults}
                    scenario={scenario}
                    isLastPart={isLastPart}
                    onNextPart={handleNextPart}
                    onRunTests={handleRunTests}
                    isRunning={isRunning}
                  />
                </Panel>
              </>
            )}
          </Group>
        </Panel>

        <Separator className="resize-handle resize-handle--col" />

        {/* ── Chat ──────────────────────────────────────────── */}
        <Panel defaultSize={25} minSize={15} id="chat">
          <ChatPane
            scenario={scenario}
            part={part}
            partIndex={partIndex}
            fileContents={fileContents}
            testResults={testResults}
            hardMode={hardMode}
            isAiLocked={isAiLocked}
            onUpgrade={onUpgrade}
            daysUntilReset={daysUntilReset}
            onApplyCode={handleApplyCode}
            onLogEvent={logEvent}
          />
        </Panel>
      </Group>

      {showPartWarning && (
        <PartWarningModal
          partIndex={partIndex}
          onConfirm={() => { setShowPartWarning(false); goToPart(partIndex + 1); }}
          onCancel={() => setShowPartWarning(false)}
        />
      )}
    </div>
  );
}
