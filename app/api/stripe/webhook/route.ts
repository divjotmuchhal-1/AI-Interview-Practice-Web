import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createAdminClient } from '@/lib/supabase/admin';
import { PACK_SESSIONS, PACK_VALID_DAYS } from '@/lib/sessionLimits';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig  = req.headers.get('stripe-signature')!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return new Response('Webhook signature verification failed', { status: 400 });
  }

  const supabase = createAdminClient();

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId  = session.metadata?.user_id;
    if (!userId) return NextResponse.json({ ok: true });

    if (session.mode === 'payment') {
      // Granting credits is additive, so processing the same event twice would
      // hand out a second pack. Stripe retries until it gets a 2xx and can
      // redeliver even after success, so claim the event id first and only
      // grant if this delivery was the one that claimed it.
      const { data: claimed, error: claimError } = await supabase
        .rpc('claim_stripe_event', { p_event_id: event.id });

      if (claimError) {
        // Fail loudly: returning 500 makes Stripe retry rather than silently
        // dropping a purchase the customer already paid for.
        console.error('claim_stripe_event failed:', claimError.message);
        return NextResponse.json({ error: 'claim_failed' }, { status: 500 });
      }
      if (claimed === false) return NextResponse.json({ ok: true, duplicate: true });

      const { error } = await supabase.rpc('grant_credits', {
        p_user_id:    userId,
        p_credits:    PACK_SESSIONS,
        p_valid_days: PACK_VALID_DAYS,
      });
      if (error) {
        console.error('grant_credits failed:', error.message);
        return NextResponse.json({ error: 'grant_failed' }, { status: 500 });
      }

      await supabase
        .from('user_subscriptions')
        .update({
          stripe_customer_id: session.customer as string,
          updated_at:         new Date().toISOString(),
        })
        .eq('user_id', userId);

      return NextResponse.json({ ok: true });
    }

    // Legacy monthly subscription. No new ones are sold, but an in-flight
    // checkout could still land here.
    await supabase.from('user_subscriptions').upsert({
      user_id:                  userId,
      stripe_customer_id:       session.customer as string,
      stripe_subscription_id:   session.subscription as string,
      status:                   'pro',
      sessions_used_this_month: 0,
      sessions_reset_at:        new Date().toISOString(),
      updated_at:               new Date().toISOString(),
    });
  }

  // Legacy subscription lifecycle. Packs never produce these events, so this
  // only ever touches accounts that subscribed before the switch.
  if (event.type === 'customer.subscription.deleted' ||
      event.type === 'customer.subscription.updated') {
    const subscription = event.data.object as Stripe.Subscription;
    const isActive = subscription.status === 'active';

    await supabase
      .from('user_subscriptions')
      .update({
        status:     isActive ? 'pro' : 'free',
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_subscription_id', subscription.id);
  }

  return NextResponse.json({ ok: true });
}
