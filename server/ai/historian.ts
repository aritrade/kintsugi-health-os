import type { SupabaseClient } from "@supabase/supabase-js";
import type { IndexKind } from "@/types";
import { scanStatement, NON_DIAGNOSTIC_DISCLAIMER } from "@/ai/guardrails";
import { getIndexTrend } from "@/server/indices/trends";
import { INDEX_LABELS } from "@/lib/index-labels";

export interface HistorianNarrative {
  generatedAt: string;
  paragraphs: string[];
  disclaimers: string[];
}

const TRENDED: IndexKind[] = ["sleep_score", "recovery_score", "libido", "body_composition", "bp_control"];

// Health Historian (docs/13 §2.3): deterministic narrative reconstruction from the
// user's own data. Possibility/factual language only; every line passes guardrails.
export async function buildHistorianNarrative(
  supabase: SupabaseClient,
  userId: string,
): Promise<HistorianNarrative> {
  const lines: string[] = [];

  const { data: firstCheckin } = await supabase
    .from("checkins")
    .select("checkin_date")
    .eq("user_id", userId)
    .order("checkin_date", { ascending: true })
    .limit(1)
    .maybeSingle();
  const { count: checkinCount } = await supabase
    .from("checkins")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  if (firstCheckin && checkinCount) {
    const start = firstCheckin.checkin_date as string;
    const days = Math.max(1, Math.round((Date.now() - new Date(start).getTime()) / 86400000));
    lines.push(`Since ${start}, across about ${days} days, you have logged ${checkinCount} check-ins.`);
  } else {
    lines.push("Your history is just beginning. Keep logging check-ins to build a richer story.");
  }

  for (const kind of TRENDED) {
    const t = await getIndexTrend(supabase, userId, kind);
    if (!t.hasBaseline || t.series.length < 2) continue;
    const first = t.series[0].avg;
    const last = t.series[t.series.length - 1].avg;
    if (first === 0) continue;
    const change = Math.round(((last - first) / Math.abs(first)) * 100);
    const dir = change > 0 ? "increased" : change < 0 ? "decreased" : "held steady";
    lines.push(`Your ${INDEX_LABELS[kind]} ${dir} from ${first} to ${last} (${change >= 0 ? "+" : ""}${change}%).`);
  }

  const { count: experimentsDone } = await supabase
    .from("experiments")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "completed");
  if (experimentsDone && experimentsDone > 0) {
    lines.push(`You completed ${experimentsDone} experiment${experimentsDone === 1 ? "" : "s"} to test your own questions.`);
  }

  const { data: timeline } = await supabase
    .from("timeline_events")
    .select("category")
    .eq("user_id", userId)
    .limit(2000);
  if (timeline && timeline.length > 0) {
    const byCat = new Map<string, number>();
    for (const e of timeline) byCat.set(e.category as string, (byCat.get(e.category as string) ?? 0) + 1);
    const top = [...byCat.entries()].sort((a, b) => b[1] - a[1])[0];
    if (top) lines.push(`Your timeline holds ${timeline.length} events, most often in the ${top[0].replace("_", " ")} area.`);
  }

  // Guardrail every line; drop anything unrecoverable.
  const paragraphs = lines
    .map((l) => scanStatement(l))
    .filter((r) => !r.blocked)
    .map((r) => r.text);

  return {
    generatedAt: new Date().toISOString(),
    paragraphs,
    disclaimers: [NON_DIAGNOSTIC_DISCLAIMER],
  };
}
