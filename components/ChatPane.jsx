'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';

const MAX_PROMPTS = 15;
const MAX_PAIRS   = 6;
const MAX_TOKENS  = 1024;

const QUICK_ACTIONS = [
  { id: 'summarize', label: 'Summarize README', prompt: 'Summarize the task requirements in 3 bullet points. What are the key behaviours I need to fix?' },
  { id: 'hint',      label: 'Give me a hint',   prompt: 'Give me one small hint. Point me to the right area of the code, the method or block worth inspecting, without telling me what the fix is.' },
  { id: 'explain',   label: 'Why is this failing?', prompt: 'Pick the first failing test and explain exactly what it is checking and what the current code produces instead. Do not show the fix.' },
  { id: 'deeper',    label: 'Deeper hint',       prompt: 'Give me a deeper hint. Point to the specific line or condition that is wrong and explain what it currently does versus what it should do. Do not write the corrected code.' },
  { id: 'tests',     label: 'Suggest tests',     prompt: 'Suggest 2–3 additional test cases that expose edge cases not covered by the visible tests. Write them as runnable Python calls targeting the current scenario.' },
];

const QUICK_ACTIONS_REVIEW = [
  { id: 'areas',    label: 'What areas to check?', prompt: 'What categories of issues should I be looking for in a PR review? Give me a checklist, no spoilers.' },
  { id: 'hint',     label: 'Give me a hint',        prompt: 'Give me one small hint. Point me toward an area of the diff worth scrutinising more carefully, without telling me what the issue is.' },
  { id: 'severity', label: 'How bad is it?',         prompt: 'For the issue I just described, help me reason about its severity and real-world exploitability.' },
  { id: 'deeper',   label: 'Deeper hint',            prompt: 'Give me a deeper hint. Point to the specific line or pattern that is problematic, but do not name the issue.' },
  { id: 'test',     label: 'How would you test it?', prompt: 'For one of the issues I found, how would you write a test or reproduce it to confirm it is real?' },
];

function buildCodeReviewSystemPrompt(scenario, part, fileContents, historySummary, hardMode) {
  const findings = fileContents['findings.md'] ?? '(nothing written yet)';

  let sys = `You are an expert code reviewer coaching a candidate on PR review skills.
The candidate is reading a PR diff and writing their findings. They are NOT writing code.

Scenario: ${scenario.title} (${scenario.difficulty})

=== Task ===
${part.readme}

=== PR Diff ===
${part.diff}

=== Candidate's Current Findings ===
${findings}

=== Coaching Rules (follow strictly) ===
1. NEVER reveal issues the candidate has not found yet. Ask probing questions instead.
2. Guide with questions: "Have you thought about what happens if the token has no 'Bearer' prefix?" not "The Bearer check is missing."
3. If they find an issue correctly, confirm it and ask about its severity or exploitability.
4. If they ask for the answer, decline warmly and nudge toward a specific area.
5. Be concise: one question or observation per reply.
6. If the candidate says they will try something but has not yet reported any result (e.g., "okay", "I'll look", "makes sense"), do not praise or advance. Ask what they observed when they did.`;

  if (hardMode) {
    sys += `\n\n=== HARD MODE ===\nIn roughly 1 of every 3 responses, introduce ONE realistic bar-raiser challenge: "Is this actually exploitable in practice?", "How would you test for this?", or "What's the fix and does it introduce new issues?"`;
  }

  if (historySummary) {
    sys += `\n\n=== Earlier conversation (window trimmed) ===\n${historySummary}`;
  }

  return sys;
}

