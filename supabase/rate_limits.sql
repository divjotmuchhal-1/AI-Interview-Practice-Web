-- Durable per-user rate limiting.
-- Run this once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
--
-- Why this exists alongside the in-memory limiter in lib/rateLimit.ts:
-- serverless instances are recycled constantly, and each new instance starts
-- with an empty in-memory map. A user who spreads requests across instances
-- effectively has no limit. This table survives instance recycling, so hourly
-- and daily ceilings actually hold.

create table if not exists api_usage (
  user_id      uuid not null references auth.users(id) on delete cascade,
  route        text not null,
  window_start timestamptz not null,
  count        int not null default 0,
  primary key (user_id, route, window_start)
);

create index if not exists api_usage_window_idx on api_usage (window_start);

alter table api_usage enable row level security;  -- service role only; no client policies

-- Atomically increment the counter for the current window and report whether the
-- request is allowed. The insert-on-conflict-update is a single statement, so
-- concurrent requests cannot both slip past the limit.
create or replace function check_rate_limit(
  p_user_id uuid,
  p_route   text,
  p_limit   int,
  p_window_seconds int
)
returns table (allowed boolean, used int, reset_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_window_start timestamptz;
  v_count        int;
begin
  -- Bucket the current time into fixed windows of p_window_seconds.
  v_window_start := to_timestamp(
    floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds
  );

  insert into api_usage (user_id, route, window_start, count)
  values (p_user_id, p_route, v_window_start, 1)
  on conflict (user_id, route, window_start)
  do update set count = api_usage.count + 1
  returning api_usage.count into v_count;

  return query select
    v_count <= p_limit,
    v_count,
    v_window_start + make_interval(secs => p_window_seconds);
end;
$$;

revoke all on function check_rate_limit(uuid, text, int, int) from public, anon, authenticated;

-- Housekeeping: drop rows older than 2 days. Call periodically, or ignore:
-- the table stays small (a few rows per active user per day).
create or replace function prune_api_usage()
returns void
language sql
security definer
set search_path = public
as $$
  delete from api_usage where window_start < now() - interval '2 days';
$$;
