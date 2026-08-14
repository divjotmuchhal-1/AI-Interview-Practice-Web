import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Spend one AI call from the user's balance.
 *
 * Sessions cap how many times someone can START; this caps how much API spend
 * a single account can generate. Without it, holding one unspent credit granted
 * unlimited coach conversation for the pack's whole 90-day life, bounded only
 * by rate limits — far more cost than the pack is worth.
 *
 * Fails OPEN on infrastructure error: a database blip should degrade the
 * ceiling, not take the product down. The durable rate limiter still applies.
 */
export async function consumeAiCall(userId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc('consume_ai_call', { p_user_id: userId });
  if (error) {
    console.error('consume_ai_call failed:', error.message);
    return true;
  }
  const row = Array.isArray(data) ? data[0] : data;
  return row?.ok !== false;
}

export function aiBudgetExhaustedResponse(): Response {
  return Response.json(
    {
      error: 'ai_budget_exhausted',
      message: 'You have used all the AI coaching included with your plan.',
    },
    { status: 403 },
  );
}
