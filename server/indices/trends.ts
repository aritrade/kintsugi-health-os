import type { SupabaseClient } from "@supabase/supabase-js";
import type { IndexKind } from "@/types";
import { BASELINE_MIN_OBSERVATIONS } from "@/packs/normalize";

export interface IndexTrendPoint {
  date: string;
  value: number; // raw daily index (0-100)
  avg: number; // 7-day rolling average (0-100), display value (docs/20 section 7)
}

export interface IndexTrend {
  kind: IndexKind;
  hasBaseline: boolean;
  observations: number;
  latest: number | null; // latest rolling-average value, once baseline is met
  series: IndexTrendPoint[];
}

// Builds the display series for one index kind: raw daily values plus the
// 7-day rolling average. Hidden until BASELINE_MIN_OBSERVATIONS data points
// exist (docs/20-index-formulas.md sections 6 & 7).
export async function getIndexTrend(
  supabase: SupabaseClient,
  userId: string,
  kind: IndexKind,
): Promise<IndexTrend> {
  const { data, error } = await supabase
    .from("derived_indices")
    .select("index_date, value")
    .eq("user_id", userId)
    .eq("index_kind", kind)
    .eq("index_slug", "default")
    .order("index_date", { ascending: true })
    .limit(180);
  if (error) throw error;

  const raw = (data ?? []).map((r) => ({ date: r.index_date as string, value: Number(r.value) }));
  const observations = raw.length;
  const hasBaseline = observations >= BASELINE_MIN_OBSERVATIONS;

  // 7-day rolling average over available days (window keyed by trailing 7 entries).
  const series: IndexTrendPoint[] = raw.map((point, i) => {
    const window = raw.slice(Math.max(0, i - 6), i + 1);
    const avg = window.reduce((s, p) => s + p.value, 0) / window.length;
    return { date: point.date, value: Math.round(point.value), avg: Math.round(avg) };
  });

  return {
    kind,
    hasBaseline,
    observations,
    latest: hasBaseline && series.length > 0 ? series[series.length - 1].avg : null,
    series: hasBaseline ? series : [],
  };
}
