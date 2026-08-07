-- A single place to see every user, their plan, and their activity.
-- Run this once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
--
-- This is a VIEW, not a table: it reads live from auth.users, user_subscriptions,
-- and sessions, so it never goes stale and stores no duplicate data.
--
-- SECURITY: it exposes user emails, so access is revoked from anon and
-- authenticated roles. Only the service role (and the SQL editor, which runs as
-- postgres) can read it. Never grant it to anon.

-- Dropped and recreated rather than replaced: CREATE OR REPLACE VIEW cannot add
-- columns in the middle of the list, only append to the end. Safe to drop, as
-- nothing in the application reads this view.
begin;

drop view if exists user_overview;

create view user_overview as
select
  u.email,
  u.created_at::date                                as signed_up,
  u.last_sign_in_at::date                           as last_seen,
  (u.email_confirmed_at is not null)                as confirmed,
  coalesce(s.status, 'free')                        as plan,
  -- ever_started is true the moment consume_session writes a row, which is the
  -- earliest honest signal: it fires when a session begins, whereas
  -- graded_sessions only fires if the user makes it to "End Session".
  (s.user_id is not null)                           as ever_started,
  coalesce(s.trial_used, false)                     as used_free_tryout,
  coalesce(s.sessions_used_this_month, 0)           as ai_sessions_used,
  -- Mirrors sessionLimitFor() in lib/sessionLimits.ts: the free tryout is
  -- counted in ai_sessions_used, so the month it was spent carries a +1 bonus
  -- that keeps it from eating into the monthly quota.
  (case when s.status = 'pro' then 60 else 2 end)
    + (case
         when s.user_id is null then 1
         when not coalesce(s.trial_used, false) then 1
         when date_trunc('month', s.trial_used_at) = date_trunc('month', now()) then 1
         else 0
       end)                                         as ai_session_limit,
  coalesce(g.graded_sessions, 0)                    as graded_sessions,
  g.avg_score,
  g.last_session,
  (s.stripe_subscription_id is not null)            as has_subscription,
  u.id                                              as user_id
from auth.users u
left join user_subscriptions s
  on s.user_id = u.id
left join (
  select
    user_id,
    count(*)                                        as graded_sessions,
    round(avg(
      (coalesce(score_diagnosis,0) + coalesce(score_independence,0)
     + coalesce(score_precision,0) + coalesce(score_verification,0)
     + coalesce(score_recovery,0)  + coalesce(score_test_ownership,0)) / 6.0
    ))                                              as avg_score,
    max(completed_at)::date                         as last_session
  from sessions
  group by user_id
) g on g.user_id = u.id
order by u.created_at desc;

-- Lock it down: emails must not be readable by client-side roles.
revoke all on user_overview from anon, authenticated, public;
grant select on user_overview to service_role;

commit;
