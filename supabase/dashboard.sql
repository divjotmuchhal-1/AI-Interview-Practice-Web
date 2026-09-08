-- The dashboard: one view, one row per user, everything about them.
--
-- Run in the Supabase SQL Editor. Safe to re-run. Then open it from the Table
-- Editor sidebar under "dashboard".
--
-- Columns are ordered left to right by how often you need them, because the
-- Table Editor shows the leftmost ones without scrolling. Rows are ordered so
-- the people worth looking at are already at the top: paying customers first,
-- then whoever has done the most.
--
-- Survey answers are not in here. They are one row per answer rather than one
-- per user, so folding them in would either duplicate people or flatten what
-- they said into an unreadable cell. They live in research_answers and
-- research_tally, created by user_research.sql.
--
-- Reading user_subscriptions directly is what makes the data look broken. It is
-- 62 rows in arbitrary order where the columns that matter are zero for almost
-- everyone, and status says 'free' even for a customer who paid, because status
-- only ever held 'pro' for the legacy monthly plan. This view answers the
-- questions instead.

begin;

drop view if exists dashboard;

-- Superseded by this view. Dropped so the sidebar has one obvious entry point
-- rather than six overlapping ones. Nothing in the application reads any of
-- them, so this is cleanup and not a migration.
drop view if exists v6_feedback;
drop view if exists v5_scenarios;
drop view if exists v4_sessions;
drop view if exists v3_users;
drop view if exists v2_customers;
drop view if exists v1_funnel;
drop view if exists v0_staff;

create view dashboard as
select
  u.email,

  -- ── Money ────────────────────────────────────────────────────────────────
  case
    when coalesce(s.credits_remaining, 0) > 0
     and (s.credits_expire_at is null or s.credits_expire_at > now()) then 'PACK'
    when s.credits_expire_at is not null                              then 'past customer'
    when s.status = 'pro'                                             then 'legacy pro'
    else                                                                   'free'
  end                                                   as plan,
  -- What they can actually run right now: free allowance plus anything they
  -- bought. Purchased credits alone answer a different question, and calling
  -- that "sessions left" reads as zero for every free user who in fact has
  -- their whole monthly allowance untouched.
  q.free_left + q.pack_left                             as sessions_left,
  q.pack_left,
  s.credits_expire_at::date                             as pack_expires,
  q.free_left,
  q.free_used,
  q.free_limit,
  coalesce(s.trial_used, false)                         as tryout_used,
  -- Out of free sessions this month. Anyone here has to decide about paying
  -- before they can practice again.
  (q.free_left = 0)                                     as out_of_free,
  -- A Stripe customer record exists, which means the upgrade button was
  -- clicked. It does not mean a card was entered: the customer is created
  -- before the checkout session opens.
  (s.stripe_customer_id is not null)                    as clicked_upgrade,

  -- ── Activity ─────────────────────────────────────────────────────────────
  st.started,
  coalesce(g.finished, 0)                               as finished,
  st.started - coalesce(g.finished, 0)                  as abandoned,
  g.avg_score,
  g.best_score,
  g.ai_prompts,
  g.tests_run,
  g.minutes_practiced,
  -- Distinct days with a session. The only retention signal that means
  -- anything at this volume: two sessions in one sitting is one visit.
  st.active_days,
  (st.active_days > 1)                                  as came_back,

  -- ── What they said ───────────────────────────────────────────────────────
  -- Bug reports only. Survey answers are deliberately not joined here: they
  -- live in research_answers and research_tally, so this view has no dependency
  -- on user_research and can be created before that table exists.
  fb.bug_reports,

  -- ── Context ──────────────────────────────────────────────────────────────
  st.last_scenario,
  -- Full timestamp, not a date. The time of day is what lets a run of signups
  -- be matched to the post or video that caused it, and truncating to a date
  -- throws that away permanently.
  u.created_at                                          as signed_up,
  greatest(u.last_sign_in_at, st.last_started)          as last_seen,
  -- How long after signing up they started their first session. Null means
  -- they never started one.
  (select min(started_at) - u.created_at
     from session_starts where user_id = u.id)          as time_to_first_session,
  (u.email_confirmed_at is not null)                    as confirmed,
  -- Your own accounts. 22 of the 94 session starts are yours, which is enough
  -- to make every rate wrong if you forget. Sort or filter on this rather than
  -- hiding the rows, so the table really does hold everything.
  (u.email in ('divjotmuchhal@gmail.com', 'dmuchhal@terpmail.umd.edu'))
                                                        as staff,
  u.id                                                  as user_id

