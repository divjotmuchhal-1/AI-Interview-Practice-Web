'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import ScenarioPicker from '@/screens/ScenarioPicker';
import Workspace from '@/screens/Workspace';
import ReviewScreen from '@/screens/ReviewScreen';
import HistoryScreen from '@/screens/HistoryScreen';
import ProfileScreen from '@/screens/ProfileScreen';
import ChangePasswordScreen from '@/screens/ChangePasswordScreen';
import SubscriptionScreen from '@/screens/SubscriptionScreen';
import SessionConfigModal from '@/components/SessionConfigModal';
import MobileNotice from '@/components/MobileNotice';
import MicroSurvey from '@/components/MicroSurvey';
import { useTier } from '@/hooks/useTier';
import { track } from '@/lib/track';
import { alreadyAsked } from '@/lib/researchPrompts';

type Screen = 'picker' | 'workspace' | 'review' | 'history' | 'historysession' | 'changePassword' | 'profile' | 'profilesession' | 'subscription';

interface SessionConfig {
  practiceMode: boolean;
  hardMode: boolean;
  answerKeyAllowed: boolean;
  aiEnabled?: boolean;
}

export default function PracticePage() {
  return (
    <Suspense>
      <PracticePageInner />
    </Suspense>
  );
}

function PracticePageInner() {
  const [screen, setScreen]               = useState<Screen>('picker');
  const [activeScenario, setActiveScenario] = useState<any>(null);
  const [pendingScenario, setPendingScenario] = useState<any>(null);
  const [sessionConfig, setSessionConfig] = useState<SessionConfig | null>(null);
  const [sessionData, setSessionData]     = useState<any>(null);
  const [historySession, setHistorySession] = useState<any>(null);
  // Handle for the current attempt row, used by the workspace heartbeat to
  // record progress so an abandoned session still leaves evidence.
  const [attemptId, setAttemptId] = useState<string | null>(null);
  // The Phase 1 research prompt. Screen transitions are funnelled through
  // askThen so a question can be asked at the moment it is being lived, which
  // is the only time the answer is worth anything. `next` is the navigation the
  // user asked for and always runs, answered or skipped.
  const [survey, setSurvey] = useState<
    { moment: string; context: Record<string, unknown>; next: () => void } | null
  >(null);

  const askThen = (
    moment: string,
    context: Record<string, unknown>,
    next: () => void,
  ) => {
    if (alreadyAsked(moment)) { next(); return; }
    setSurvey({ moment, context, next });
  };

  const closeSurvey = () => {
    const next = survey?.next;
    setSurvey(null);
    next?.();
  };

  const tier         = useTier();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get('upgraded') === 'true') {
      tier.refreshSub();
      window.history.replaceState({}, '', '/practice');
    }
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  // CDN loaders (@monaco-editor/loader, pyodide) reject internal promise chains
  // with the raw <script> error Event when a load fails or is torn down
  // mid-flight (e.g. leaving the workspace). Those chains are orphaned inside
  // the libraries (no app code can catch them) and surface as
  // "[object Event]" unhandled rejections. Suppress exactly that shape.
  useEffect(() => {
    const onRejection = (e: PromiseRejectionEvent) => {
      const r: any = e.reason;
      const isScriptLoadEvent =
        r instanceof Event && (r.target as HTMLElement | null)?.tagName === 'SCRIPT';
      const isLoaderCancelation = r?.type === 'cancelation';
      if (isScriptLoadEvent || isLoaderCancelation) {
        e.preventDefault();
        console.warn('Suppressed third-party loader rejection:', r);
      }
    };
    window.addEventListener('unhandledrejection', onRejection);
    return () => window.removeEventListener('unhandledrejection', onRejection);
  }, []);

  const handleSelectScenario = (scenario: any) => {
    track('scenario_opened', { scenario: scenario.id });
    setPendingScenario(scenario);
  };

  const handleStartSession = (config: SessionConfig) => {
    // AI entitlement is decided once, at session start. Sessions started while
    // over the limit are free practice runs: no session consumed, AI coach and
    // AI grading disabled for the whole session.
    const aiEnabled = !tier.isLocked;
    track('session_started', {
      scenario: pendingScenario?.id ?? 'unknown',
      aiEnabled,
      practiceMode: config.practiceMode,
    });
    if (aiEnabled) tier.consumeSession();

    // Record the start server-side. Unlike consumeSession this fires for every
    // start including practice runs, so a scenario opened and then abandoned
    // still leaves a row. Fire and forget: telemetry must never delay or block
    // the user getting into the workspace.
    setAttemptId(null);
    fetch('/api/sessions/start', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        scenario: {
          id:         pendingScenario?.id,
          title:      pendingScenario?.title,
          difficulty: pendingScenario?.difficulty,
        },
        config: { ...config, aiEnabled },
      }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setAttemptId(d?.attemptId ?? null))
      .catch(() => {});

    const scenario = pendingScenario;
    setActiveScenario(scenario);
    setSessionConfig({ ...config, aiEnabled });
    setPendingScenario(null);
    // Asked once, on the way into the first session. Intent and current
    // alternative are only answered honestly before the product has had a
    // chance to shape the answer, and by this point the user has committed to
    // starting so the prompt is not competing with the decision to try.
    askThen('intake', { scenarioId: scenario?.id, scenarioTitle: scenario?.title },
      () => setScreen('workspace'));
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  const buildSessionReview = (session: any) => {
    const reconstructedScenario = {
      id:         session.scenario_id,
      title:      session.scenario_title,
      company:    session.scenario_company,
      difficulty: session.scenario_difficulty,
      parts:      [],
    };
    const preloadedGrade = {
      scores: {
        diagnosis:      session.score_diagnosis,
        independence:   session.score_independence,
        precision:      session.score_precision,
        verification:   session.score_verification,
        recovery:       session.score_recovery,
        test_ownership: session.score_test_ownership,
      },
      evidence:  session.evidence ?? {},
      headline:  session.headline,
      strengths: session.strengths,
      watchouts: session.watchouts,
    };
    return { scenario: reconstructedScenario, preloadedGrade, events: session.events ?? [] };
  };

  const handleViewHistorySession = (session: any) => {
    setHistorySession(buildSessionReview(session));
    setScreen('historysession');
  };

  const handleViewProfileSession = (session: any) => {
    setHistorySession(buildSessionReview(session));
    setScreen('profilesession');
  };

  // The prompt is a fixed overlay that must survive whichever screen is
  // mounted, and this component returns early per screen, so every screen-level
  // return is routed through here rather than repeating the overlay in each.
  const withSurvey = (node: React.ReactNode) => (
    <>
      {node}
      {survey && (
        <MicroSurvey
          moment={survey.moment}
          context={survey.context}
          onClose={closeSurvey}
        />
      )}
    </>
  );

  if (screen === 'subscription') {
    return withSurvey(
      <SubscriptionScreen
        tier={tier.tier}
        sessionsUsed={tier.sessionsUsed}
        sessionLimit={tier.sessionLimit}
        credits={tier.credits}
        creditsExpireAt={tier.creditsExpireAt}
        daysUntilReset={tier.daysUntilReset}
        onUpgrade={tier.upgradeToPro}
        onManageSub={tier.manageSub}
        onBack={() => {
          // Only ask people who actually hit the wall. Someone browsing the
          // pricing page with sessions still in hand has no reason not to buy
          // yet, so their answer would be noise.
          if (tier.isLocked) askThen('paywall', {}, () => setScreen('picker'));
          else setScreen('picker');
        }}
      />
    );
  }

  if (screen === 'changePassword') {
    return withSurvey(
      <ChangePasswordScreen onBack={() => setScreen('picker')} />
    );
  }

  if (screen === 'profile') {
    return withSurvey(
      <ProfileScreen
        onBack={() => setScreen('picker')}
        onViewSession={handleViewProfileSession}
        onChangePassword={() => setScreen('changePassword')}
        onSignOut={handleSignOut}
      />
    );
  }

  if (screen === 'profilesession' && historySession) {
    return withSurvey(
      <ReviewScreen
        events={historySession.events}
        scenario={historySession.scenario}
        preloadedGrade={historySession.preloadedGrade}
        onBack={() => { setHistorySession(null); setScreen('profile'); }}
      />
    );
  }

  if (screen === 'history') {
    return withSurvey(
      <HistoryScreen
        onBack={() => setScreen('picker')}
        onViewSession={handleViewHistorySession}
      />
    );
  }

  if (screen === 'historysession' && historySession) {
    return withSurvey(
      <ReviewScreen
        events={historySession.events}
        scenario={historySession.scenario}
        preloadedGrade={historySession.preloadedGrade}
        onBack={() => { setHistorySession(null); setScreen('history'); }}
      />
    );
  }

  if (screen === 'review' && sessionData) {
    return withSurvey(
      <ReviewScreen
        events={sessionData.events}
        scenario={sessionData.scenario}
        aiFeedback={sessionData.aiEnabled}
        onUpgrade={tier.tier === 'free' ? tier.upgradeToPro : undefined}
        onBack={() => askThen(
          'review',
          { scenarioId: activeScenario?.id, scenarioTitle: activeScenario?.title, attemptId },
          () => { setScreen('picker'); setSessionData(null); setActiveScenario(null); },
        )}
      />
    );
  }

  if (screen === 'workspace' && activeScenario && sessionConfig) {
    return withSurvey(
      <Workspace
        key={activeScenario.id}
        scenario={activeScenario}
        initialPracticeMode={sessionConfig.practiceMode}
        initialHardMode={sessionConfig.hardMode}
        answerKeyAllowed={sessionConfig.answerKeyAllowed}
        isAiLocked={!sessionConfig.aiEnabled}
        attemptId={attemptId}
        onUpgrade={tier.upgradeToPro}
        daysUntilReset={tier.daysUntilReset}
        onBack={() => askThen(
          'abandon',
          { scenarioId: activeScenario.id, scenarioTitle: activeScenario.title, attemptId },
          () => { setScreen('picker'); setActiveScenario(null); setSessionConfig(null); },
        )}
        onEndSession={(events: any[]) => {
          track('session_completed', {
            scenario: activeScenario.id,
            aiEnabled: Boolean(sessionConfig.aiEnabled),
          });
          setSessionData({ events, scenario: activeScenario, aiEnabled: sessionConfig.aiEnabled });
          setScreen('review');
        }}
      />
    );
  }

  return withSurvey(
    <>
      <MobileNotice />
      {pendingScenario && (
        <SessionConfigModal
          scenario={pendingScenario}
          aiLocked={tier.isLocked}
          isFree={tier.tier === 'free'}
          trialAvailable={tier.trialAvailable}
          sessionsLeft={Math.max(0, tier.sessionLimit - tier.sessionsUsed)}
          credits={tier.credits}
          onCancel={() => setPendingScenario(null)}
          onStart={handleStartSession}
        />
      )}
      <ScenarioPicker
        onSelect={handleSelectScenario}
        tier={tier.tier}
        sessionsUsed={tier.sessionsUsed}
        sessionLimit={tier.sessionLimit}
        isLocked={tier.isLocked}
        credits={tier.credits}
        daysUntilReset={tier.daysUntilReset}
        trialAvailable={tier.trialAvailable}
        onUpgrade={tier.upgradeToPro}
        onSubscription={() => setScreen('subscription')}
        onProfile={() => setScreen('profile')}
        onSignOut={handleSignOut}
      />
    </>
  );
}
