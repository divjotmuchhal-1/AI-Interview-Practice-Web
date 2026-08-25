-- Capture what happens INSIDE a session, not just that one began.
-- Run this once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
--
-- WHY: 23 of 42 sessions have been abandoned and session_starts records only
-- that they started. There is no way to tell whether someone quit after 20
-- seconds or 20 minutes, whether they ever ran a test, or which part they were
-- on. Every one of those is a different problem with a different fix.
--
-- HOW: the workspace posts a heartbeat every 30 seconds carrying the events so
-- far. Worst case we lose the last 30 seconds of an abandoned session, which is
-- the price of not writing on every keystroke. beforeunload is deliberately not
-- relied on: it does not fire on tab kill, crash, or mobile backgrounding, which
-- is exactly when people abandon.

begin;

alter table session_starts
  add column if not exists last_seen_at    timestamptz;

alter table session_starts
  add column if not exists events          jsonb not null default '[]'::jsonb;

alter table session_starts
  add column if not exists event_count     int   not null default 0;

alter table session_starts
  add column if not exists last_part_index int;

-- Backfill so existing rows are not indistinguishable from ones that recorded
-- nothing. A completed attempt was alive at least until its session was saved.
update session_starts st
set last_seen_at = s.completed_at
from sessions s
where st.completed_session_id = s.id
  and st.last_seen_at is null;


-- ─────────────────────────────────────────────────────────────────────────────
-- record_session_progress: called by the workspace heartbeat.
--
-- Ownership is checked inside the function rather than trusted from the caller,
-- so a user cannot write progress onto someone else's attempt by guessing an id.
-- Completed attempts are ignored: their timeline already lives in sessions.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function record_session_progress(
  p_attempt_id uuid,
  p_user_id    uuid,
  p_events     jsonb,
  p_part_index int
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_done  uuid;
begin
  select user_id, completed_session_id into v_owner, v_done
  from session_starts
  where id = p_attempt_id
  for update;

  if not found or v_owner is distinct from p_user_id then
    return false;
  end if;

  if v_done is not null then
    return true;   -- already finished; nothing to record
  end if;

  update session_starts
  set last_seen_at    = now(),
      events          = coalesce(p_events, '[]'::jsonb),
      event_count     = coalesce(jsonb_array_length(p_events), 0),
      last_part_index = p_part_index
  where id = p_attempt_id;

  return true;
end;
$$;

revoke all on function record_session_progress(uuid, uuid, jsonb, int)
  from public, anon, authenticated;


-- ─────────────────────────────────────────────────────────────────────────────
-- session_activity: every attempt, finished or not, with how long it lasted.
-- Replaces the version in session_starts.sql, which had no duration for
-- abandoned attempts because nothing recorded when the user stopped.
-- ─────────────────────────────────────────────────────────────────────────────

drop view if exists session_activity;

create view session_activity as
select
  u.email,
  st.started_at,
  st.scenario_title,
  st.scenario_difficulty                              as difficulty,
  case
    when st.completed_session_id is not null then 'finished'
    -- Still inside a plausible working window and recently seen: treat as live
    -- rather than abandoned, so an in-progress session is not miscounted.
    when st.last_seen_at > now() - interval '3 minutes' then 'in_progress'
    else 'abandoned'
  end                                                 as outcome,
  -- How long they actually stayed. Null when the attempt predates heartbeats.
  round(extract(epoch from (st.last_seen_at - st.started_at)) / 60.0, 1)
                                                      as minutes_active,
  round(s.duration_ms / 60000.0, 1)                   as minutes_graded,
  st.event_count,
  st.last_part_index,
  -- The last thing they did before stopping. This is the answer to "why".
  (st.events -> (jsonb_array_length(st.events) - 1) ->> 'type')
                                                      as last_action,
  (select count(*) from jsonb_array_elements(st.events) e
     where e ->> 'type' = 'tests_run')                as tests_run,
  (select count(*) from jsonb_array_elements(st.events) e
     where e ->> 'type' = 'prompt_sent')              as prompts_sent,
  case when s.id is null then null else round((
      coalesce(s.score_diagnosis,0)    + coalesce(s.score_independence,0)
    + coalesce(s.score_precision,0)    + coalesce(s.score_verification,0)
    + coalesce(s.score_recovery,0)     + coalesce(s.score_test_ownership,0)
  ) / 6.0) end                                        as overall,
  st.ai_enabled,
  st.practice_mode,
  st.hard_mode,
  st.backfilled,
  st.scenario_id,
  st.id                                               as start_id,
  st.user_id
from session_starts st
join auth.users u on u.id = st.user_id
left join sessions s on s.id = st.completed_session_id
order by st.started_at desc;

revoke all on session_activity from anon, authenticated, public;
grant select on session_activity to service_role;

commit;


-- ─────────────────────────────────────────────────────────────────────────────
-- Queries this makes possible. Run separately.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. THE QUESTION: how long do people last before abandoning, and what were
--    they doing when they stopped?
--
-- select email, scenario_title, minutes_active, event_count, tests_run,
--        prompts_sent, last_action
-- from session_activity
-- where outcome = 'abandoned' and not backfilled
-- order by started_at desc;


-- 2. Bounce vs. genuine attempt. A quit under a minute with no events is a
--    loading problem; twelve minutes with eight test runs is a hard scenario.
--
-- select
--   case when minutes_active < 1  then 'a. under 1 min (likely broke or bounced)'
--        when minutes_active < 5  then 'b. 1-5 min (gave up early)'
--        when minutes_active < 15 then 'c. 5-15 min (real attempt)'
--        else                          'd. 15+ min (stuck, not bored)' end as bucket,
--   count(*), round(avg(event_count)) as avg_events, round(avg(tests_run)) as avg_tests
-- from session_activity
-- where outcome = 'abandoned' and minutes_active is not null
-- group by 1 order by 1;


-- 3. Which scenarios lose people, and at what point.
--
-- select scenario_title, difficulty,
--        count(*)                                        as starts,
--        count(*) filter (where outcome = 'finished')     as finished,
--        round(avg(minutes_active) filter (where outcome = 'abandoned'), 1)
--                                                        as avg_min_before_quit,
--        round(100.0 * count(*) filter (where outcome = 'finished')
--              / nullif(count(*), 0))                     as pct_finished
-- from session_activity
-- group by scenario_title, difficulty
-- order by starts desc;


-- 4. Did they ever run a test before quitting? Someone who never ran one did
--    not engage with the exercise at all.
--
-- select
--   case when tests_run = 0 then 'never ran tests' else 'ran tests' end as engaged,
--   count(*), round(avg(minutes_active), 1) as avg_minutes
-- from session_activity
-- where outcome = 'abandoned' and not backfilled
-- group by 1;


-- 5. Replay one abandoned session's timeline, the same way you can for a
--    completed one.
--
-- select to_char((e->>'t')::bigint / 1000 * interval '1 second', 'MI:SS') as at,
--        e->>'type' as event,
--        left(coalesce(e->'data'->>'text', (e->'data')::text), 100) as detail
-- from session_activity, jsonb_array_elements(events) e
-- where start_id = 'paste-a-start-id-here'
-- order by (e->>'t')::bigint;
