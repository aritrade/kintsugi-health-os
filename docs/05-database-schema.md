# 05 - Database Schema

> PostgreSQL (Supabase). Companion to [06-er-diagram.md](06-er-diagram.md) and [09-type-definitions.md](09-type-definitions.md). Security model in [10-security-design.md](10-security-design.md).

This document is the canonical data model. The DDL below is written for Supabase Postgres with Row Level Security (RLS). All user data tables key off `auth.uid()`.

---

## 1. Conventions

- All tables use `uuid` primary keys (`gen_random_uuid()`).
- All user-owned tables carry `user_id uuid not null references auth.users(id) on delete cascade`.
- Timestamps: `created_at timestamptz not null default now()`, `updated_at timestamptz not null default now()` (maintained by trigger).
- Soft-deletable tables carry `deleted_at timestamptz`.
- Sensitive categories (sexual, reproductive) are flagged via `sensitivity` and may be stored in extra-protected form (see [10-security-design.md](10-security-design.md)).
- Enums are Postgres `enum` types for stable vocabularies; free-form taxonomies use lookup tables.

---

## 2. Extensions and Enums

```sql
create extension if not exists "pgcrypto";

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

-- Timeline classification vocabulary (see 21-timeline-taxonomy.md)
create type timeline_category as enum (
  'health', 'sexual_health', 'sleep', 'labs', 'mental_health',
  'fitness', 'body_composition', 'lifestyle', 'life_events'
);
create type event_source as enum ('user', 'ocr', 'ai_historian', 'appointment');

-- Canonical metric data quality (see 22-canonical-health-metrics.md)
create type metric_quality as enum ('A', 'B', 'C', 'D');
```

---

## 3. Identity and Onboarding

```sql
create table profiles (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null unique references auth.users(id) on delete cascade,
  display_name    text,
  biological_sex  biological_sex not null,
  gender_identity text,                       -- optional, free text
  sexual_orientation text,                    -- optional, free text
  date_of_birth   date,
  age_years       int,                        -- denormalized for convenience
  relationship_status text,
  reproductive_goals  text,                  -- highly sensitive: gated behind unlock (see below + doc 10)
  privacy_mode    privacy_mode not null default 'standard',
  onboarding_completed boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
-- SEC-3: reproductive_goals, gender_identity, and sexual_orientation are treated as
-- highly sensitive. In extra_protected mode they require a recent unlock to read
-- (enforced at the API layer; the API returns these fields only post-unlock). In
-- local_only mode they are not written to the server. See 10-security-design.md.

create table pack_definitions (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,            -- 'sexual-health', 'sleep', ...
  name        text not null,
  description text,
  version     text not null default '1.0.0',
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

create table pack_activations (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  pack_id      uuid not null references pack_definitions(id) on delete cascade,
  activated_by text not null default 'system',  -- 'system' (eligibility) or 'user'
  is_enabled   boolean not null default true,
  activated_at timestamptz not null default now(),
  unique (user_id, pack_id)
);
```

---

## 4. Health Timeline

```sql
create table timeline_events (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  life_stage   life_stage not null,
  title        text not null,
  description  text,
  category     timeline_category not null,   -- controlled vocabulary (doc 21)
  subcategory  text not null,                -- validated against the category's registry (doc 21)
  event_date   date,                  -- exact date if known
  approx_period text,                 -- 'age 12', 'early 2019' when exact date unknown
  confidence   numeric not null default 1.0, -- 0..1 placement/classification confidence (doc 21)
  sensitivity  sensitivity not null default 'normal',
  source       event_source not null default 'user',
  metadata     jsonb not null default '{}',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz
);
create index on timeline_events (user_id, event_date);
create index on timeline_events (user_id, life_stage);
create index on timeline_events (user_id, category);
-- Keyword search (doc 21 search requirements)
create index on timeline_events using gin (to_tsvector('english', title || ' ' || coalesce(description,'')));
```

`category` (typed enum) and `subcategory` use the controlled vocabulary in [21-timeline-taxonomy.md](21-timeline-taxonomy.md); `source`, `confidence`, and `sensitivity` follow the metadata schema defined there. The `subcategory` registry is validated at the application layer against the active `category`.

---

## 5. Daily Check-ins

A check-in is one row per user per day; structured blocks are stored as columns plus a `symptoms` child table and pack metric entries.

