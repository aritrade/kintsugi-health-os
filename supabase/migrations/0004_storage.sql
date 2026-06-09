-- Medical Vault storage: private bucket with per-user folder isolation.
-- Objects are keyed by `<user_id>/<record_id>/<filename>`; RLS confines each
-- user to their own top-level folder. Supabase encrypts objects at rest.
-- See docs/10-security-design.md and docs/05-database-schema.md (medical_records).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'medical-records', 'medical-records', false, 26214400,
  array['application/pdf','image/png','image/jpeg','image/jpg','image/webp']
)
on conflict (id) do nothing;

create policy "vault_select_own" on storage.objects for select to authenticated
  using (bucket_id = 'medical-records' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "vault_insert_own" on storage.objects for insert to authenticated
  with check (bucket_id = 'medical-records' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "vault_update_own" on storage.objects for update to authenticated
  using (bucket_id = 'medical-records' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "vault_delete_own" on storage.objects for delete to authenticated
  using (bucket_id = 'medical-records' and (storage.foldername(name))[1] = auth.uid()::text);
