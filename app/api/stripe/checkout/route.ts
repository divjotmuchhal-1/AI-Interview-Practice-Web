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

  let customerId = sub?.stripe_customer_id;

  if (!customerId) {
    const customer = await stripe.customers.create({ email: user.email });
    customerId = customer.id;
    await admin.from('user_subscriptions').upsert({
      user_id:            user.id,
      stripe_customer_id: customerId,
    });
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: process.env.STRIPE_PRICE_ID!, quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/practice?upgraded=true`,
    cancel_url:  `${process.env.NEXT_PUBLIC_APP_URL}/practice`,
    metadata: { user_id: user.id },
  });

  return NextResponse.json({ url: session.url });
}
