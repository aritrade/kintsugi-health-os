-- Kintsugi Health OS - Row Level Security (M0)
-- Source of truth: docs/05-database-schema.md section 14 + docs/10-security-design.md
-- Every user-owned table restricts all access to the owner (auth.uid()).

-- Helper: apply owner-only policy to a table with a user_id column.
do $$
declare
  t text;
  owned_tables text[] := array[
    'profiles','pack_activations','timeline_events','checkins','checkin_symptoms',
    'pack_metric_entries','derived_indices','memory_notes','tags','medical_records',
    'record_extractions','lab_panels','lab_results','experiments','correlations',
    'graph_nodes','graph_edges','reports','cases','ai_interactions','insights',
    'momentum_events','integration_connections','canonical_metric_values'
  ];
begin
  foreach t in array owned_tables loop
    execute format('alter table %I enable row level security;', t);
    execute format(
      'create policy "own_rows" on %I using (user_id = auth.uid()) with check (user_id = auth.uid());',
      t
    );
  end loop;
end $$;

-- note_tags has no user_id; gate via parent note ownership (SEC-2 / DB-2).
alter table note_tags enable row level security;
create policy "own_note_tags" on note_tags
  using (exists (select 1 from memory_notes n where n.id = note_tags.note_id and n.user_id = auth.uid()))
  with check (exists (select 1 from memory_notes n where n.id = note_tags.note_id and n.user_id = auth.uid()));

-- audit_log: rows may be written by the service role; users can read their own.
alter table audit_log enable row level security;
create policy "read_own_audit" on audit_log for select using (user_id = auth.uid());

-- Catalog / reference tables: world-readable, writable only by service role.
alter table pack_definitions enable row level security;
create policy "read_packs" on pack_definitions for select using (true);

alter table pack_metric_definitions enable row level security;
create policy "read_pack_metrics" on pack_metric_definitions for select using (true);

alter table biomarkers enable row level security;
create policy "read_biomarkers" on biomarkers for select using (true);