```sql
create table checkins (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  checkin_date  date not null,
  -- Sleep
  bedtime           time,
  wake_time         time,
  sleep_duration_min int,
  sleep_quality     int,    -- 1..10
  dry_mouth         boolean,
  snoring           boolean,
  night_awakenings  int,
  -- Physical
  energy            int,    -- 1..10
  fatigue           int,
  recovery          int,
  pain              int,
  -- Mental
  mood              int,
  anxiety           int,
  stress            int,
  confidence        int,
  -- Lifestyle
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
create index on checkins (user_id, checkin_date);

create table checkin_symptoms (
  id           uuid primary key default gen_random_uuid(),
  checkin_id   uuid not null references checkins(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  symptom_name text not null,
  severity     int,        -- 1..10
  notes        text,
  created_at   timestamptz not null default now()
);
create index on checkin_symptoms (user_id, symptom_name);
```

### Pack metric entries

Packs append metrics to the daily flow. Stored generically so new packs need no schema change.

```sql
create table pack_metric_definitions (
  id          uuid primary key default gen_random_uuid(),
  pack_id     uuid not null references pack_definitions(id) on delete cascade,
  slug        text not null,           -- 'morning_erection', 'libido_desire', ...
  label       text not null,
  kind        metric_kind not null,
  min_value   numeric,
  max_value   numeric,
  sex_scope   biological_sex,          -- null = all; else limited to a sex
  sensitivity sensitivity not null default 'normal',
  unique (pack_id, slug)
);

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
create index on pack_metric_entries (user_id, metric_id, entry_date);
```

---

## 6. Derived Indices

```sql
create table derived_indices (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  index_kind  index_kind not null,
  index_slug  text not null default 'default', -- discriminator so multiple 'custom' indices coexist (DB-1)
  index_date  date not null,
  value       numeric not null,          -- normalized 0..100
  inputs      jsonb not null default '{}',-- which fields contributed
  created_at  timestamptz not null default now(),
  unique (user_id, index_kind, index_slug, index_date)
);
create index on derived_indices (user_id, index_kind, index_date);
```

The `index_slug` discriminator (default `'default'`) lets multiple distinct indices share `index_kind = 'custom'` without colliding on a date. Built-in indices use a `1:1` `index_kind` (e.g., `health_momentum`) with `index_slug = 'default'`.

Indices include Libido, Sexual Confidence, Erectile Function, Ejaculatory Control (Sexual Health Pack), Sleep Score, Recovery Score (Sleep Pack), and Confidence/Anxiety/Body Image (Mental Health module). The exact formulas, normalization, trend (7-day rolling average), and baseline-display rules are specified in [20-index-formulas.md](20-index-formulas.md); each row's `inputs` JSON stores the contributing values for Detective auditability ([19-detective-rules.md](19-detective-rules.md)).

---

## 7. Health Memory

```sql
create table memory_notes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text,
  body        text not null,
  note_type   text default 'note',  -- note, symptom, question, observation, idea, appointment, report
  sensitivity sensitivity not null default 'normal',
  ai_summary  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz
);
create index on memory_notes using gin (to_tsvector('english', coalesce(title,'') || ' ' || body));

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
```

---

## 8. Medical Record Vault

```sql
create table medical_records (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  type          record_type not null,
  title         text not null,
  storage_path  text not null,          -- Supabase Storage object path (encrypted bucket)
  mime_type     text,
  record_date   date,                   -- date of the document content
  status        record_status not null default 'uploaded',
  sensitivity   sensitivity not null default 'sensitive',
  timeline_event_id uuid references timeline_events(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz
);

create table record_extractions (
  id          uuid primary key default gen_random_uuid(),
  record_id   uuid not null references medical_records(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  raw_text    text,                     -- OCR output
  structured  jsonb not null default '{}',
  confidence  numeric,                  -- OCR/extraction confidence 0..1
  reviewed    boolean not null default false,
  created_at  timestamptz not null default now()
);
```

---

## 9. Laboratory Intelligence

```sql
create table lab_panels (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  record_id   uuid references medical_records(id) on delete set null,
  panel_name  text,                     -- 'CBC', 'Lipid Profile', 'Thyroid', ...
  collected_at date not null,
  lab_name    text,
  created_at  timestamptz not null default now()
);

create table biomarkers (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,     -- 'hba1c', 'vitamin_d', 'tsh', 'testosterone', ...
  display_name text not null,
  unit        text,
  default_ref_low  numeric,
  default_ref_high numeric,
  category    text                      -- cbc, metabolic, lipid, thyroid, hormone, vitamin, custom
);

create table lab_results (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  panel_id      uuid references lab_panels(id) on delete cascade,
  biomarker_id  uuid references biomarkers(id) on delete set null,
  custom_name   text,                   -- for biomarkers not in catalog
  value         numeric not null,
  unit          text,
  ref_low       numeric,                -- as reported by this lab
  ref_high      numeric,
  result_date   date not null,
  sensitivity   sensitivity not null default 'sensitive',
  created_at    timestamptz not null default now()
);
create index on lab_results (user_id, biomarker_id, result_date);
```

