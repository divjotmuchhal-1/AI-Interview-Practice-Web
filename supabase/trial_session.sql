-- Free tryout session.
-- Run this once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
--
-- Every user's first AI-coached session is free. It increments the same counter
-- as any other session, so it is visible in ai_sessions_used, and it also adds
-- one to that month's limit so it never eats into the monthly quota. A free
-- user's first session reads "1 of 3 used" with their full 2 still to spend.
--
-- trial_used is per account and never resets: the tryout is a one-time grant,
-- not a monthly allowance. trial_used_at records WHEN it was spent, which is
-- what scopes the bonus to a single month. Without it, trial_used staying true
-- forever would quietly hand every free user 3 sessions every month.

-- Wrapped in a transaction: the function is dropped and recreated because its
-- return type gains a column, and Postgres refuses that with CREATE OR REPLACE.
-- Without the transaction there would be a brief window where starting a
-- session fails because the function does not exist.
begin;

alter table user_subscriptions
  add column if not exists trial_used boolean not null default false;

alter table user_subscriptions
  add column if not exists trial_used_at timestamptz;

-- Backfill: the tryout previously did not increment the counter, so the users
-- who spent one show 0 sessions despite having started a session. Credit that
-- session now, and date the tryout from the row's last write so the bonus is
-- scoped to the right month.
update user_subscriptions
set sessions_used_this_month = coalesce(sessions_used_this_month, 0) + 1,
    trial_used_at            = coalesce(updated_at, now())
where trial_used
  and trial_used_at is null;

drop function if exists consume_session(uuid);

create function consume_session(p_user_id uuid)
returns table (ok boolean, sessions_used int, session_limit int, was_trial boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row   user_subscriptions%rowtype;
  v_base  int;
  v_limit int;
  v_used  int;
  v_reset timestamptz;
begin
  select * into v_row
  from user_subscriptions
  where user_id = p_user_id
  for update;

  -- First ever session for this account: it is the free tryout. Counted, and
  -- covered by the bonus, so the user still has their full monthly allowance.
  if not found then
    insert into user_subscriptions (
      user_id, status, sessions_used_this_month, sessions_reset_at,
      trial_used, trial_used_at, updated_at
    )
    values (p_user_id, 'free', 1, now(), true, now(), now());
    return query select true, 1, 3, true;
    return;
  end if;

  v_base := case when v_row.status = 'pro' then 60 else 2 end;

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
      true;
    return;
  end if;

  -- Monthly rollover: a new calendar month resets the counter.
  if date_trunc('month', v_row.sessions_reset_at) <> date_trunc('month', now()) then
    v_used  := 0;
    v_reset := now();
  else
    v_used  := coalesce(v_row.sessions_used_this_month, 0);
    v_reset := v_row.sessions_reset_at;
  end if;

  -- The bonus only applies in the month the tryout was actually spent, because
  -- that is the only month whose counter includes it.
  if v_row.trial_used_at is not null
     and date_trunc('month', v_row.trial_used_at) = date_trunc('month', now())
  then
    v_limit := v_base + 1;
  else
    v_limit := v_base;
  end if;

  if v_used >= v_limit then
    return query select false, v_used, v_limit, false;
    return;
  end if;

  update user_subscriptions
  set sessions_used_this_month = v_used + 1,
      sessions_reset_at        = v_reset,
      updated_at               = now()
  where user_id = p_user_id;

  return query select true, v_used + 1, v_limit, false;
end;
$$;

revoke all on function consume_session(uuid) from public, anon, authenticated;

commit;
