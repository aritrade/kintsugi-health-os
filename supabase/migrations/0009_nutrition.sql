-- Kintsugi Health OS - Nutrition Intelligence Engine (PRD phases 1-13).
-- Deterministic, evidence-graded nutrition system. Catalog tables are
-- world-readable reference data (like `biomarkers`); user tables are owner-only.

-- Log nutrition engine runs through the existing ai_interactions audit trail.
-- (Only added here; never used as a value within this migration's DDL.)
alter type ai_system add value if not exists 'nutrition';

-- Evidence hierarchy for nutrition claims (A strongest .. E weakest).
do $$ begin
  create type nutrition_evidence_grade as enum ('A','B','C','D','E');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Nutrition Knowledge Graph (catalog / reference data)
-- ---------------------------------------------------------------------------
create table if not exists nutrients (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  unit        text not null,
  category    text,
  rda         jsonb not null default '{}',   -- { "male": n, "female": n }
  description text,
  created_at  timestamptz not null default now()
);

create table if not exists foods (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,
  name          text not null,
  category      text,                         -- protein | dairy | vegetable | fruit | seed_nut | grain | fish | legume
  region_tags   text[] not null default '{}',
  diet_flags    jsonb not null default '{}',  -- { vegetarian, vegan, pescatarian }
  allergens     text[] not null default '{}',
  cultural_tags text[] not null default '{}',
  meal_slots    text[] not null default '{}', -- breakfast | lunch | dinner | snack
  created_at    timestamptz not null default now()
);

create table if not exists food_nutrients (
  id           uuid primary key default gen_random_uuid(),
  food_id      uuid not null references foods(id) on delete cascade,
  nutrient_id  uuid not null references nutrients(id) on delete cascade,
  amount       numeric not null,             -- per serving, in nutrient.unit
  serving_desc text,
  unique (food_id, nutrient_id)
);

create table if not exists mechanisms (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  description text not null
);

create table if not exists nutrition_evidence_sources (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  citation    text not null,
  source_type text not null,                 -- meta_analysis|systematic_review|rct|cohort|expert_consensus
  grade       nutrition_evidence_grade not null,
  note        text,
  url         text
);

create table if not exists nutrient_symptoms (
  id           uuid primary key default gen_random_uuid(),
  nutrient_id  uuid not null references nutrients(id) on delete cascade,
  symptom_name text not null,
  weight       numeric not null default 0.5,  -- 0..1 contribution to suspicion
  mechanism_id uuid references mechanisms(id) on delete set null,
  evidence_id  uuid references nutrition_evidence_sources(id) on delete set null,
  unique (nutrient_id, symptom_name)
);

create table if not exists nutrient_conditions (
  id             uuid primary key default gen_random_uuid(),
  condition_slug text not null,
  nutrient_id    uuid not null references nutrients(id) on delete cascade,
  relationship   text not null default 'supports',  -- supports | depletes
  mechanism_id   uuid references mechanisms(id) on delete set null,
  evidence_id    uuid references nutrition_evidence_sources(id) on delete set null,
  unique (condition_slug, nutrient_id)
);

create table if not exists nutrient_lab_markers (
  id             uuid primary key default gen_random_uuid(),
  nutrient_id    uuid not null references nutrients(id) on delete cascade,
  biomarker_slug text not null,             -- logical reference to biomarkers.slug / input labs key
  low_threshold  numeric not null,
  unit           text,
  unique (nutrient_id, biomarker_slug)
);

create table if not exists food_drug_interactions (
  id               uuid primary key default gen_random_uuid(),
  subject          text not null,           -- nutrient or food slug
  subject_kind     text not null default 'nutrient', -- nutrient | food
  medication_class text not null,
  severity         text not null default 'caution',  -- caution | avoid
  note             text not null,
  safer_alternatives text[] not null default '{}',
  unique (subject, medication_class)
);

create table if not exists condition_diet_restrictions (
  id                 uuid primary key default gen_random_uuid(),
  condition_slug     text not null,
  restricted         text not null,         -- nutrient/food slug
  restricted_kind    text not null default 'nutrient',  -- nutrient | food
  rule               text not null,         -- human-readable
  severity           text not null default 'caution',   -- caution | avoid
  safer_alternatives text[] not null default '{}',
  unique (condition_slug, restricted)
);

-- ---------------------------------------------------------------------------
-- User-owned nutrition data
-- ---------------------------------------------------------------------------
create table if not exists nutrition_profiles (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null unique references auth.users(id) on delete cascade,
  diet_type     text not null default 'omnivore',  -- omnivore|vegetarian|vegan|pescatarian
  allergies     text[] not null default '{}',
  religious_restrictions text[] not null default '{}',
  budget        text,                        -- low|medium|high
  region        text,                        -- e.g. 'West Bengal'
  cultural_prefs text[] not null default '{}',
  disliked_foods text[] not null default '{}',
  goals         text[] not null default '{}',
  conditions    text[] not null default '{}', -- self-reported, drives the Safety Engine
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create trigger trg_nutrition_profiles_updated before update on nutrition_profiles
  for each row execute function set_updated_at();

create table if not exists nutrition_medications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  drug_class text,
  created_at timestamptz not null default now()
);

create table if not exists nutrition_assessments (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  inputs            jsonb not null default '{}',
  suspected_factors jsonb not null default '[]',
  reasoning         jsonb not null default '[]',
  created_at        timestamptz not null default now()
);
create index if not exists idx_nutrition_assess_user on nutrition_assessments (user_id, created_at);

create table if not exists nutrition_recommendations (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users(id) on delete cascade,
  assessment_id      uuid references nutrition_assessments(id) on delete cascade,
  nutrient_slug      text not null,
  food_slug          text not null,
  food_name          text not null,
  why                text not null,
  mechanism          text,
  evidence_grade     nutrition_evidence_grade,
  confidence         numeric,
  safety_status      text not null default 'ok',  -- ok | flagged
  safer_alternatives jsonb not null default '[]',
  explanation        jsonb not null default '{}',
  created_at         timestamptz not null default now()
);
create index if not exists idx_nutrition_recs_user on nutrition_recommendations (user_id, created_at);

create table if not exists meal_plans (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  assessment_id    uuid references nutrition_assessments(id) on delete set null,
  target_nutrients text[] not null default '{}',
  plan             jsonb not null default '{}',  -- { breakfast, lunch, dinner, snacks, hydration }
  created_at       timestamptz not null default now()
);

create table if not exists nutrition_outcomes (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  assessment_id uuid references nutrition_assessments(id) on delete set null,
  metric        text not null,
  baseline      numeric,
  follow_up     numeric,
  window_start  date,
  window_end    date,
  created_at    timestamptz not null default now()
);
create index if not exists idx_nutrition_outcomes_user on nutrition_outcomes (user_id, created_at);

create table if not exists recommendation_history (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  recommendation_id uuid references nutrition_recommendations(id) on delete cascade,
  action            text not null,           -- shown | accepted | dismissed
  created_at        timestamptz not null default now()
);
create index if not exists idx_rec_history_user on recommendation_history (user_id, created_at);

-- ---------------------------------------------------------------------------
-- RLS - user tables owner-only; catalog tables world-readable.
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
  owned text[] := array[
    'nutrition_profiles','nutrition_medications','nutrition_assessments',
    'nutrition_recommendations','meal_plans','nutrition_outcomes','recommendation_history'
  ];
begin
  foreach t in array owned loop
    execute format('alter table %I enable row level security;', t);
    begin
      execute format(
        'create policy "own_rows" on %I using (user_id = auth.uid()) with check (user_id = auth.uid());', t);
    exception when duplicate_object then null; end;
  end loop;
end $$;

do $$
declare
  t text;
  catalog text[] := array[
    'nutrients','foods','food_nutrients','mechanisms','nutrition_evidence_sources',
    'nutrient_symptoms','nutrient_conditions','nutrient_lab_markers',
    'food_drug_interactions','condition_diet_restrictions'
  ];
begin
  foreach t in array catalog loop
    execute format('alter table %I enable row level security;', t);
    begin
      execute format('create policy "read_%s" on %I for select using (true);', t, t);
    exception when duplicate_object then null; end;
  end loop;
end $$;