---

## 10. Experiment Engine (N-of-1)

```sql
create table experiments (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  pack_id       uuid references pack_definitions(id) on delete set null,
  question      text not null,
  hypothesis    text not null,
  variables     jsonb not null default '{}',   -- independent vars + how to manipulate
  metrics       jsonb not null default '[]',   -- which indices/metrics measure outcome
  duration_days int not null,
  success_criteria text,
  status        experiment_status not null default 'draft',
  started_at    date,
  ended_at      date,
  results       jsonb,                          -- collected outcome data summary
  conclusion    text,
  confidence    numeric,                        -- AI confidence 0..1
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
```

---

## 11. Correlations and Knowledge Graph

```sql
create table correlations (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  variable_a    text not null,        -- e.g. 'sleep_score'
  variable_b    text not null,        -- e.g. 'libido'
  coefficient   numeric,              -- -1..1
  confidence    numeric,              -- 0..1
  sample_size   int,
  window_start  date,
  window_end    date,
  hypothesis    text,
  computed_at   timestamptz not null default now()
);
create index on correlations (user_id, variable_a, variable_b);

create table graph_nodes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  node_type   text not null,          -- symptom, sleep, exercise, lab, recovery, anxiety, confidence, relationship, sexual_health
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
  relation    text not null,          -- correlates_with, precedes, may_influence
  weight      numeric,                -- strength 0..1
  correlation_id uuid references correlations(id) on delete set null,
  created_at  timestamptz not null default now()
);
```

---

## 12. Reporting, Case Builder, AI Logs

```sql
create table reports (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  period       report_period not null,
  period_start date not null,
  period_end   date not null,
  content      jsonb not null default '{}',  -- trends, correlations, findings, open questions, suggestions
  created_at   timestamptz not null default now()
);

create table cases (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  title        text not null,
  specialist   text,                   -- urologist, endocrinologist, ...
  content      jsonb not null default '{}',  -- assembled timeline, symptoms, labs, trends, questions
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table ai_interactions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  system       ai_system not null,
  provider     text,                   -- 'claude' | 'openai'
  model        text,
  prompt_summary text,                 -- never stores raw sensitive content beyond need
  output_summary text,
  guardrail_flags jsonb not null default '[]',
  created_at   timestamptz not null default now()
);
```

### Detective insights (auditability + contradiction history)

Persists the 5-part Detective insight so the audit trace and contradiction handling in [19-detective-rules.md](19-detective-rules.md) are enforceable rather than theoretical (AC-3 / AI-2). Superseded insights are retained (`status = 'superseded'`), never deleted.

```sql
create type insight_stage as enum ('observation','pattern','correlation','hypothesis','question','experiment');
create type insight_status as enum ('active','superseded','contradicted');

create table insights (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  stage         insight_stage not null,
  status        insight_status not null default 'active',
  observation   text not null,            -- descriptive finding
  investigation_question text,
  suggested_next_step    jsonb not null default '{}',
  -- audit trace (doc 19 section 10): every insight must be fully traceable
  source_metrics text[] not null default '{}',
  sample_size    int,
  window_start   date,
  window_end     date,
  confidence_level text,                  -- Low | Moderate | High | Very High (correlations)
  coefficient    numeric,                 -- -1..1 when correlation-backed
  correlation_id uuid references correlations(id) on delete set null,
  experiment_id  uuid references experiments(id) on delete set null,
  supersedes_id  uuid references insights(id) on delete set null,
  is_positive    boolean not null default false, -- supports the anti-anxiety balance rule (doc 25)
  created_at     timestamptz not null default now()
);
create index on insights (user_id, status, created_at);
```

### Health Momentum events

Defines the table referenced by [25-health-momentum-engine.md](25-health-momentum-engine.md) (AC-2). The Momentum Score itself is stored in `derived_indices` with `index_kind = 'health_momentum'`.

```sql
create table momentum_events (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  type        text not null,            -- 'first_30_days', 'first_experiment', 'waist_minus_2cm', ...
  label       text not null,
  evidence    jsonb not null default '{}', -- { metrics:[], value?, dateRange? }
  occurred_at timestamptz not null default now()
);
create index on momentum_events (user_id, occurred_at);
```

---

## 13. Integrations and Audit

