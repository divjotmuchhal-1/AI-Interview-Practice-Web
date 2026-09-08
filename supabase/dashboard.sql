-- The Supabase dashboard, as six views.
--
-- Run this once: SQL Editor -> New query -> paste -> Run. Safe to re-run.
--
-- WHY VIEWS AND NOT THE TABLE EDITOR
-- Browsing user_subscriptions directly is what makes the data look broken. It
-- is 62 rows in no useful order, where the columns that matter are mostly zero
-- and the one paying customer is somewhere in the middle. These views answer
-- questions instead of listing rows.
--
-- NAMING
-- Numbered, because the Supabase sidebar sorts alphabetically and the order you
-- want is by importance, not by spelling. Read v1 first and v6 last. The v
-- prefix keeps all six together and away from the real tables.
--
--   v1_funnel      one row. the whole business.
--   v2_customers   who paid and what they have left.
--   v3_users       everyone, most recently active first.
--   v4_sessions    every attempt, finished or abandoned.
--   v5_scenarios   which scenarios lose people.
--   v6_feedback    everything anyone told you in words.
--
-- These replace user_overview, session_activity, sessions_by_email and
-- session_history, which are left in place: nothing in the application reads
-- any of them, so dropping them is optional cleanup, not a migration.

begin;

-- Dropped before creating, not replaced. CREATE OR REPLACE VIEW can only append
-- columns: it refuses to drop or reorder one, so any edit to a column list here
-- would fail on a re-run. Reverse dependency order, since v5 reads v4 and the
-- rest read v0.
drop view if exists v6_feedback;
drop view if exists v5_scenarios;
drop view if exists v4_sessions;
drop view if exists v3_users;
drop view if exists v2_customers;
drop view if exists v1_funnel;
drop view if exists v0_staff;

-- Your own accounts, excluded everywhere. 22 of the 94 session starts are
-- yours, which is enough to make every rate on this dashboard wrong.
create view v0_staff as
select id from auth.users
where email in ('divjotmuchhal@gmail.com', 'dmuchhal@terpmail.umd.edu');


-- ---------------------------------------------------------------------------
-- v1_funnel: one row, the whole business.
-- ---------------------------------------------------------------------------
create view v1_funnel as
with u as (
  select id from auth.users where id not in (select id from v0_staff)
),
starts as (
  select * from session_starts where user_id in (select id from u)
),
graded as (
  select * from sessions where user_id in (select id from u)
),
subs as (
  select * from user_subscriptions where user_id in (select id from u)
)
select
  (select count(*) from u)                                   as signed_up,
  (select count(distinct user_id) from starts)               as ever_started,
  (select count(distinct user_id) from graded)               as ever_finished,
  (select count(*) from starts)                              as sessions_started,
  (select count(*) from graded)                              as sessions_finished,
  (select count(*) from starts) - (select count(*) from graded)
                                                             as sessions_abandoned,
  -- The share of attempts that end without a score. This is the biggest hole
  -- in the funnel and the number to watch after any change to onboarding.
  round(100.0 * ((select count(*) from starts) - (select count(*) from graded))
        / nullif((select count(*) from starts), 0))          as pct_abandoned,
  -- Reached the paywall: free allowance spent, nothing purchased at the time.
  (select count(*) from subs
     where coalesce(sessions_used_this_month, 0) >= 2)       as hit_paywall,
  (select count(*) from subs where stripe_customer_id is not null)
                                                             as clicked_upgrade,
  (select count(*) from subs where coalesce(credits_remaining, 0) > 0
                                or credits_expire_at is not null)
                                                             as paid,
  -- Users with more than one session on more than one day. The only retention
  -- signal that means anything at this volume.
  (select count(*) from (
     select user_id from starts
     group by user_id having count(distinct started_at::date) > 1) r)
                                                             as returned_another_day;


