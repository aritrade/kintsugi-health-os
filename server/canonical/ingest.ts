import type { SupabaseClient } from "@supabase/supabase-js";
import type { CanonicalMetricValue } from "@/types/canonical";
import { QUALITY_RANK } from "@/lib/canonical/catalog";

// Writes canonical metric values, resolving same-metric/same-day conflicts in
// favor of the higher quality level (docs/22 section 2). Returns counts.
export async function ingestCanonical(
  supabase: SupabaseClient,
  userId: string,
  values: CanonicalMetricValue[],
): Promise<{ written: number; skipped: number }> {
  let written = 0;
  let skipped = 0;

  for (const v of values) {
    if (!Number.isFinite(v.value)) {
      skipped++;
      continue;
    }
    const day = v.capturedAt.slice(0, 10);

    // Look for an existing same-metric value on the same calendar day.
    const { data: existing } = await supabase
      .from("canonical_metric_values")
      .select("id, quality_level, captured_at")
      .eq("user_id", userId)
      .eq("metric", v.metric)
      .gte("captured_at", `${day}T00:00:00Z`)
      .lte("captured_at", `${day}T23:59:59Z`)
      .limit(1)
      .maybeSingle();

    if (existing) {
      const incomingRank = QUALITY_RANK[v.qualityLevel] ?? 0;
      const existingRank = QUALITY_RANK[(existing.quality_level as string)] ?? 0;
      if (incomingRank <= existingRank) {
        skipped++;
        continue; // keep the better (or equal) existing value
      }
      await supabase
        .from("canonical_metric_values")
        .update({
          value: v.value,
          unit: v.unit,
          source: v.source,
          quality_level: v.qualityLevel,
          captured_at: v.capturedAt,
        })
        .eq("id", existing.id);
      written++;
      continue;
    }

    await supabase.from("canonical_metric_values").insert({
      user_id: userId,
      metric: v.metric,
      value: v.value,
      unit: v.unit,
      source: v.source,
      quality_level: v.qualityLevel,
      captured_at: v.capturedAt,
    });
    written++;
  }

  return { written, skipped };
}

// Fetch the latest canonical value per metric over a window (for index inputs).
export async function latestCanonicalByDate(
  supabase: SupabaseClient,
  userId: string,
  metric: string,
  date: string,
): Promise<number | null> {
  const { data } = await supabase
    .from("canonical_metric_values")
    .select("value")
    .eq("user_id", userId)
    .eq("metric", metric)
    .gte("captured_at", `${date}T00:00:00Z`)
    .lte("captured_at", `${date}T23:59:59Z`)
    .order("captured_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ? Number(data.value) : null;
}
