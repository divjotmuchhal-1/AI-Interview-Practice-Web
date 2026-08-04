import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createAdminClient } from '@/lib/supabase/admin';

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

    await supabase.from('user_subscriptions').upsert({
      user_id:                userId,
      stripe_customer_id:     session.customer as string,
      stripe_subscription_id: session.subscription as string,
      status:                 'pro',
      sessions_used_this_month: 0,
      sessions_reset_at:      new Date().toISOString(),
      updated_at:             new Date().toISOString(),
    });
  }

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
