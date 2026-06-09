import type { SupabaseClient } from "@supabase/supabase-js";
import type { BiologicalSex } from "@/types";
import type { ActivePackMetrics, ResolvedPackMetric } from "@/types/checkin";

// Resolves a user's enabled packs and their metric definitions, filtered by
// biological sex scope. Drives the dynamic sections of the daily check-in
// (docs/04-information-architecture.md pack integration, docs/11-wireframes.md S05).
export async function getActivePackMetrics(
  supabase: SupabaseClient,
  biologicalSex: BiologicalSex,
): Promise<ActivePackMetrics[]> {
  const { data, error } = await supabase
    .from("pack_activations")
    .select(
      "is_enabled, pack_definitions(slug, name, pack_metric_definitions(id, slug, label, kind, min_value, max_value, sex_scope, sensitivity))",
    )
    .eq("is_enabled", true);

  if (error) throw error;

  const result: ActivePackMetrics[] = [];

  for (const row of data ?? []) {
    const pack = row.pack_definitions as unknown as {
      slug: string;
      name: string;
      pack_metric_definitions: Array<{
        id: string;
        slug: string;
        label: string;
        kind: ResolvedPackMetric["kind"];
        min_value: number | null;
        max_value: number | null;
        sex_scope: BiologicalSex | null;
        sensitivity: ResolvedPackMetric["sensitivity"];
      }>;
    } | null;
    if (!pack) continue;

    const metrics: ResolvedPackMetric[] = (pack.pack_metric_definitions ?? [])
      .filter((m) => !m.sex_scope || m.sex_scope === biologicalSex)
      .map((m) => ({
        metricId: m.id,
        packSlug: pack.slug,
        slug: m.slug,
        label: m.label,
        kind: m.kind,
        min: m.min_value ?? undefined,
        max: m.max_value ?? undefined,
        sexScope: m.sex_scope ?? undefined,
        sensitivity: m.sensitivity,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));

    if (metrics.length === 0) continue;

    result.push({
      packSlug: pack.slug,
      packName: pack.name,
      containsSensitive: metrics.some((m) => m.sensitivity === "highly_sensitive"),
      metrics,
    });
  }

  return result.sort((a, b) => a.packName.localeCompare(b.packName));
}
