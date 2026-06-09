-- Kintsugi Health OS - initial schema (M0)
-- Source of truth: docs/05-database-schema.md (post-validation, docs/26-architecture-validation.md)
-- PostgreSQL / Supabase with Row Level Security.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type biological_sex as enum ('male', 'female', 'intersex', 'prefer_not_to_say');
create type privacy_mode as enum ('standard', 'extra_protected', 'local_only');
create type sensitivity as enum ('normal', 'sensitive', 'highly_sensitive');
create type life_stage as enum ('childhood', 'puberty', 'teen', 'adult');
create type record_type as enum ('lab_report', 'imaging_report', 'doctor_note', 'prescription_doc', 'other');
create type record_status as enum ('uploaded', 'processing', 'extracted', 'reviewed', 'failed');
create type experiment_status as enum ('draft', 'active', 'completed', 'abandoned');
create type report_period as enum ('weekly', 'monthly', 'quarterly', 'annual');
create type ai_system as enum ('detective', 'historian', 'research', 'appointment_prep', 'experiment_designer', 'root_cause');
create type metric_kind as enum ('scale', 'boolean', 'duration', 'count', 'numeric', 'text');
create type index_kind as enum (
  'libido', 'sexual_confidence', 'erectile_function', 'ejaculatory_control',
  'sleep_score', 'recovery_score', 'confidence', 'anxiety', 'body_image',
  'health_momentum', 'custom'
);
create type timeline_category as enum (
  'health', 'sexual_health', 'sleep', 'labs', 'mental_health',
  'fitness', 'body_composition', 'lifestyle', 'life_events'
);
create type event_source as enum ('user', 'ocr', 'ai_historian', 'appointment');
create type metric_quality as enum ('A', 'B', 'C', 'D');
create type insight_stage as enum ('observation','pattern','correlation','hypothesis','question','experiment');
create type insight_status as enum ('active','superseded','contradicted');

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------
create or replace function set_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

