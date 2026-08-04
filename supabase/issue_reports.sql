-- Issue reports table for the in-app "Report issue" modal.
-- Run this once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
-- Writes happen only through the service-role API route; RLS stays enabled with
-- no public policies so clients cannot read or write it directly.

create table if not exists issue_reports (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references auth.users(id) on delete set null,
  user_email     text,
  scenario_id    text not null,
  scenario_title text,
  part_index     int,
  part_title     text,
  description    text not null,
  code_snapshot  jsonb,
  created_at     timestamptz not null default now()
);

alter table issue_reports enable row level security;
