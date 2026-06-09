import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPack } from "@/packs/registry";
import { getIndexTrend } from "@/server/indices/trends";
import { BASELINE_MIN_OBSERVATIONS } from "@/packs/normalize";
import { PackDashboardClient, type PackCard } from "@/components/packs/pack-dashboard-client";
import type { BiologicalSex, IndexKind, PrivacyMode } from "@/types";

export default async function PackDashboardPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const def = getPack(slug);
  if (!def) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // The pack must be activated for this user.
  const { data: activation } = await supabase
    .from("pack_activations")
    .select("is_enabled, pack_definitions!inner(slug)")
    .eq("is_enabled", true)
    .eq("pack_definitions.slug", slug)
    .maybeSingle();
  if (!activation) notFound();

  const { data: profile } = await supabase
    .from("profiles")
    .select("biological_sex, privacy_mode")
    .eq("user_id", user!.id)
    .maybeSingle();
  const biologicalSex = (profile?.biological_sex ?? "prefer_not_to_say") as BiologicalSex;
  const privacyMode = (profile?.privacy_mode ?? "standard") as PrivacyMode;

  // Cards for indices visible to this user (respecting index sex scope).
  const indexBySlug = new Map(def.indices.map((i) => [i.indexKind, i]));
  const visibleCards = def.dashboard.cards.filter((c) => {
    const idx = indexBySlug.get(c.indexKind);
    return idx && (!idx.sexScope || idx.sexScope === biologicalSex);
  });

  const cards: PackCard[] = await Promise.all(
    visibleCards.map(async (c) => ({
      indexKind: c.indexKind,
      title: c.title,
      trend: await getIndexTrend(supabase, user!.id, c.indexKind as IndexKind),
    })),
  );

  const containsSensitive = def.metrics.some((m) => m.sensitivity === "highly_sensitive");

  return (
    <PackDashboardClient
      packName={def.name}
      description={def.description}
      containsSensitive={containsSensitive}
      privacyMode={privacyMode}
      baselineMin={BASELINE_MIN_OBSERVATIONS}
      cards={cards}
    />
  );
}