-- ---------------------------------------------------------------------------
-- Identity & onboarding
-- ---------------------------------------------------------------------------
create table profiles (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null unique references auth.users(id) on delete cascade,
  display_name    text,
  biological_sex  biological_sex not null,
  gender_identity text,
  sexual_orientation text,
  date_of_birth   date,
  age_years       int,
  relationship_status text,
  reproductive_goals  text,            -- highly sensitive: gated behind unlock at API layer
  privacy_mode    privacy_mode not null default 'standard',
  onboarding_completed boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create trigger trg_profiles_updated before update on profiles
  for each row execute function set_updated_at();

create table pack_definitions (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  description text,
  version     text not null default '1.0.0',
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

create table pack_metric_definitions (
  id          uuid primary key default gen_random_uuid(),
  pack_id     uuid not null references pack_definitions(id) on delete cascade,
  slug        text not null,
  label       text not null,
  kind        metric_kind not null,
  min_value   numeric,
  max_value   numeric,
  sex_scope   biological_sex,
  sensitivity sensitivity not null default 'normal',
  unique (pack_id, slug)
);

create table pack_activations (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  pack_id      uuid not null references pack_definitions(id) on delete cascade,
  activated_by text not null default 'system',
  is_enabled   boolean not null default true,
  activated_at timestamptz not null default now(),
  unique (user_id, pack_id)
);

-- ---------------------------------------------------------------------------
-- Health timeline
-- ---------------------------------------------------------------------------
create table timeline_events (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  life_stage   life_stage not null,
  title        text not null,
  description  text,
  category     timeline_category not null,
  subcategory  text not null,
  event_date   date,
  approx_period text,
  confidence   numeric not null default 1.0,
  sensitivity  sensitivity not null default 'normal',
  source       event_source not null default 'user',
  metadata     jsonb not null default '{}',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz
);
create index idx_timeline_user_date on timeline_events (user_id, event_date);
create index idx_timeline_user_stage on timeline_events (user_id, life_stage);
create index idx_timeline_user_category on timeline_events (user_id, category);
create index idx_timeline_fts on timeline_events
  using gin (to_tsvector('english', title || ' ' || coalesce(description,'')));
create trigger trg_timeline_updated before update on timeline_events
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Daily check-ins
-- ---------------------------------------------------------------------------
create table checkins (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  checkin_date  date not null,
  bedtime           time,
  wake_time         time,
  sleep_duration_min int,
  sleep_quality     int,
  dry_mouth         boolean,
  snoring           boolean,
  night_awakenings  int,
  energy            int,
  fatigue           int,
  recovery          int,
  pain              int,
  mood              int,
  anxiety           int,
  stress            int,
  confidence        int,
  ran               boolean,
  strength_trained  boolean,
  walked            boolean,
  steps             int,
  water_ml          int,
  alcohol_units     numeric,
  nicotine          boolean,
  caffeine_mg       int,
  is_complete       boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (user_id, checkin_date)
);
create index idx_checkins_user_date on checkins (user_id, checkin_date);
create trigger trg_checkins_updated before update on checkins
  for each row execute function set_updated_at();

create table checkin_symptoms (
  id           uuid primary key default gen_random_uuid(),
  checkin_id   uuid not null references checkins(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  symptom_name text not null,
  severity     int,
  notes        text,
  created_at   timestamptz not null default now()
);
create index idx_symptoms_user_name on checkin_symptoms (user_id, symptom_name);

create table pack_metric_entries (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  metric_id    uuid not null references pack_metric_definitions(id) on delete cascade,
  checkin_id   uuid references checkins(id) on delete set null,
  entry_date   date not null,
  value_num    numeric,
  value_bool   boolean,
  value_text   text,
  created_at   timestamptz not null default now()
);
create index idx_pme_user_metric_date on pack_metric_entries (user_id, metric_id, entry_date);

-- ---------------------------------------------------------------------------
-- Derived indices
-- ---------------------------------------------------------------------------
create table derived_indices (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  index_kind  index_kind not null,
  index_slug  text not null default 'default',
  index_date  date not null,
  value       numeric not null,
  inputs      jsonb not null default '{}',
  created_at  timestamptz not null default now(),
  unique (user_id, index_kind, index_slug, index_date)
);
create index idx_indices_user_kind_date on derived_indices (user_id, index_kind, index_date);

-- ---------------------------------------------------------------------------
-- Health memory
-- ---------------------------------------------------------------------------
create table memory_notes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text,
  body        text not null,
  note_type   text default 'note',
  sensitivity sensitivity not null default 'normal',
  ai_summary  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz
);
create index idx_memory_fts on memory_notes
  using gin (to_tsvector('english', coalesce(title,'') || ' ' || body));
create trigger trg_memory_updated before update on memory_notes
  for each row execute function set_updated_at();

create table tags (
  id      uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name    text not null,
  unique (user_id, name)
);

create table note_tags (
  note_id uuid not null references memory_notes(id) on delete cascade,
  tag_id  uuid not null references tags(id) on delete cascade,
  primary key (note_id, tag_id)
);

-- ---------------------------------------------------------------------------
-- Medical vault
-- ---------------------------------------------------------------------------
create table medical_records (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  type          record_type not null,
  title         text not null,
  storage_path  text not null,
  mime_type     text,
  record_date   date,
  status        record_status not null default 'uploaded',
  sensitivity   sensitivity not null default 'sensitive',
  timeline_event_id uuid references timeline_events(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz
);
create trigger trg_records_updated before update on medical_records
  for each row execute function set_updated_at();

create table record_extractions (
  id          uuid primary key default gen_random_uuid(),
  record_id   uuid not null references medical_records(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  raw_text    text,
  structured  jsonb not null default '{}',
  confidence  numeric,
  reviewed    boolean not null default false,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Laboratory intelligence
-- ---------------------------------------------------------------------------
create table lab_panels (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  record_id   uuid references medical_records(id) on delete set null,
  panel_name  text,
  collected_at date not null,
  lab_name    text,
  created_at  timestamptz not null default now()
);

create table biomarkers (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  display_name text not null,
  unit        text,
  default_ref_low  numeric,
  default_ref_high numeric,
  category    text
);

create table lab_results (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  panel_id      uuid references lab_panels(id) on delete cascade,
  biomarker_id  uuid references biomarkers(id) on delete set null,
  custom_name   text,
  value         numeric not null,
  unit          text,
  ref_low       numeric,
  ref_high      numeric,
  result_date   date not null,
  sensitivity   sensitivity not null default 'sensitive',
  created_at    timestamptz not null default now()
);
create index idx_labs_user_biomarker_date on lab_results (user_id, biomarker_id, result_date);

-- ---------------------------------------------------------------------------
-- Experiments
-- ---------------------------------------------------------------------------
create table experiments (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  pack_id       uuid references pack_definitions(id) on delete set null,
  question      text not null,
  hypothesis    text not null,
  variables     jsonb not null default '{}',
  metrics       jsonb not null default '[]',
  duration_days int not null,
  success_criteria text,
  status        experiment_status not null default 'draft',
  started_at    date,
  ended_at      date,
  results       jsonb,
  conclusion    text,
  confidence    numeric,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create trigger trg_experiments_updated before update on experiments
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Correlations & knowledge graph
-- ---------------------------------------------------------------------------
create table correlations (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  variable_a    text not null,
  variable_b    text not null,
  coefficient   numeric,
  confidence    numeric,
  sample_size   int,
  window_start  date,
  window_end    date,
  hypothesis    text,
  computed_at   timestamptz not null default now()
);
create index idx_correlations_user_vars on correlations (user_id, variable_a, variable_b);

create table graph_nodes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  node_type   text not null,
  label       text not null,
  metadata    jsonb not null default '{}',
  created_at  timestamptz not null default now(),
  unique (user_id, node_type, label)
);

create table graph_edges (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  source_id   uuid not null references graph_nodes(id) on delete cascade,
  target_id   uuid not null references graph_nodes(id) on delete cascade,
  relation    text not null,
  weight      numeric,
  correlation_id uuid references correlations(id) on delete set null,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Reporting, cases, AI logs, insights, momentum
-- ---------------------------------------------------------------------------
create table reports (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  period       report_period not null,
  period_start date not null,
  period_end   date not null,
  content      jsonb not null default '{}',
  created_at   timestamptz not null default now()
);

create table cases (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  title        text not null,
  specialist   text,
  content      jsonb not null default '{}',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create trigger trg_cases_updated before update on cases
  for each row execute function set_updated_at();

create table ai_interactions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  system       ai_system not null,
  provider     text,
  model        text,
  prompt_summary text,
  output_summary text,
  guardrail_flags jsonb not null default '[]',
  created_at   timestamptz not null default now()
);

create table insights (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  stage         insight_stage not null,
  status        insight_status not null default 'active',
  observation   text not null,
  investigation_question text,
  suggested_next_step    jsonb not null default '{}',
  source_metrics text[] not null default '{}',
  sample_size    int,
  window_start   date,
  window_end     date,
  confidence_level text,
  coefficient    numeric,
  correlation_id uuid references correlations(id) on delete set null,
  experiment_id  uuid references experiments(id) on delete set null,
  supersedes_id  uuid references insights(id) on delete set null,
  is_positive    boolean not null default false,
  created_at     timestamptz not null default now()
);
create index idx_insights_user_status on insights (user_id, status, created_at);

create table momentum_events (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  type        text not null,
  label       text not null,
  evidence    jsonb not null default '{}',
  occurred_at timestamptz not null default now()
);
create index idx_momentum_user_time on momentum_events (user_id, occurred_at);

-- ---------------------------------------------------------------------------
-- Integrations, canonical metrics, audit
-- ---------------------------------------------------------------------------
create table integration_connections (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  provider     text not null,
  status       text not null default 'connected',
  scopes       text[],
  connected_at timestamptz not null default now()
);

create table canonical_metric_values (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  metric        text not null,
  value         numeric not null,
  unit          text not null,
  source        text not null,
  quality_level metric_quality not null,
  captured_at   timestamptz not null,
  created_at    timestamptz not null default now()
);
create index idx_canon_user_metric_time on canonical_metric_values (user_id, metric, captured_at);

create table audit_log (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete set null,
  action      text not null,
  entity      text,
  entity_id   uuid,
  metadata    jsonb not null default '{}',
  created_at  timestamptz not null default now()
);
create index idx_audit_user_time on audit_log (user_id, created_at);