from auth.users u
left join user_subscriptions s on s.user_id = u.id

-- Quota, computed the way the application computes it.
--
-- The monthly reset is lazy: consume_session zeroes the counter the next time
-- the user does something, so a row untouched since last month still holds
-- last month's number. 44 of 62 rows were in that state, which made every
-- free_used and paywall figure read as current when it was five weeks old.
left join lateral (
  select
    used,
    lim                                                 as free_limit,
    greatest(lim - used, 0)                             as free_left,
    case
      when s.credits_expire_at is null
        or s.credits_expire_at > now() then coalesce(s.credits_remaining, 0)
      else 0
    end                                                 as pack_left,
    used                                                as free_used
  from (
    select
      case
        when date_trunc('month', s.sessions_reset_at) = date_trunc('month', now())
          then coalesce(s.sessions_used_this_month, 0)
        else 0
      end                                               as used,
      -- Mirrors sessionLimitFor() in lib/sessionLimits.ts. The tryout spends a
      -- session, so the month it was spent carries a +1 so it does not eat the
      -- monthly allowance. An unspent tryout gets the bonus too, since whatever
      -- session they start next is by definition the tryout.
      (case when s.status = 'pro' then 60 else 2 end)
      + (case
           when s.user_id is null                     then 1
           when not coalesce(s.trial_used, false)     then 1
           when date_trunc('month', s.trial_used_at)
                = date_trunc('month', now())          then 1
           else 0
         end)                                           as lim
  ) base
) q on true

left join lateral (
  select
    count(*)                                            as started,
    count(distinct started_at::date)                    as active_days,
    max(started_at)                                     as last_started,
    (array_agg(scenario_title order by started_at desc))[1]
                                                        as last_scenario
  from session_starts where user_id = u.id
) st on true

left join lateral (
  select
    count(*)                                            as finished,
    round(avg((coalesce(score_diagnosis,0)  + coalesce(score_independence,0)
             + coalesce(score_precision,0)  + coalesce(score_verification,0)
             + coalesce(score_recovery,0)   + coalesce(score_test_ownership,0)) / 6.0))
                                                        as avg_score,
    round(max((coalesce(score_diagnosis,0)  + coalesce(score_independence,0)
             + coalesce(score_precision,0)  + coalesce(score_verification,0)
             + coalesce(score_recovery,0)   + coalesce(score_test_ownership,0)) / 6.0))
                                                        as best_score,
    -- Recorded on every graded session since launch, unlike the heartbeat
    -- counters, which only start filling in September 2026.
    sum(prompt_count)                                   as ai_prompts,
    sum(test_run_count)                                 as tests_run,
    round(sum(duration_ms) / 60000.0)                   as minutes_practiced
  from sessions where user_id = u.id
) g on true

left join lateral (
  select string_agg(description, '  |  ' order by created_at desc) as bug_reports
  from issue_reports where user_id = u.id
) fb on true

order by
  -- Customers first, then people who did the most, then everyone else.
  (coalesce(s.credits_remaining, 0) > 0
    and (s.credits_expire_at is null or s.credits_expire_at > now())) desc,
  s.credits_expire_at is not null desc,
  coalesce(g.finished, 0) desc,
  st.started desc nulls last,
  u.created_at desc;

commit;

-- Exposes emails, so it stays service-role only. The SQL editor and Table
-- Editor run as postgres and are unaffected.
revoke all on dashboard from anon, authenticated;
