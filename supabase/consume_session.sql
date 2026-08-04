-- Atomic session consumption.
-- Run this once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
--
-- Why a database function instead of read-then-write in the API route:
-- two concurrent requests (double-click, two tabs, retry) can both read
-- sessions_used = 1 and both write 2, granting a free extra session. Doing the
-- check and the increment in one statement under a row lock makes that
-- impossible: the second caller waits for the first to commit, then re-reads.

create or replace function consume_session(p_user_id uuid)
returns table (ok boolean, sessions_used int, session_limit int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row     user_subscriptions%rowtype;
  v_limit   int;
  v_used    int;
  v_reset   timestamptz;
begin
  -- Lock this user's row for the duration of the transaction.
  select * into v_row
  from user_subscriptions
  where user_id = p_user_id
  for update;

  if not found then
    -- First ever session for this user.
    insert into user_subscriptions (user_id, status, sessions_used_this_month, sessions_reset_at, updated_at)
    values (p_user_id, 'free', 1, now(), now());
    return query select true, 1, 2;
    return;
  end if;

  v_limit := case when v_row.status = 'pro' then 60 else 2 end;

  -- Monthly rollover: a new calendar month resets the counter.
  if date_trunc('month', v_row.sessions_reset_at) <> date_trunc('month', now()) then
    v_used  := 0;
    v_reset := now();
  else
    v_used  := coalesce(v_row.sessions_used_this_month, 0);
    v_reset := v_row.sessions_reset_at;
  end if;

  if v_used >= v_limit then
    return query select false, v_used, v_limit;
    return;
  end if;

  update user_subscriptions
  set sessions_used_this_month = v_used + 1,
      sessions_reset_at        = v_reset,
      updated_at               = now()
  where user_id = p_user_id;

  return query select true, v_used + 1, v_limit;
end;
$$;

-- Callable only by the service role (the API route), never directly by clients.
revoke all on function consume_session(uuid) from public, anon, authenticated;
