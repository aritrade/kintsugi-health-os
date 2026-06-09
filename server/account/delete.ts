import type { SupabaseClient } from "@supabase/supabase-js";

// Purges every storage object under the user's folder in the private bucket.
// Files are not FK-cascaded, so they must be removed before the row cascade.
export async function purgeUserStorage(supabase: SupabaseClient, userId: string): Promise<number> {
  let removed = 0;
  const { data: entries } = await supabase.storage.from("medical-records").list(userId, { limit: 1000 });
  const paths = (entries ?? [])
    .filter((e) => e.name)
    .map((e) => `${userId}/${e.name}`);
  if (paths.length > 0) {
    const { data } = await supabase.storage.from("medical-records").remove(paths);
    removed = data?.length ?? 0;
  }
  return removed;
}

// Hard-deletes the account: cascades all owned rows by removing the auth user.
// Relies on the SECURITY DEFINER function from migration 0005.
export async function hardDeleteAccount(supabase: SupabaseClient): Promise<void> {
  const { error } = await supabase.rpc("delete_current_user");
  if (error) throw new Error(error.message);
}
