-- Phase 1 research: why people practice here but do not buy.
--
-- The funnel already tells us WHAT happens (62% of starts are abandoned, 16
-- users burned the whole free allowance, 1 of those 16 clicked upgrade). None
-- of it tells us WHY, and no amount of further instrumentation will: intent,
-- expectation and willingness to pay are only knowable by asking.
--
-- Answers are captured at four moments rather than in one survey, because a
-- question asked at the moment it is being lived gets an honest answer and the
-- same question asked a week later in an email gets a rationalisation.
--
-- Run once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.

create table if not exists user_research (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade,
  user_email  text,
  -- intake | abandon | review | paywall. One row per moment per user, except
  -- abandon/review which can recur per session.
  moment      text not null,
  -- Question id -> answer. Choice answers are strings or arrays of strings,
  -- the optional free-text answer lands under 'note'. Kept as jsonb so the
  -- question set can change without a migration.
  answers     jsonb not null default '{}'::jsonb,
  -- What they were doing when asked. Null for intake, which precedes any session.
  scenario_id    text,
  scenario_title text,
  part_index     int,
  -- Ties an answer back to the attempt row so "why did you quit" can be read
  -- next to how long they lasted and what they had done.
  attempt_id  uuid,
  created_at  timestamptz not null default now()
);

create index if not exists user_research_moment_idx  on user_research (moment, created_at desc);
create index if not exists user_research_user_idx    on user_research (user_id);

-- Writes go only through the service-role API route, same as issue_reports:
-- RLS on with no public policy means clients can neither read nor write it.
alter table user_research enable row level security;

-- One row per answer, flattened, so responses can be read without digging
-- through jsonb by hand.
create or replace view research_answers as
select
  r.user_email,
  r.moment,
  a.key                                          as question,
  case jsonb_typeof(a.value)
    when 'array' then (select string_agg(x #>> '{}', ', ')
                         from jsonb_array_elements(a.value) x)
    else a.value #>> '{}'
  end                                            as answer,
  r.scenario_title,
  r.created_at
from user_research r
cross join lateral jsonb_each(r.answers) a
order by r.created_at desc;

-- Tallies for the choice questions. Free text is excluded: 'note' is read, not
-- counted.
--
-- Multi-select answers are counted per choice rather than per combination.
-- Grouping the raw string would spread "LeetCode" across every combination it
-- appears in and make the one question worth asking, what people use today,
-- unanswerable.
create or replace view research_tally as
select
  r.moment,
  a.key as question,
  case jsonb_typeof(a.value)
    when 'array' then choice.value #>> '{}'
    else a.value #>> '{}'
  end   as answer,
  count(*) as n
from user_research r
cross join lateral jsonb_each(r.answers) a
left join lateral jsonb_array_elements(
  case when jsonb_typeof(a.value) = 'array' then a.value else '[]'::jsonb end
) choice on true
where a.key <> 'note'
group by 1, 2, 3
order by moment, question, n desc;


-- ---------------------------------------------------------------------------
-- Reading the results.
-- ---------------------------------------------------------------------------

-- 1. Everything anyone typed. Read this first and read all of it. With numbers
--    this small the free text is the finding and the tallies are the context.
-- select user_email, moment, answer, scenario_title, created_at
-- from research_answers where question = 'note' order by created_at desc;

-- 2. The whole tally at a glance.
-- select * from research_tally;

-- 3. The one that decides pricing vs demand: what people at the wall say
--    stopped them, and whether a real interview would change the answer.
-- select answer, count(*) from research_answers
-- where moment = 'paywall' and question = 'blocker' group by 1 order by 2 desc;

-- 4. Answers joined to what the person actually did, so a claim can be checked
--    against behaviour rather than taken at face value.
-- select r.user_email, r.moment, r.answers, a.outcome, a.minutes_active,
--        a.tests_run, a.prompts_sent, a.overall
-- from user_research r
-- left join session_activity a on a.start_id = r.attempt_id
-- order by r.created_at desc;

-- 5. Who answered intake with an interview inside two weeks. These are the
--    people to talk to directly, and the ones whose non-purchase is the real
--    signal.
-- select user_email, answers ->> 'timing' as interview_timing,
--        answers ->> 'note' as target, created_at
-- from user_research
-- where moment = 'intake' and answers ->> 'timing' in ('this_week', 'two_weeks')
-- order by created_at desc;
