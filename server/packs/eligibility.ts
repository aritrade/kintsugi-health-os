import type { SupabaseClient } from "@supabase/supabase-js";
import type { Profile } from "@/types";
import { eligiblePacks } from "@/packs/registry";

// Pack eligibility engine: given a freshly created profile, decide which packs
// to auto-activate and write pack_activations rows. Idempotent per (user, pack).
// See docs/04-information-architecture.md (pack integration) and docs/12-mvp-plan.md (M0).
export async function activateEligiblePacks(
  supabase: SupabaseClient,
  userId: string,
  profile: Profile,
): Promise<string[]> {
  const packs = eligiblePacks(profile);
  if (packs.length === 0) return [];

  // Resolve pack ids by slug from the catalog.
  const slugs = packs.map((p) => p.slug);
  const { data: defs, error } = await supabase
    .from("pack_definitions")
    .select("id, slug")
    .in("slug", slugs);

  if (error) throw error;

  const rows = (defs ?? []).map((d) => ({
    user_id: userId,
    pack_id: d.id as string,
    activated_by: "system",
    is_enabled: true,
  }));

  if (rows.length > 0) {
    const { error: upsertError } = await supabase
      .from("pack_activations")
      .upsert(rows, { onConflict: "user_id,pack_id" });
    if (upsertError) throw upsertError;
  }

  return (defs ?? []).map((d) => d.slug as string);
}
