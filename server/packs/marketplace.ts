import type { SupabaseClient } from "@supabase/supabase-js";
import type { Profile } from "@/types";
import { marketplacePacks, getPack } from "@/packs/registry";

export interface MarketplaceEntry {
  slug: string;
  name: string;
  description: string;
  version: string;
  metricCount: number;
  indexCount: number;
  enabled: boolean;
  verified: boolean; // first-party packs pass the safety review gate (docs/14 §2.3)
  sensitive: boolean;
}

export async function getMarketplace(
  supabase: SupabaseClient,
  profile: Pick<Profile, "userId" | "biologicalSex">,
): Promise<MarketplaceEntry[]> {
  const packs = marketplacePacks(profile);

  const { data: defs } = await supabase.from("pack_definitions").select("id, slug");
  const slugToId = new Map((defs ?? []).map((d) => [d.slug as string, d.id as string]));

  const { data: activations } = await supabase
    .from("pack_activations")
    .select("pack_id, is_enabled")
    .eq("user_id", profile.userId);
  const enabledByPackId = new Map((activations ?? []).map((a) => [a.pack_id as string, a.is_enabled as boolean]));

  return packs.map((p) => {
    const id = slugToId.get(p.slug);
    const visibleMetrics = p.metrics.filter((m) => !m.sexScope || m.sexScope === profile.biologicalSex);
    return {
      slug: p.slug,
      name: p.name,
      description: p.description,
      version: p.version,
      metricCount: visibleMetrics.length,
      indexCount: p.indices.filter((i) => !i.sexScope || i.sexScope === profile.biologicalSex).length,
      enabled: id ? enabledByPackId.get(id) ?? false : false,
      verified: true,
      sensitive: visibleMetrics.some((m) => m.sensitivity === "highly_sensitive"),
    };
  });
}

export async function setPackEnabled(
  supabase: SupabaseClient,
  userId: string,
  slug: string,
  enabled: boolean,
): Promise<boolean> {
  if (!getPack(slug)) return false;
  const { data: def } = await supabase.from("pack_definitions").select("id").eq("slug", slug).maybeSingle();
  if (!def) return false;

  const { data: existing } = await supabase
    .from("pack_activations")
    .select("id")
    .eq("user_id", userId)
    .eq("pack_id", def.id)
    .maybeSingle();

  if (existing) {
    await supabase.from("pack_activations").update({ is_enabled: enabled }).eq("id", existing.id);
  } else {
    await supabase.from("pack_activations").insert({
      user_id: userId,
      pack_id: def.id,
      activated_by: "user",
      is_enabled: enabled,
    });
  }
  return true;
}
