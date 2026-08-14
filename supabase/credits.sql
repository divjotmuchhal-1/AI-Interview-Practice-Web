-- One-time session packs (replaces the monthly Pro subscription).
-- Run this once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
--
-- WHY: interview prep is a burst need, not a habit, so a monthly subscription is
-- the wrong shape: users churn by design once they land a job. A one-time pack
-- also sidesteps India's RBI e-mandate rules, which govern recurring card
-- charges and reject most foreign-currency mandates. Nearly every signup so far
-- has been an Indian card, and one-time international charges work where
-- recurring ones do not.
--
-- MODEL: the free monthly allowance is spent FIRST, then purchased credits.
-- Free sessions reset every month and are use-it-or-lose-it, so spending them
-- first makes a purchased pack last as long as possible. Credits carry their own
-- expiry and never reset.

begin;

alter table user_subscriptions
  add column if not exists credits_remaining int not null default 0;

alter table user_subscriptions
  add column if not exists credits_expire_at timestamptz;

-- AI spend is bounded per account, not just per session. Sessions cap how many
-- times you can START, but nothing capped how much you could talk to the coach
-- inside one, so a single $12 pack could run up far more than $12 of API cost.
-- Every chat turn and every answer-key generation spends one call.
alter table user_subscriptions
  add column if not exists ai_calls_remaining int not null default 60;

alter table user_subscriptions
  add column if not exists ai_calls_reset_at timestamptz not null default now();

-- Return type gains a column, so the function must be dropped rather than
-- replaced. Wrapped in a transaction so there is no window where starting a
-- session fails because consume_session does not exist.
drop function if exists consume_session(uuid);