```sql
create table integration_connections (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  provider     text not null,          -- whoop, oura, garmin, ultrahuman, fitbit, apple_health, google_fit
  status       text not null default 'connected',
  scopes       text[],
  connected_at timestamptz not null default now()
);
-- Note: OAuth tokens are stored in a server-only secured table / vault, never in client-readable rows.
-- Ingested data from these providers is normalized into canonical metrics; see 22-canonical-health-metrics.md.

-- Canonical metric values (AC-4): vendor-independent measurements from any source.
-- Adapters convert vendor payloads / manual check-ins / labs into these rows in canonical units.
create table canonical_metric_values (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  metric        text not null,            -- 'sleepDurationMinutes', 'restingHeartRate', ...
  value         numeric not null,
  unit          text not null,            -- canonical unit (doc 22 section 4)
  source        text not null,            -- 'whoop' | 'oura' | 'manual' | 'lab' | 'ocr' | ...
  quality_level metric_quality not null,  -- A device | B lab | C user | D ocr
  captured_at   timestamptz not null,     -- when measured, not ingested
  created_at    timestamptz not null default now()
);
create index on canonical_metric_values (user_id, metric, captured_at);

create table audit_log (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete set null,
  action      text not null,           -- export, delete, login, record_view, ...
  entity      text,
  entity_id   uuid,
  metadata    jsonb not null default '{}',
  created_at  timestamptz not null default now()
);
create index on audit_log (user_id, created_at);
```

---

## 14. Row Level Security (RLS)

Every user-owned table follows the same pattern. Enable RLS and restrict all access to the owner.

```sql
alter table profiles enable row level security;
create policy "own profile" on profiles
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Repeat for every user-owned table:
alter table timeline_events enable row level security;
create policy "own rows" on timeline_events
  using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table checkins enable row level security;
create policy "own rows" on checkins
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ... checkin_symptoms, pack_metric_entries, derived_indices, memory_notes,
--     tags, medical_records, record_extractions, lab_panels, lab_results,
--     experiments, correlations, graph_nodes, graph_edges, reports, cases,
--     ai_interactions, insights, momentum_events, canonical_metric_values,
--     integration_connections, audit_log.
```

`note_tags` has no `user_id`, so its RLS is expressed via the parent note's ownership (SEC-2 / DB-2):

```sql
alter table note_tags enable row level security;
create policy "own note_tags" on note_tags
  using (exists (select 1 from memory_notes n where n.id = note_tags.note_id and n.user_id = auth.uid()))
  with check (exists (select 1 from memory_notes n where n.id = note_tags.note_id and n.user_id = auth.uid()));
```

Every table added in this revision (`insights`, `momentum_events`, `canonical_metric_values`) ships with the standard owner-only policy (SEC-1):

```sql
alter table insights enable row level security;
create policy "own rows" on insights
  using (user_id = auth.uid()) with check (user_id = auth.uid());
-- identical policy for momentum_events and canonical_metric_values
```

Reference/catalog tables (`pack_definitions`, `pack_metric_definitions`, `biomarkers`) are world-readable but writable only by service role.

```sql
alter table biomarkers enable row level security;
create policy "read catalog" on biomarkers for select using (true);
```

### Extra-protected (sexual / reproductive) data

Rows flagged `sensitivity in ('sensitive','highly_sensitive')` are additionally gated. When a user selects `privacy_mode = 'extra_protected'`, the application requires a recent re-authentication / unlock before reading highly sensitive rows (enforced at the API layer; see [10-security-design.md](10-security-design.md)). In `local_only` mode these rows are never written to the server at all.

---

## 15. Triggers

```sql
create or replace function set_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

-- Attach to every table with updated_at, e.g.:
create trigger trg_profiles_updated before update on profiles
  for each row execute function set_updated_at();
```

---

## 16. Notes on Extensibility

- New Investigation Packs require **zero schema migrations**: they insert into `pack_definitions` + `pack_metric_definitions`, and all entries flow through `pack_metric_entries`.
- New biomarkers insert into `biomarkers`; custom biomarkers use `lab_results.custom_name`.
- New AI systems extend the `ai_system` enum only.
- New derived indices extend the `index_kind` enum, or use `'custom'` with a distinct `index_slug` (DB-1). The Health Momentum Score uses `index_kind = 'health_momentum'`; its `momentum_events` table is defined in Section 12 and detailed in [25-health-momentum-engine.md](25-health-momentum-engine.md).
- Wearable/manual/lab inputs are persisted as `canonical_metric_values` ([22-canonical-health-metrics.md](22-canonical-health-metrics.md)); adding a provider needs only a new adapter, no schema change.
- Detective insights persist in `insights` with a full audit trace ([19-detective-rules.md](19-detective-rules.md)); superseded insights are retained, never deleted.
