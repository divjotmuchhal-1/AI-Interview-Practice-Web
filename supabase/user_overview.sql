-- A single place to see every user, their plan, and their activity.
-- Run this once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
--
-- This is a VIEW, not a table: it reads live from auth.users, user_subscriptions,
-- and sessions, so it never goes stale and stores no duplicate data.
--
-- SECURITY: it exposes user emails, so access is revoked from anon and
-- authenticated roles. Only the service role (and the SQL editor, which runs as
-- postgres) can read it. Never grant it to anon.

create or replace view user_overview as
select
  u.email,
  u.created_at::date                                as signed_up,
  u.last_sign_in_at::date                           as last_seen,
  (u.email_confirmed_at is not null)                as confirmed,
  coalesce(s.status, 'free')                        as plan,
  coalesce(s.sessions_used_this_month, 0)           as ai_sessions_used,
  case when s.status = 'pro' then 60 else 2 end     as ai_session_limit,
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