create function consume_session(p_user_id uuid)
returns table (
  ok            boolean,
  sessions_used int,
  session_limit int,
  was_trial     boolean,
  credits_left  int
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row     user_subscriptions%rowtype;
  v_base    int;
  v_limit   int;
  v_used    int;
  v_reset   timestamptz;
  v_credits int;
begin
  select * into v_row
  from user_subscriptions
  where user_id = p_user_id
  for update;

  -- First ever session for this account: the free tryout. Counted, and covered
  -- by the bonus, so the user still has their full monthly allowance.
  if not found then
    insert into user_subscriptions (
      user_id, status, sessions_used_this_month, sessions_reset_at,
      trial_used, trial_used_at, updated_at
    )
    values (p_user_id, 'free', 1, now(), true, now(), now());
    return query select true, 1, 3, true, 0;
    return;
  end if;

  -- status 'pro' is a legacy monthly subscriber. No new ones are created; the
  -- branch stays so existing subscriptions keep working until they lapse.
  v_base := case when v_row.status = 'pro' then 60 else 2 end;

  -- Expired credits are unusable but left in place rather than zeroed, so the
  -- purchase history stays auditable.
  v_credits := case
    when v_row.credits_expire_at is not null and v_row.credits_expire_at < now() then 0
    else coalesce(v_row.credits_remaining, 0)
  end;

  -- Tryout: counted like any other session, but the limit rises with it.
  if not v_row.trial_used then
    update user_subscriptions
    set trial_used               = true,
        trial_used_at            = now(),
        sessions_used_this_month = coalesce(v_row.sessions_used_this_month, 0) + 1,
        updated_at               = now()
    where user_id = p_user_id;
    return query select
      true,
      coalesce(v_row.sessions_used_this_month, 0) + 1,
      v_base + 1,
      true,
      v_credits;
    return;
  end if;

  -- Monthly rollover: a new calendar month resets the free counter. Credits are
  -- deliberately untouched — they are purchased, not granted.
  if date_trunc('month', v_row.sessions_reset_at) <> date_trunc('month', now()) then
    v_used  := 0;
    v_reset := now();
  else
    v_used  := coalesce(v_row.sessions_used_this_month, 0);
    v_reset := v_row.sessions_reset_at;
  end if;

  -- The tryout bonus only applies in the month the tryout was actually spent,
  -- because that is the only month whose counter includes it.
  if v_row.trial_used_at is not null
     and date_trunc('month', v_row.trial_used_at) = date_trunc('month', now())
  then
    v_limit := v_base + 1;
  else
    v_limit := v_base;
  end if;

  -- Free allowance first.
  if v_used < v_limit then
    update user_subscriptions
    set sessions_used_this_month = v_used + 1,
        sessions_reset_at        = v_reset,
        updated_at               = now()
    where user_id = p_user_id;
    return query select true, v_used + 1, v_limit, false, v_credits;
    return;
  end if;

  -- Free allowance exhausted: spend a purchased credit.
  if v_credits > 0 then
    update user_subscriptions
    set credits_remaining        = v_credits - 1,
        sessions_used_this_month = v_used,
        sessions_reset_at        = v_reset,
        updated_at               = now()
    where user_id = p_user_id;
    return query select true, v_used, v_limit, false, v_credits - 1;
    return;
  end if;

  -- Nothing left.
  return query select false, v_used, v_limit, false, 0;
end;
$$;

revoke all on function consume_session(uuid) from public, anon, authenticated;


-- ─────────────────────────────────────────────────────────────────────────────
-- grant_credits: called by the Stripe webhook when a pack is purchased.
-- Additive so a second purchase tops up rather than overwrites, and the expiry
-- extends to the later of the existing one and the new window.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function grant_credits(
  p_user_id uuid,
  p_credits int,
  p_valid_days int
)
returns table (credits_remaining int, credits_expire_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row     user_subscriptions%rowtype;
  v_new_exp timestamptz := now() + (p_valid_days || ' days')::interval;
  v_base    int;
begin
  select * into v_row from user_subscriptions where user_id = p_user_id for update;

  if not found then
    insert into user_subscriptions (
      user_id, status, sessions_used_this_month, sessions_reset_at,
      credits_remaining, credits_expire_at, updated_at
    )
    values (p_user_id, 'free', 0, now(), p_credits, v_new_exp, now());
    update user_subscriptions
    set ai_calls_remaining = ai_calls_remaining + 250
    where user_id = p_user_id;
    return query select p_credits, v_new_exp;
    return;
  end if;

  -- Already-expired credits do not carry into the new pack.
  v_base := case
    when v_row.credits_expire_at is not null and v_row.credits_expire_at < now() then 0
    else coalesce(v_row.credits_remaining, 0)
  end;

  update user_subscriptions
  set credits_remaining  = v_base + p_credits,
      credits_expire_at  = greatest(coalesce(v_row.credits_expire_at, v_new_exp), v_new_exp),
      -- A pack buys AI calls as well as sessions: chat turns, answer keys and
      -- grading all draw from it. 250 across 25 sessions is 10 per session,
      -- around the heaviest real session observed (11 prompts), and keeps the
      -- worst-case cost of a pack below its price even with zero cache hits.
      ai_calls_remaining = coalesce(v_row.ai_calls_remaining, 0) + 250,
      updated_at         = now()
  where user_id = p_user_id;

  return query select
    v_base + p_credits,
    greatest(coalesce(v_row.credits_expire_at, v_new_exp), v_new_exp);
end;
$$;

revoke all on function grant_credits(uuid, int, int) from public, anon, authenticated;


-- ─────────────────────────────────────────────────────────────────────────────
-- consume_ai_call: the hard ceiling on API spend.
--
-- Called by /api/chat and /api/solution. Without it, holding a single unspent
-- credit granted unlimited coach conversation for the life of the pack, bounded
-- only by rate limits — which over a 90-day window is far more spend than the
-- pack is worth. The free monthly allowance resets; purchased calls do not.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function consume_ai_call(p_user_id uuid)
returns table (ok boolean, calls_left int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row   user_subscriptions%rowtype;
  v_calls int;
begin
  select * into v_row from user_subscriptions where user_id = p_user_id for update;

  -- No row yet means no session has ever started. Let the request through; the
  -- row is created by consume_session a moment later.
  if not found then
    return query select true, 60;
    return;
  end if;

  -- Monthly reset of the free allotment. Purchased calls sit in the same
  -- counter, so the reset only ever raises a depleted balance up to the free
  -- floor and never claws purchased calls back.
  if date_trunc('month', v_row.ai_calls_reset_at) <> date_trunc('month', now()) then
    v_calls := greatest(coalesce(v_row.ai_calls_remaining, 0), 60);
    update user_subscriptions
    set ai_calls_remaining = v_calls, ai_calls_reset_at = now()
    where user_id = p_user_id;
  else
    v_calls := coalesce(v_row.ai_calls_remaining, 0);
  end if;

  if v_calls <= 0 then
    return query select false, 0;
    return;
  end if;

  update user_subscriptions
  set ai_calls_remaining = v_calls - 1, updated_at = now()
  where user_id = p_user_id;

  return query select true, v_calls - 1;
end;
$$;

revoke all on function consume_ai_call(uuid) from public, anon, authenticated;


-- ─────────────────────────────────────────────────────────────────────────────
-- Webhook idempotency.
--
-- Stripe retries a webhook for up to three days until it gets a 2xx, and can
-- deliver the same event more than once even on success. Granting credits is
-- not naturally idempotent, so a retry would hand out a second pack. The
-- handler claims an event id here first and only grants if the claim was new.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists stripe_events_processed (
  event_id     text primary key,
  processed_at timestamptz not null default now()
);

alter table stripe_events_processed enable row level security;

-- Returns true only for the caller that first claims this event id.
create or replace function claim_stripe_event(p_event_id text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into stripe_events_processed (event_id) values (p_event_id)
  on conflict (event_id) do nothing;
  return found;
end;
$$;

revoke all on function claim_stripe_event(text) from public, anon, authenticated;

commit;
