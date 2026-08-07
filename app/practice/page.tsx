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
import { useTier } from '@/hooks/useTier';
import { track } from '@/lib/track';

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
    }).catch(() => {});

    setActiveScenario(pendingScenario);
    setSessionConfig({ ...config, aiEnabled });
    setPendingScenario(null);
    setScreen('workspace');
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

  if (screen === 'subscription') {
    return (
      <SubscriptionScreen
        tier={tier.tier}
        sessionsUsed={tier.sessionsUsed}
        sessionLimit={tier.sessionLimit}
        daysUntilReset={tier.daysUntilReset}
        onUpgrade={tier.upgradeToPro}
        onManageSub={tier.manageSub}
        onBack={() => setScreen('picker')}
      />
    );
  }

  if (screen === 'changePassword') {
    return (
      <ChangePasswordScreen onBack={() => setScreen('picker')} />
    );
  }

  if (screen === 'profile') {
    return (
      <ProfileScreen
        onBack={() => setScreen('picker')}
        onViewSession={handleViewProfileSession}
        onChangePassword={() => setScreen('changePassword')}
        onSignOut={handleSignOut}
      />
    );
  }

  if (screen === 'profilesession' && historySession) {
    return (
      <ReviewScreen
        events={historySession.events}
        scenario={historySession.scenario}
        preloadedGrade={historySession.preloadedGrade}
        onBack={() => { setHistorySession(null); setScreen('profile'); }}
      />
    );
  }

  if (screen === 'history') {
    return (
      <HistoryScreen
        onBack={() => setScreen('picker')}
        onViewSession={handleViewHistorySession}
      />
    );
  }

  if (screen === 'historysession' && historySession) {
    return (
      <ReviewScreen
        events={historySession.events}
        scenario={historySession.scenario}
        preloadedGrade={historySession.preloadedGrade}
        onBack={() => { setHistorySession(null); setScreen('history'); }}
      />
    );
  }

  if (screen === 'review' && sessionData) {
    return (
      <ReviewScreen
        events={sessionData.events}
        scenario={sessionData.scenario}
        aiFeedback={sessionData.aiEnabled}
        onUpgrade={tier.tier === 'free' ? tier.upgradeToPro : undefined}
        onBack={() => { setScreen('picker'); setSessionData(null); setActiveScenario(null); }}
      />
    );
  }

  if (screen === 'workspace' && activeScenario && sessionConfig) {
    return (
      <Workspace
        key={activeScenario.id}
        scenario={activeScenario}
        initialPracticeMode={sessionConfig.practiceMode}
        initialHardMode={sessionConfig.hardMode}
        answerKeyAllowed={sessionConfig.answerKeyAllowed}
        isAiLocked={!sessionConfig.aiEnabled}
        onUpgrade={tier.upgradeToPro}
        daysUntilReset={tier.daysUntilReset}
        onBack={() => { setScreen('picker'); setActiveScenario(null); setSessionConfig(null); }}
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

  return (
    <>
      <MobileNotice />
      {pendingScenario && (
        <SessionConfigModal
          scenario={pendingScenario}
          aiLocked={tier.isLocked}
          isFree={tier.tier === 'free'}
          trialAvailable={tier.trialAvailable}
          sessionsLeft={Math.max(0, tier.sessionLimit - tier.sessionsUsed)}
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
