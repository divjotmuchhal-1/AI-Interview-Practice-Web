import { track as vercelTrack } from '@vercel/analytics';

/**
 * Funnel events.
 *
 * Page views alone cannot answer the question that matters: where do people
 * stop? These mark the steps between landing and becoming an engaged user.
 *
 * Never pass anything identifying (email, user id, code, prompts). Vercel
 * Analytics is not the place for personal data, and the privacy policy does not
 * cover it.
 */
export type FunnelEvent =
  | 'signup_started'      // clicked a sign-up method on /login
  | 'signup_completed'    // account created
  | 'scenario_opened'     // opened the session config modal
  | 'session_started'     // actually entered the workspace
  | 'session_completed'   // ended a session and reached the review screen
  | 'upgrade_clicked';    // clicked Upgrade to Pro

export function track(event: FunnelEvent, props?: Record<string, string | number | boolean>) {
  try {
    vercelTrack(event, props);
  } catch {
    // Analytics must never break a user flow.
  }
}