function buildSystemPrompt(scenario, part, partIndex, fileContents, testResults, historySummary, hardMode) {
  const allTests = testResults ? [...(testResults.visible || []), ...(testResults.hidden || [])] : [];
  const failing  = allTests.filter((t) => !t.passed);

  let sys = `You are an expert coding interview coach in a debugging practice platform.
The candidate has a BROKEN implementation and must find and fix the bugs, not rewrite from scratch.

Scenario: ${scenario.title} (${scenario.difficulty})
Part ${partIndex + 1} of ${scenario.parts.length}: ${part.title}

=== Task (README) ===
${part.readme}

=== Current Code ===`;

  for (const [name, code] of Object.entries(fileContents)) {
    sys += `\n\n--- ${name} ---\n${code}`;
  }

  if (testResults?.moduleError) {
    sys += `\n\n=== Module Load Error ===\n${testResults.moduleError}`;
  } else if (failing.length > 0) {
    sys += `\n\n=== Failing Tests (${failing.length} of ${allTests.length}) ===`;
    for (const t of failing.slice(0, 6)) {
      sys += `\n• "${t.description}"`;
      if (t.error) { sys += `\n  error: ${t.error}`; }
      else { sys += `\n  expected: ${JSON.stringify(t.expectedOutput)}\n  actual:   ${JSON.stringify(t.actual)}`; }
    }
  } else if (testResults) {
    sys += `\n\n=== All ${allTests.length} tests passing ===`;
  }

  if (historySummary) {
    sys += `\n\n=== Earlier conversation (window trimmed) ===\n${historySummary}`;
  }

  sys += `

=== Coaching Rules (follow strictly) ===
You are a GUIDE, not a solver. These rules are absolute:

1. NEVER write corrected implementation code.
2. Ask one pointed question or make one observation that steers the candidate toward the bug.
3. Escalate hints gradually: broad area → suspicious method → specific line → explain the bug mechanism.
4. If the candidate correctly guesses a specific file, line number, method name, or property name, do NOT confirm or deny it. Instead ask them to explain what that code currently does and what it should produce. Let them verify the hypothesis themselves. Never say "Yes" or "Correct" in response to a location guess.
5. If the candidate asks for the fix, decline warmly and redirect.
6. If the candidate gives up, say: "No problem. Use the Answer Key button to see the solution."
7. Writing additional TEST CASES (not fixes) is allowed.
8. Be concise: one question or observation per reply.
9. ONLY if the candidate explicitly says they WILL try something but hasn't reported back yet (e.g., "okay", "I'll do that", "let me try"), ask "What did you see when you tried it?" before moving on. Do NOT apply this rule when the candidate is asking a new question or requesting help with something different.
10. If the candidate asks you to explain a concept, clarify how a piece of code works, or summarize the task or codebase, answer their question directly and helpfully. This is legitimate coaching support, not asking for the fix. After answering, you may ask one follow-up question to connect it back to the bug.
11. If the candidate changes topic or asks a clearly different question, follow them. Do not keep repeating a previous question.`;

  if (hardMode) {
    sys += `

=== HARD MODE ===
In roughly 1 of every 3 responses, introduce ONE realistic interviewer distraction:
- Scope creep, Over-engineering bait, Scale concern, or Correctness doubt.
Never combine a distraction with a real hint in the same message.`;
  }

  return sys;
}

function trimHistory(fullHistory, existingSummary) {
  const limit = MAX_PAIRS * 2 + 1;
  if (fullHistory.length <= limit) return { apiMessages: fullHistory, updatedSummary: existingSummary };

  const toDrop = fullHistory.slice(0, fullHistory.length - limit);
  const kept   = fullHistory.slice(fullHistory.length - limit);
  const droppedTexts = toDrop
    .filter((m) => m.role === 'user')
    .map((m) => (m.content.length > 55 ? m.content.slice(0, 52) + '…' : m.content))
    .join(' | ');

  const updatedSummary = existingSummary ? `${existingSummary} | ${droppedTexts}` : droppedTexts;
  return { apiMessages: kept, updatedSummary };
}

