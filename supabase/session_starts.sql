-- Session starts: one row the moment a user opens a scenario in the workspace,
-- whether or not they ever finish it.
-- Run this once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
--
-- WHY: public.sessions is written only when the user clicks "End Session" and
-- the grader returns, so anyone who starts a scenario and closes the tab leaves
-- no trace at all. user_subscriptions.sessions_used_this_month counts starts but
-- says nothing about which scenario or when, and it does not count practice-mode
-- starts because those never consume quota. This table records every start.
--
-- Completions are linked back automatically by a trigger on public.sessions, so
-- the app does not have to thread a start id through the UI. A start with no
-- linked session is an abandoned attempt, which is the number you want.

begin;

create table if not exists public.session_starts (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references auth.users(id) on delete cascade,
  scenario_id          text not null,
  scenario_title       text,
  scenario_difficulty  text,
  started_at           timestamptz not null default now(),

  -- The options chosen in the config modal, so an abandoned attempt can be read
  -- in context: people may be bailing out of hard mode specifically.
  ai_enabled           boolean,
  practice_mode        boolean,
  hard_mode            boolean,
  answer_key_allowed   boolean,

  -- Set by the trigger below when a graded session arrives. Null means the user
  -- started this attempt and never finished it.
  completed_session_id uuid references public.sessions(id) on delete set null,

  -- True for rows derived from pre-existing completed sessions rather than
  -- observed live. Their started_at is inferred, not measured.
  backfilled           boolean not null default false
);

create index if not exists session_starts_user_started_idx
  on public.session_starts (user_id, started_at desc);

-- Supports the trigger's lookup of the most recent unfinished attempt.
create index if not exists session_starts_open_idx
  on public.session_starts (user_id, scenario_id, started_at desc)
  where completed_session_id is null;

alter table public.session_starts enable row level security;

drop policy if exists "users manage own session starts" on public.session_starts;
create policy "users manage own session starts"
  on public.session_starts
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);


-- ─────────────────────────────────────────────────────────────────────────────
-- Link a graded session back to the attempt that produced it.
--
-- Matches the most recent still-open attempt by the same user on the same
-- scenario. security definer so it runs regardless of the caller's RLS, and
-- search_path is pinned so the function cannot be hijacked by a rogue schema.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.link_session_start()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update session_starts
  set completed_session_id = new.id
  where id = (
    select id
    from session_starts
    where user_id = new.user_id
      and scenario_id = new.scenario_id
      and completed_session_id is null
      and started_at <= new.completed_at
    order by started_at desc
    limit 1
  );
  return new;
end;
$$;

drop trigger if exists sessions_link_start on public.sessions;
create trigger sessions_link_start
  after insert on public.sessions
  for each row
  execute function public.link_session_start();


-- ─────────────────────────────────────────────────────────────────────────────
-- Backfill: every existing graded session was definitely started, so create the
-- matching attempt row and link it. started_at is derived as completed_at minus
-- the recorded duration, which is an estimate, hence the backfilled flag.
--
-- Attempts that were abandoned BEFORE this table existed cannot be recovered:
-- nothing recorded which scenario they were. Those are simply missing, and are
-- not invented here.
-- ─────────────────────────────────────────────────────────────────────────────

insert into public.session_starts (
  user_id, scenario_id, scenario_title, scenario_difficulty,
  started_at, completed_session_id, backfilled
)
select
  s.user_id, s.scenario_id, s.scenario_title, s.scenario_difficulty,
  s.completed_at - (coalesce(s.duration_ms, 0) || ' milliseconds')::interval,
  s.id,
  true
from public.sessions s
where not exists (
  select 1 from public.session_starts st where st.completed_session_id = s.id
);


-- ─────────────────────────────────────────────────────────────────────────────
-- session_activity: every attempt, finished or not, newest first.
-- This is the table to look at for drop-off.
-- ─────────────────────────────────────────────────────────────────────────────

drop view if exists session_activity;

create view session_activity as
select
  u.email,
  st.started_at,
  st.scenario_title,
  st.scenario_difficulty                            as difficulty,
  case when st.completed_session_id is null
       then 'abandoned' else 'finished' end         as outcome,
  round(s.duration_ms / 60000.0, 1)                 as minutes,
  case when s.id is null then null else round((
      coalesce(s.score_diagnosis,0)    + coalesce(s.score_independence,0)
    + coalesce(s.score_precision,0)    + coalesce(s.score_verification,0)
    + coalesce(s.score_recovery,0)     + coalesce(s.score_test_ownership,0)
  ) / 6.0) end                                      as overall,
  st.ai_enabled,
  st.practice_mode,
  st.hard_mode,
  st.backfilled,
  s.headline,
  st.scenario_id,
  st.id                                             as start_id,
  st.completed_session_id,
  st.user_id
from public.session_starts st
join auth.users u on u.id = st.user_id
left join public.sessions s on s.id = st.completed_session_id
order by st.started_at desc;

revoke all on session_activity from anon, authenticated, public;
grant select on session_activity to service_role;

commit;


-- ─────────────────────────────────────────────────────────────────────────────
-- Example queries. Run these separately.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Everything anyone has started, finished or not. Start here.
--
-- select email, started_at, scenario_title, difficulty, outcome,
--        minutes, overall, practice_mode, hard_mode
-- from session_activity
-- limit 50;


-- 2. Only the abandoned attempts: who bailed, and on what.
--
-- select email, started_at, scenario_title, difficulty,
--        ai_enabled, practice_mode, hard_mode
-- from session_activity
-- where outcome = 'abandoned' and not backfilled
-- order by started_at desc;


-- 3. Completion rate per scenario. Which scenarios lose people.
--
-- select scenario_title, difficulty,
--        count(*)                                          as starts,
--        count(*) filter (where outcome = 'finished')       as finished,
--        round(100.0 * count(*) filter (where outcome = 'finished')
--              / nullif(count(*), 0))                       as pct_finished
-- from session_activity
-- group by scenario_title, difficulty
-- order by starts desc;


-- 4. Completion rate per user.
--
-- select email,
--        count(*)                                          as starts,
--        count(*) filter (where outcome = 'finished')       as finished,
--        max(started_at)                                    as last_attempt
-- from session_activity
-- group by email
-- order by starts desc;
