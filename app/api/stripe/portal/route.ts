import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  const admin = createAdminClient();
  const { data: sub } = await admin
    .from('user_subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .single();

  if (!sub?.stripe_customer_id) {
    return NextResponse.json({ error: 'no_subscription' }, { status: 400 });
  }

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer:   sub.stripe_customer_id,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/practice`,
    });
    return NextResponse.json({ url: session.url });
  } catch (err) {
    // Most likely a customer from another Stripe mode, or the live-mode portal
    // configuration not being saved yet.
    console.error('portal session failed:', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'portal_unavailable' }, { status: 500 });
  }
}