function parseCodeBlocks(text, knownFiles) {
  const blocks = [];
  const regex  = /```(?:[a-zA-Z]*)?\n([\s\S]*?)```/g;
  let m;
  while ((m = regex.exec(text)) !== null) {
    const raw       = m[1];
    const firstLine = raw.split('\n')[0].trim();
    const fnMatch   =
      firstLine.match(/^\/\/\s*([\w./\\-]+\.[a-z]{2,4})$/i) ||
      firstLine.match(/^#\s*([\w./\\-]+\.py)$/i);
    const rawFilename = fnMatch ? fnMatch[1] : null;
    let filename = rawFilename;
    if (filename && knownFiles?.length && !knownFiles.includes(filename)) {
      const base  = filename.split('/').pop();
      const found = knownFiles.find((f) => f === filename || f.endsWith('/' + base) || f === base);
      if (found) filename = found;
    }
    const code = fnMatch ? raw.split('\n').slice(1).join('\n') : raw;
    blocks.push({ raw, code, filename });
  }
  return blocks;
}

function MessageBubble({ msg, knownFiles, onApply }) {
  if (msg.role === 'user') {
    return (
      <div className="chat-msg chat-msg--user">
        <div className="chat-bubble chat-bubble--user">{msg.content}</div>
      </div>
    );
  }
  const blocks   = parseCodeBlocks(msg.content, knownFiles);
  const applyable = blocks.filter((b) => b.filename);
  return (
    <div className="chat-msg chat-msg--assistant">
      <div className="chat-bubble chat-bubble--assistant">
        <ReactMarkdown>{msg.content}</ReactMarkdown>
        {msg.streaming && <span className="chat-cursor">▌</span>}
      </div>
      {!msg.streaming && applyable.map((b, i) => (
        <button key={i} className="chat-apply-btn" onClick={() => onApply(b.filename, b.code)}>
          ↳ Apply to editor: {b.filename}
        </button>
      ))}
    </div>
  );
}

function BudgetBadge({ used }) {
  const remaining = MAX_PROMPTS - used;
  const cls = remaining <= 2 ? 'chat-budget chat-budget--crit'
            : remaining <= 5 ? 'chat-budget chat-budget--warn'
            : 'chat-budget';
  return <span className={cls}>{remaining} left</span>;
}

export default function ChatPane({
  scenario, part, partIndex, fileContents, testResults,
  hardMode, isAiLocked, onUpgrade, daysUntilReset, onApplyCode, onLogEvent,
}) {
  const [messages,       setMessages]       = useState([]);
  const [input,          setInput]          = useState('');
  const [isLoading,      setIsLoading]      = useState(false);
  const [error,          setError]          = useState(null);
  const [promptsUsed,    setPromptsUsed]    = useState(0);
  const [historySummary, setHistorySummary] = useState('');

  const bottomRef  = useRef(null);
  const abortedRef = useRef(false);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  useEffect(() => () => { abortedRef.current = true; }, []);

  const budgetExhausted = promptsUsed >= MAX_PROMPTS;

  const sendMessage = useCallback(async (text) => {
    if (!text.trim() || isLoading || budgetExhausted) return;
    setError(null);
    abortedRef.current = false;
    onLogEvent?.('prompt_sent', { text });
    setPromptsUsed((n) => n + 1);

    const userMsg = { role: 'user', content: text };
    const history = [...messages, userMsg];
    setMessages([...history, { role: 'assistant', content: '', streaming: true }]);
    setIsLoading(true);
    setInput('');

    const { apiMessages, updatedSummary } = trimHistory(
      history.map(({ role, content }) => ({ role, content })),
      historySummary,
    );
    if (updatedSummary !== historySummary) setHistorySummary(updatedSummary);

    const systemText = scenario.type === 'code-review'
      ? buildCodeReviewSystemPrompt(scenario, part, fileContents, updatedSummary, hardMode)
      : buildSystemPrompt(scenario, part, partIndex, fileContents, testResults, updatedSummary, hardMode);

    try {
      const res = await fetch('/api/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model:      'claude-sonnet-4-6',
          max_tokens: MAX_TOKENS,
          system:     [{ type: 'text', text: systemText, cache_control: { type: 'ephemeral' } }],
          messages:   apiMessages,
        }),
      });

      // Map status codes to messages the user can act on. The response body is
      // never shown: it can carry server or provider detail.
      if (!res.ok) {
        const byStatus = {
          401: 'Your session expired. Refresh the page and sign in again.',
          403: 'You have used all your AI sessions for this month.',
          413: 'That message is too long. Try a shorter question.',
          429: 'Too many requests. Wait a moment and try again.',
        };
        throw new Error(byStatus[res.status] ?? 'The AI coach is unavailable right now. Try again in a moment.');
      }

      const reader = res.body.getReader();
      const dec    = new TextDecoder();
      let buf      = '';
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done || abortedRef.current) break;
        buf += dec.decode(value, { stream: true });
        const parts = buf.split('\n\n');
        buf = parts.pop() ?? '';

        for (const chunk of parts) {
          if (!chunk.startsWith('data: ')) continue;

          // Parse defensively, but handle events outside the try so a thrown
          // stream error is not swallowed by the parse catch.
          let ev;
          try {
            ev = JSON.parse(chunk.slice(6));
          } catch (_) {
            continue;
          }

          if (ev.type === 'stream_error') {
            throw new Error('The AI coach stopped unexpectedly. Try again in a moment.');
          }

          if (ev.type === 'message_start') {
            const u = ev.message?.usage ?? {};
            console.log(
              '%c[AI cost] input=%d output=%d cache_created=%d cache_read=%d window=%d/%d msgs',
              'color:#c9a555;font-size:11px',
              u.input_tokens ?? 0, u.output_tokens ?? 0,
              u.cache_creation_input_tokens ?? 0, u.cache_read_input_tokens ?? 0,
              apiMessages.length, history.length,
            );
          }
          if (ev.type === 'content_block_delta' && ev.delta?.type === 'text_delta') {
            accumulated += ev.delta.text;
            if (!abortedRef.current) {
              setMessages((prev) => [
                ...prev.slice(0, -1),
                { role: 'assistant', content: accumulated, streaming: true },
              ]);
            }
          }
        }
      }

      if (!abortedRef.current) {
        onLogEvent?.('ai_response', { text: accumulated, chars: accumulated.length });
        setMessages((prev) => [
          ...prev.slice(0, -1),
          { ...prev[prev.length - 1], streaming: false },
        ]);
      }
    } catch (err) {
      if (!abortedRef.current) {
        const msg = err?.message || String(err);
        setError(msg);
        setMessages((prev) => [
          ...prev.slice(0, -1),
          { role: 'assistant', content: `Error: ${msg}`, streaming: false },
        ]);
      }
    }
    setIsLoading(false);
  }, [messages, isLoading, budgetExhausted, historySummary,
      scenario, part, partIndex, fileContents, testResults, hardMode, onLogEvent]);

  const handleSubmit = useCallback((e) => { e?.preventDefault(); sendMessage(input); }, [sendMessage, input]);

  const knownFiles   = Object.keys(fileContents);
  const windowTrimmed = historySummary.length > 0;

  if (isAiLocked) {
    return (
      <div className="pane">
        <div className="pane-header">
          <span className="pane-label">AI Assistant</span>
          <span className="pane-badge pane-badge--locked">Free</span>
        </div>
        <div className="pane-body chat-upgrade-body">
          <div className="chat-upgrade">
            <div className="chat-upgrade-icon">🔒</div>
            <p className="chat-upgrade-title">AI sessions exhausted</p>
            <p className="chat-upgrade-sub">
              You've used all 3 free AI sessions this month.<br />
              Resets in <strong>{daysUntilReset} day{daysUntilReset !== 1 ? 's' : ''}</strong>.
            </p>
            <button className="chat-upgrade-btn" onClick={onUpgrade}>Upgrade to Pro →</button>
            <p className="chat-upgrade-note">Pro gives unlimited sessions, longer history, and priority responses.</p>
            <p className="chat-upgrade-note">You can still read the README, edit code, and run tests below.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pane chat-pane">
      <div className="pane-header">
        <span className="pane-label">AI Assistant</span>
        <span className="pane-badge">sonnet-4-6</span>
        <BudgetBadge used={promptsUsed} />
        <button
          className="chat-clear-btn"
          onClick={() => { setMessages([]); setError(null); setHistorySummary(''); }}
          disabled={isLoading}
        >
          Clear
        </button>
      </div>

      <div className="pane-body chat-messages">
        {windowTrimmed && (
          <div className="chat-window-notice">
            Earlier messages summarised to save context.
          </div>
        )}
        {messages.length === 0 && !isLoading && (
          <div className="chat-empty">
            <div className="chat-empty-icon">✦</div>
            <p>Ask the AI coach for a hint, explanation, or to suggest edge-case tests.</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <MessageBubble key={i} msg={msg} knownFiles={knownFiles} onApply={onApplyCode} />
        ))}
        {error && <div className="chat-error-banner">{error}</div>}
        {budgetExhausted && (
          <div className="chat-budget-notice">Session prompt budget reached (15 prompts).</div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="chat-quick-actions">
        {(scenario.type === 'code-review' ? QUICK_ACTIONS_REVIEW : QUICK_ACTIONS).map((a) => (
          <button
            key={a.id}
            className="chat-quick-btn"
            disabled={isLoading || budgetExhausted}
            onClick={() => sendMessage(a.prompt)}
          >
            {a.label}
          </button>
        ))}
      </div>

      <form className="chat-input-form" onSubmit={handleSubmit}>
        <textarea
          className="chat-textarea"
          rows={1}
          placeholder={budgetExhausted ? 'Budget reached' : 'Ask the coach…'}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isLoading || budgetExhausted}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
        />
        <button className="chat-send-btn" type="submit" disabled={isLoading || !input.trim() || budgetExhausted}>
          ↑
        </button>
      </form>
    </div>
  );
}
