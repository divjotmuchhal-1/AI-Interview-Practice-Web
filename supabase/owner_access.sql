-- Unlimited access for the owner account.
--
-- Run in the Supabase SQL Editor. Safe to re-run, and safe to run before the
-- account has ever started a session.
--
-- Granted through credits rather than status = 'pro'. Two reasons. Credits are
-- the mechanism a paying customer actually uses, so the owner account exercises
-- the same path real users do instead of a legacy one no longer sold. And
-- status = 'pro' would show a "Manage Subscription" button wired to a Stripe
-- subscription that does not exist, which errors when clicked.
--
-- The track gate reads credits as well as tier, so this unlocks all 7 tracks
-- alongside the sessions.

insert into user_subscriptions (
  user_id, status, sessions_used_this_month, sessions_reset_at,
  credits_remaining, credits_expire_at, ai_calls_remaining, ai_calls_reset_at,
  updated_at
)
select
  u.id, 'free', 0, now(),
  1000000, timestamptz '2099-12-31', 1000000, now(),
  now()
from auth.users u
where u.email = 'divjotmuchhal@gmail.com'
on conflict (user_id) do update set
  credits_remaining  = 1000000,
  credits_expire_at  = timestamptz '2099-12-31',
  -- consume_ai_call resets monthly with greatest(remaining, 60), so a large
  -- balance is never clawed back by the reset.
  ai_calls_remaining = 1000000,
  ai_calls_reset_at  = now(),
  updated_at         = now();

-- Confirm it landed.
select u.email, s.status, s.credits_remaining, s.credits_expire_at::date,
       s.ai_calls_remaining
from user_subscriptions s
join auth.users u on u.id = s.user_id
where u.email = 'divjotmuchhal@gmail.com';