-- ---------------------------------------------------------------------------
-- v2_customers: who paid. Check this one first every morning.
-- ---------------------------------------------------------------------------
create view v2_customers as
select
  u.email,
  case
    when s.credits_expire_at is null                then 'legacy subscription'
    when s.credits_expire_at > now()                then 'active pack'
    else                                                 'expired pack'
  end                                               as state,
  s.credits_remaining                               as sessions_left,
  -- Deliberately not "25 minus remaining": grant_credits is additive, so a
  -- second pack puts the balance above 25 and that subtraction goes negative.
  -- graded_sessions below is the honest count of what they got out of it.
  s.credits_expire_at::date                         as expires,
  s.ai_calls_remaining                              as ai_calls_left,
  (select count(*) from sessions g where g.user_id = u.id)
                                                    as graded_sessions,
  (select max(g.completed_at) from sessions g where g.user_id = u.id)
                                                    as last_session,
  s.updated_at                                      as purchased_at,
  s.stripe_customer_id
from user_subscriptions s
join auth.users u on u.id = s.user_id
-- credits_expire_at is set by grant_credits and never cleared, so it stays true
-- of a customer who has since spent every session. credits_remaining alone
-- would make them vanish from this list the moment they used the last one.
where s.credits_expire_at is not null
   or coalesce(s.credits_remaining, 0) > 0
   or s.stripe_subscription_id is not null
order by s.updated_at desc;


-- ---------------------------------------------------------------------------
-- v3_users: everyone, most recently active first.
-- ---------------------------------------------------------------------------
create view v3_users as
select
  u.email,
  case
    when coalesce(s.credits_remaining, 0) > 0
     and (s.credits_expire_at is null or s.credits_expire_at > now()) then 'PACK'
    when s.credits_expire_at is not null                              then 'past customer'
    when s.status = 'pro'                                             then 'legacy pro'
    else                                                                   'free'
  end                                               as plan,
  coalesce(s.credits_remaining, 0)                  as sessions_left,
  coalesce(s.sessions_used_this_month, 0)           as free_used,
  coalesce(s.trial_used, false)                     as tryout_used,
  (select count(*) from session_starts st where st.user_id = u.id)
                                                    as started,
  (select count(*) from sessions g where g.user_id = u.id)
                                                    as finished,
  (select round(avg((coalesce(g.score_diagnosis,0) + coalesce(g.score_independence,0)
                   + coalesce(g.score_precision,0) + coalesce(g.score_verification,0)
                   + coalesce(g.score_recovery,0)  + coalesce(g.score_test_ownership,0)) / 6.0))
     from sessions g where g.user_id = u.id)        as avg_score,
  u.created_at::date                                as signed_up,
  greatest(
    u.last_sign_in_at,
    (select max(st.started_at) from session_starts st where st.user_id = u.id)
  )::date                                           as last_seen,
  (u.email_confirmed_at is not null)                as confirmed,
  u.id                                              as user_id
from auth.users u
left join user_subscriptions s on s.user_id = u.id
where u.id not in (select id from v0_staff)
order by last_seen desc nulls last, signed_up desc;


