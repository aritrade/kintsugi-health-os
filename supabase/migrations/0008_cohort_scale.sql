-- Kintsugi Health OS - Phase 2.7 (feedback) + Phase 3.5 (scale & i18n).

-- Feedback capture for the early cohort (docs/13 §2.7).
create table if not exists feedback (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  category   text not null,
  message    text not null,
  created_at timestamptz not null default now()
);
alter table feedback enable row level security;
do $$ begin
  create policy "own_feedback" on feedback using (user_id = auth.uid()) with check (user_id = auth.uid());
exception when duplicate_object then null; end $$;

-- Reference-range localization (docs/14 §2.5): region drives lab reference bands/units.
alter table profiles add column if not exists region text not null default 'US';

-- Performance indexes for multi-year histories (docs/14 §2.5).
create index if not exists idx_derived_user_kind_date on derived_indices (user_id, index_kind, index_date);
create index if not exists idx_insights_user_status on insights (user_id, status);
create index if not exists idx_checkins_user_date on checkins (user_id, checkin_date);
create index if not exists idx_reports_user_created on reports (user_id, created_at);
create index if not exists idx_experiments_user_status on experiments (user_id, status);
