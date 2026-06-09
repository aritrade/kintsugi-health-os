-- Kintsugi Health OS - M6 Data Ownership (export + hard delete)
-- Source of truth: docs/10-security-design.md section 9, docs/07-api-specifications.md section 12.

-- Export/delete are user-initiated first-class actions, so the owner may append
-- their own audit entries (reads remain owner-scoped from 0002).
create policy "insert_own_audit" on audit_log
  for insert with check (user_id = auth.uid());

-- Hard account deletion: removing the auth user cascades every owned row
-- (all user tables FK auth.users on delete cascade). Storage objects are purged
-- separately by the API before this runs. SECURITY DEFINER so an authenticated
-- user can delete only their own account (auth.uid()).
create or replace function public.delete_current_user()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_current_user() from public;
grant execute on function public.delete_current_user() to authenticated;