-- ---------------------------------------------------------------------------
-- v4_sessions: every attempt, finished or not.
-- ---------------------------------------------------------------------------
create view v4_sessions as
select
  u.email,
  st.started_at,
  st.scenario_title,
  st.scenario_difficulty                            as difficulty,
  case
    when g.id is not null                                  then 'finished'
    when st.last_seen_at > now() - interval '3 minutes'    then 'in progress'
    else                                                        'abandoned'
  end                                               as outcome,
  -- For a graded session the recorded duration is authoritative, so it wins.
  -- The heartbeat only fills in unfinished attempts, where there is no graded
  -- duration to have. Written as a case rather than a coalesce because a
  -- heartbeat gap of zero is a real value and coalesce would keep it over the
  -- true duration.
  case
    when g.id is not null then round(g.duration_ms / 60000.0, 1)
    when st.last_seen_at is not null
      then round(extract(epoch from (st.last_seen_at - st.started_at)) / 60.0, 1)
  end                                               as minutes,
  -- Engagement comes from the graded payload where it exists, since that has
  -- been recorded since launch, and from live heartbeat events otherwise.
  coalesce(g.prompt_count,
    (select count(*) from jsonb_array_elements(st.events) e
      where e ->> 'type' = 'prompt_sent'))          as ai_prompts,
  coalesce(g.test_run_count,
    (select count(*) from jsonb_array_elements(st.events) e
      where e ->> 'type' = 'tests_run'))            as tests_run,
  g.code_edit_count                                 as code_edits,
  -- Null, not zero, when there is no grade. An abandoned attempt scoring 0
  -- would drag every average on v5_scenarios toward the floor.
  case when g.id is not null then
    round((coalesce(g.score_diagnosis,0)  + coalesce(g.score_independence,0)
         + coalesce(g.score_precision,0)  + coalesce(g.score_verification,0)
         + coalesce(g.score_recovery,0)   + coalesce(g.score_test_ownership,0)) / 6.0)
  end                                               as score,
  g.headline,
  st.last_part_index                                as reached_part,
  st.events -> -1 ->> 'type'                        as last_action,
  st.ai_enabled,
  st.practice_mode,
  st.id                                             as attempt_id
from session_starts st
join auth.users u on u.id = st.user_id
left join sessions g on g.id = st.completed_session_id
where st.user_id not in (select id from v0_staff)
order by st.started_at desc;


-- ---------------------------------------------------------------------------
-- v5_scenarios: which scenarios lose people.
-- ---------------------------------------------------------------------------
create view v5_scenarios as
select
  scenario_title,
  difficulty,
  count(*)                                          as attempts,
  count(*) filter (where outcome = 'finished')      as finished,
  count(*) filter (where outcome = 'abandoned')     as abandoned,
  round(100.0 * count(*) filter (where outcome = 'abandoned')
        / nullif(count(*), 0))                      as pct_abandoned,
  round(avg(minutes) filter (where outcome = 'abandoned'), 1)
                                                    as avg_min_before_quit,
  round(avg(score)  filter (where outcome = 'finished'))
                                                    as avg_score,
  round(avg(ai_prompts) filter (where outcome = 'finished'), 1)
                                                    as avg_prompts
from v4_sessions
group by scenario_title, difficulty
-- Worst offenders first: the scenario that loses the most people in absolute
-- terms is the one to fix, not the one with the ugliest percentage on 2 tries.
order by abandoned desc, attempts desc;


-- ---------------------------------------------------------------------------
-- v6_feedback: everything anyone told you in words.
-- ---------------------------------------------------------------------------
-- Survey answers and bug reports in one stream, newest first. At this volume
-- the sentences are the finding and the counts are only context, so they belong
-- in one place you actually read rather than two you check separately.
create view v6_feedback as
select
  r.created_at,
  r.user_email                                      as email,
  'survey: ' || r.moment                            as source,
  r.scenario_title,
  -- Choices and free text on one line, so a row is readable without expanding
  -- the jsonb column in the GUI.
  coalesce(r.answers ->> 'note', '')                as note,
  (select string_agg(a.key || '=' ||
            case jsonb_typeof(a.value)
              when 'array' then (select string_agg(x #>> '{}', '/')
                                   from jsonb_array_elements(a.value) x)
              else a.value #>> '{}' end, '  ')
     from jsonb_each(r.answers) a where a.key <> 'note')
                                                    as answers
from user_research r
union all
select
  i.created_at,
  i.user_email,
  'bug report',
  i.scenario_title,
  i.description,
  null
from issue_reports i
order by created_at desc;

commit;

-- Views expose emails, so they stay service-role only, same as the tables.
-- The SQL editor runs as postgres and is unaffected.
revoke all on v0_staff, v1_funnel, v2_customers, v3_users,
                v4_sessions, v5_scenarios, v6_feedback
  from anon, authenticated;
