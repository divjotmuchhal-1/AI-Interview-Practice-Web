-- Per-session history and AI feedback.
-- Run this once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
-- Then use the example queries at the bottom of this file.
--
-- IMPORTANT: a row lands in public.sessions only when the user clicks "End
-- Session" and the grader returns. Someone who starts a scenario and closes the
-- tab leaves NO row here. So this view answers "what did people finish", not
-- "what did people try". For the second question use the started_not_finished
-- query at the bottom, which reads user_subscriptions instead.
--
-- SECURITY: exposes emails and full session transcripts, so access is revoked
-- from anon and authenticated. Only the service role and the SQL editor (which
-- runs as postgres) can read it. Never grant it to anon.
--
-- Note on RLS: public.sessions has a policy restricting rows to auth.uid().
-- That policy does not apply here, because the SQL editor runs as the table
-- owner and owners bypass RLS. If you query sessions from the app with an
-- anon/authenticated client you will only ever see your own rows, which is the
-- most common reason a "why is this empty" query looks broken.

begin;

drop view if exists session_history;

create view session_history as
select
  u.email,
  s.completed_at,
  s.scenario_title,
  s.scenario_difficulty                             as difficulty,
  round(s.duration_ms / 60000.0, 1)                 as minutes,
  -- The overall score the user is shown: the six rubric scores averaged.
  round((
      coalesce(s.score_diagnosis,0)    + coalesce(s.score_independence,0)
    + coalesce(s.score_precision,0)    + coalesce(s.score_verification,0)
    + coalesce(s.score_recovery,0)     + coalesce(s.score_test_ownership,0)
  ) / 6.0)                                          as overall,
  s.score_diagnosis                                 as diagnosis,
  s.score_independence                              as independence,
  s.score_precision                                 as precision,
  s.score_verification                              as verification,
  s.score_recovery                                  as recovery,
  s.score_test_ownership                            as test_ownership,
  s.prompt_count                                    as prompts,
  s.test_run_count                                  as test_runs,
  s.code_edit_count                                 as edits,
  -- A session with no prompts, no tests and no edits is someone who opened the
  -- scenario and immediately ended it. Those grade as zeros and would otherwise
  -- drag every average down, so flag them rather than silently averaging them.
  (coalesce(s.prompt_count,0) = 0
   and coalesce(s.test_run_count,0) = 0
   and coalesce(s.code_edit_count,0) = 0)           as no_activity,
  s.headline,
  s.strengths,
  s.watchouts,
  s.evidence,
  s.events,
  s.scenario_id,
  s.user_id,
  s.id                                              as session_id
from public.sessions s
join auth.users u on u.id = s.user_id
order by s.completed_at desc;

revoke all on session_history from anon, authenticated, public;
grant select on session_history to service_role;

commit;


-- ─────────────────────────────────────────────────────────────────────────────
-- Example queries. Run these separately, not as part of the block above.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Everything anyone has finished, newest first. Start here.
--
-- select email, completed_at, scenario_title, minutes, overall,
--        prompts, test_runs, edits, no_activity, headline
-- from session_history
-- limit 50;


-- 2. One user's sessions. Replace the email.
--
-- select completed_at, scenario_title, minutes, overall,
--        diagnosis, independence, precision, verification, recovery, test_ownership,
--        prompts, test_runs, edits, headline
-- from session_history
-- where email = 'gyanendher@gmail.com'
-- order by completed_at desc;


-- 3. Full AI feedback for one session, laid out vertically so the long prose is
--    readable. Grab a session_id from query 1 or 2 first.
--
-- select email, scenario_title, completed_at, minutes, overall,
--        headline, strengths, watchouts
-- from session_history
-- where session_id = 'paste-a-session-id-here';
--
--    Tip: in the Supabase SQL editor the wide prose columns get truncated. To
--    read them in full, select one at a time:
--
-- select watchouts from session_history where session_id = '...';


-- 4. The per-rubric evidence the grader cited, one row per rubric dimension.
--    evidence is jsonb keyed by rubric name.
--
-- select key as rubric, value as evidence
-- from session_history, jsonb_each_text(evidence)
-- where session_id = 'paste-a-session-id-here';


-- 5. The raw event timeline for one session: what the user actually did, in
--    order. This is the ground truth behind the grade.
--
-- select
--   to_char((e->>'t')::bigint / 1000 * interval '1 second', 'MI:SS') as at,
--   e->>'type'                                                       as event,
--   left(coalesce(e->'data'->>'text', (e->'data')::text), 120)       as detail
-- from session_history, jsonb_array_elements(events) e
-- where session_id = 'paste-a-session-id-here'
-- order by (e->>'t')::bigint;


-- 6. THE GAP: users who started a session but never finished one.
--    public.sessions cannot show these, because no row is ever written. A
--    user_subscriptions row means consume_session ran, which means a session
--    actually began. This is the drop-off query.
--
-- select
--   u.email,
--   u.created_at::date                        as signed_up,
--   sub.sessions_used_this_month              as sessions_started,
--   count(s.id)                               as sessions_finished,
--   sub.sessions_used_this_month - count(s.id) as abandoned
-- from auth.users u
-- join user_subscriptions sub on sub.user_id = u.id
-- left join public.sessions s on s.user_id = u.id
-- group by u.email, u.created_at, sub.sessions_used_this_month
-- having sub.sessions_used_this_month > count(s.id)
-- order by abandoned desc;


-- 7. Which scenarios people actually pick, and how they go.
--
-- select scenario_title, difficulty,
--        count(*)                                    as attempts,
--        count(*) filter (where no_activity)         as bailed_immediately,
--        round(avg(overall) filter (where not no_activity)) as avg_score,
--        round(avg(minutes) filter (where not no_activity), 1) as avg_minutes
-- from session_history
-- group by scenario_title, difficulty
-- order by attempts desc;
