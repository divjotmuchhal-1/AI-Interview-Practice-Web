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

  let customerId: string | null = sub?.stripe_customer_id ?? null;

  try {
    if (customerId) {
      // A stored customer can be unusable: created in a different Stripe mode
      // (test IDs are invalid against live keys) or deleted in the dashboard.
      // Verify it before use and fall back to creating a fresh one.
      try {
        const existingCustomer = await stripe.customers.retrieve(customerId);
        if ((existingCustomer as Stripe.DeletedCustomer).deleted) customerId = null;
      } catch {
        customerId = null;
      }
    }

    if (customerId) {
      // Legacy monthly subscribers still need somewhere to manage or cancel.
      // Packs are one-time, so repeat purchases are fine and deliberately not
      // blocked: buying again tops up the balance. Stripe is queried directly
      // rather than trusting our status column, which can lag if a webhook was
      // missed.
      const existing = await stripe.subscriptions.list({
        customer: customerId,
        status: 'active',
        limit: 1,
      });
      if (existing.data.length > 0) {
        const portal = await stripe.billingPortal.sessions.create({
          customer:   customerId,
          return_url: `${process.env.NEXT_PUBLIC_APP_URL}/practice`,
        });
        return NextResponse.json({ url: portal.url, alreadySubscribed: true });
      }
    } else {
      const customer = await stripe.customers.create({ email: user.email });
      customerId = customer.id;
      await admin
        .from('user_subscriptions')
        .upsert({ user_id: user.id, stripe_customer_id: customerId });
    }

    // One-time payment, not a subscription. Recurring charges on Indian-issued
    // cards need an RBI e-mandate, and issuers generally will not grant one in a
    // foreign currency, so a subscription is declined for most of our audience.
    // A single charge clears normal 3-D Secure and works.
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'payment',
      line_items: [{ price: process.env.STRIPE_PRICE_ID!, quantity: 1 }],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/practice?upgraded=true`,
      cancel_url:  `${process.env.NEXT_PUBLIC_APP_URL}/practice`,
      // Read back by the webhook to know which account to credit. Session
      // metadata is the only link between the Stripe session and our user.
      metadata: { user_id: user.id },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    // Log Stripe's own type/code alongside the message. A bare message made a
    // price/mode mismatch — the most likely misconfiguration here — look
    // identical to a network failure in the logs.
    const e = err as Stripe.errors.StripeError;
    console.error('checkout failed:', {
      type:    e?.type,
      code:    e?.code,
      param:   e?.param,
      message: e?.message ?? String(err),
      priceId: process.env.STRIPE_PRICE_ID,
      mode:    'payment',
    });

    // A price whose recurring/one-time type does not match the session mode is
    // a deployment mistake, not a user error, so name it distinctly rather than
    // letting it hide behind the generic failure.
    const mismatched =
      e?.type === 'StripeInvalidRequestError' &&
      /recurring|one[- ]time|mode/i.test(e?.message ?? '');

    // Always return JSON: an empty 500 body makes the client fail on res.json().
    return NextResponse.json(
      { error: mismatched ? 'price_mode_mismatch' : 'checkout_failed' },
      { status: 500 },
    );
  }
}
