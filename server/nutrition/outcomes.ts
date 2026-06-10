// P9 - Outcome Tracking. Closes the Evidence -> Reasoning -> Recommendation ->
// Outcome loop by linking nutrition work to the user's own signals: check-in
// trends (energy, fatigue, mood, sleep) and lab deltas for tracked nutrients.
// Deterministic; reads the user's data only.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { OutcomeDelta, OutcomeResult, SuspectedFactor } from "@/types/nutrition";
import { applyNutritionGuardrails } from "@/ai/nutrition-guardrails";
import { loadKnowledgeGraph } from "@/server/nutrition/knowledge";

const CHECKIN_METRICS: { key: string; label: string; higherIsBetter: boolean }[] = [
  { key: "energy", label: "Energy", higherIsBetter: true },
  { key: "fatigue", label: "Fatigue", higherIsBetter: false },
  { key: "mood", label: "Mood", higherIsBetter: true },
  { key: "sleep_quality", label: "Sleep quality", higherIsBetter: true },
];

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const round1 = (n: number) => Math.round(n * 10) / 10;
const dateNDaysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);

export async function computeOutcomes(
  sb: SupabaseClient,
  userId: string,
  factors: SuspectedFactor[],
  windowDays = 56,
): Promise<OutcomeResult> {
  const windowEnd = dateNDaysAgo(0);
  const windowStart = dateNDaysAgo(windowDays);
  const mid = dateNDaysAgo(Math.round(windowDays / 2));

  const deltas: OutcomeDelta[] = [];

  // 1) Check-in trends: baseline (older half) vs follow-up (recent half).
  const { data: checkins } = await sb
    .from("checkins")
    .select("checkin_date, energy, fatigue, mood, sleep_quality")
    .eq("user_id", userId)
    .gte("checkin_date", windowStart)
    .order("checkin_date", { ascending: true });

  const rows = checkins ?? [];
  for (const m of CHECKIN_METRICS) {
    const baseVals = rows.filter((r) => (r.checkin_date as string) < mid).map((r) => Number(r[m.key as keyof typeof r])).filter((v) => !Number.isNaN(v) && v != null);
    const followVals = rows.filter((r) => (r.checkin_date as string) >= mid).map((r) => Number(r[m.key as keyof typeof r])).filter((v) => !Number.isNaN(v) && v != null);
    const baseline = avg(baseVals);
    const followUp = avg(followVals);
    const delta = baseline != null && followUp != null ? round1(followUp - baseline) : null;
    const direction = delta == null ? "unknown" : delta > 0 ? "up" : delta < 0 ? "down" : "flat";
    const improved = delta == null ? null : m.higherIsBetter ? delta > 0 : delta < 0;
    deltas.push({
      metric: m.key,
      label: m.label,
      baseline: baseline != null ? round1(baseline) : null,
      followUp: followUp != null ? round1(followUp) : null,
      delta,
      direction,
      improved,
    });
  }

  // 2) Lab deltas for the suspected nutrients that have a lab marker.
  const kg = await loadKnowledgeGraph(sb);
  const factorSlugs = new Set(factors.map((f) => f.nutrientSlug));
  const trackedMarkers = kg.labMarkers.filter((mk) => factorSlugs.has(mk.nutrientSlug));
  if (trackedMarkers.length > 0) {
    const { data: labs } = await sb
      .from("lab_results")
      .select("value, result_date, biomarkers(slug)")
      .eq("user_id", userId)
      .order("result_date", { ascending: true });
    const labRows = (labs ?? []) as Record<string, unknown>[];
    for (const mk of trackedMarkers) {
      const series = labRows
        .filter((r) => {
          const b = Array.isArray(r.biomarkers) ? r.biomarkers[0] : r.biomarkers;
          return (b as { slug?: string })?.slug === mk.biomarkerSlug;
        })
        .map((r) => Number(r.value))
        .filter((v) => !Number.isNaN(v));
      if (series.length < 2) continue;
      const baseline = series[0];
      const followUp = series[series.length - 1];
      const delta = round1(followUp - baseline);
      deltas.push({
        metric: mk.biomarkerSlug,
        label: `${mk.nutrientName} marker`,
        baseline: round1(baseline),
        followUp: round1(followUp),
        delta,
        direction: delta > 0 ? "up" : delta < 0 ? "down" : "flat",
        improved: delta > 0,
      });
    }
  }

  // Narrative (guardrailed).
  const rawNarrative: string[] = [];
  const improvements = deltas.filter((d) => d.improved === true && d.delta != null && Math.abs(d.delta) > 0);
  if (improvements.length > 0) {
    for (const d of improvements) {
      rawNarrative.push(`${d.label} moved from ${d.baseline} to ${d.followUp} over this window - a change worth noting.`);
    }
  } else if (rows.length > 0) {
    rawNarrative.push("No clear change in your tracked signals over this window yet. Nutrition changes often take time to show up.");
  } else {
    rawNarrative.push("Not enough check-in history yet to compare. Keep logging to track how things shift.");
  }
  const { lines } = applyNutritionGuardrails(rawNarrative);

  return { windowStart, windowEnd, deltas, narrative: lines };
}
