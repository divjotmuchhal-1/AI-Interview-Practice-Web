-- Free tryout session.
-- Run this once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
--
-- Every user's first AI-coached session is free and does not decrement their
-- monthly quota. Without this, a free user sees "2 of 2 AI sessions left" and
-- rationally saves them for a real interview, never experiencing the product.
--
-- The flag is per account and never resets: it is a one-time tryout, not a
-- monthly allowance.

-- Wrapped in a transaction: the function is dropped and recreated because its
-- return type gains a column, and Postgres refuses that with CREATE OR REPLACE.
-- Without the transaction there would be a brief window where starting a
-- session fails because the function does not exist.
begin;

alter table user_subscriptions
  add column if not exists trial_used boolean not null default false;

drop function if exists consume_session(uuid);

create function consume_session(p_user_id uuid)
returns table (ok boolean, sessions_used int, session_limit int, was_trial boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row   user_subscriptions%rowtype;
  v_limit int;
  v_used  int;
  v_reset timestamptz;
begin
  select * into v_row
  from user_subscriptions
  where user_id = p_user_id
  for update;

  -- First ever session for this account: it is the free tryout.
  if not found then
    insert into user_subscriptions (user_id, status, sessions_used_this_month, sessions_reset_at, trial_used, updated_at)
    values (p_user_id, 'free', 0, now(), true, now());
    return query select true, 0, 5, true;
    return;
  end if;

  if not v_row.trial_used then
    update user_subscriptions
    set trial_used = true,
        updated_at = now()
    where user_id = p_user_id;
    return query select
      true,
      coalesce(v_row.sessions_used_this_month, 0),
      case when v_row.status = 'pro' then 60 else 5 end,
      true;
    return;
  end if;

  v_limit := case when v_row.status = 'pro' then 60 else 5 end;

  -- Monthly rollover: a new calendar month resets the counter.
  if date_trunc('month', v_row.sessions_reset_at) <> date_trunc('month', now()) then
    v_used  := 0;
    v_reset := now();
  else
    v_used  := coalesce(v_row.sessions_used_this_month, 0);
    v_reset := v_row.sessions_reset_at;
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
