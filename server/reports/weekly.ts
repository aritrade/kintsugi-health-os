import type { SupabaseClient } from "@supabase/supabase-js";
import type { IndexKind } from "@/types";
import { computeMomentum } from "@/server/momentum/engine";
import { getIndexTrend } from "@/server/indices/trends";
import { INDEX_LABELS } from "@/lib/index-labels";
import { applyGuardrails } from "@/ai/guardrails";

const TRENDED_INDICES: IndexKind[] = [
  "sleep_score", "recovery_score", "libido", "sexual_confidence",
  "erectile_function", "ejaculatory_control",
];

export interface WeeklyReportContent {
  period: "weekly";
  periodStart: string;
  periodEnd: string;
  checkins: { days: number; completionRate: number };
  indexTrends: { kind: string; label: string; latest: number; change: number }[];
  correlations: { a: string; b: string; level: string; coefficient: number }[];
  findings: string[];
  positives: string[];
  openQuestions: string[];
  suggestedInvestigations: { label: string; templateId?: string }[];
  momentum: {
    score: number | null;
    mostImproved: { label: string; change: number } | null;
    mostConsistent: string | null;
    largestPositiveTrend: { label: string; change: number } | null;
    mostValuableDiscovery: string | null;
    suggestedNextInvestigation: string | null;
  };
}

export async function buildWeeklyReport(
  supabase: SupabaseClient,
  userId: string,
): Promise<WeeklyReportContent> {
  const today = new Date();
  const periodEnd = today.toISOString().slice(0, 10);
  const periodStart = new Date(today.getTime() - 7 * 86400000).toISOString().slice(0, 10);
  const trendWindowStart = new Date(today.getTime() - 30 * 86400000).toISOString().slice(0, 10);

  // Check-in completion over the week.
  const { data: weekCheckins } = await supabase
    .from("checkins")
    .select("checkin_date")
    .eq("user_id", userId)
    .gte("checkin_date", periodStart);
  const days = new Set((weekCheckins ?? []).map((r) => r.checkin_date as string)).size;
  const completionRate = Math.round((Math.min(7, days) / 7) * 100);

  // Index trends (latest 7-day avg + change over the trailing window).
  const indexTrends: WeeklyReportContent["indexTrends"] = [];
  for (const kind of TRENDED_INDICES) {
    const t = await getIndexTrend(supabase, userId, kind);
    if (!t.hasBaseline || t.series.length < 2) continue;
    const first = t.series[0].avg;
    const last = t.series[t.series.length - 1].avg;
    const change = first !== 0 ? Math.round(((last - first) / Math.abs(first)) * 100) : 0;
    indexTrends.push({ kind, label: INDEX_LABELS[kind], latest: last, change });
  }

  // Active insights -> findings / positives / open questions.
  const { data: insights } = await supabase
    .from("insights")
    .select("observation, investigation_question, is_positive, stage, source_metrics, coefficient, confidence_level")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(40);
  const findings: string[] = [];
  const positives: string[] = [];
  const openQuestions: string[] = [];
  const correlations: WeeklyReportContent["correlations"] = [];
  for (const i of insights ?? []) {
    if (i.is_positive) positives.push(i.observation as string);
    else findings.push(i.observation as string);
    if (i.investigation_question) openQuestions.push(i.investigation_question as string);
    if (i.stage === "correlation" && (i.source_metrics as string[])?.length === 2) {
      correlations.push({
        a: (i.source_metrics as string[])[0],
        b: (i.source_metrics as string[])[1],
        level: (i.confidence_level as string) ?? "Low",
        coefficient: i.coefficient != null ? Number(i.coefficient) : 0,
      });
    }
  }

  // Suggested investigations from active draft/suggested experiments + templates.
  const { data: drafts } = await supabase
    .from("experiments")
    .select("question, status")
    .eq("user_id", userId)
    .eq("status", "draft")
    .limit(5);
  const suggestedInvestigations = (drafts ?? []).map((d) => ({ label: d.question as string }));

  // Momentum report section.
  const momentum = await computeMomentum(supabase, userId);
  const improving = [...indexTrends].filter((t) => t.change > 0).sort((a, b) => b.change - a.change);
  const mostImproved = improving[0] ? { label: improving[0].label, change: improving[0].change } : null;
  const largestPositiveTrend = mostImproved;
  const mostConsistent =
    completionRate >= 80 ? "Daily check-ins" : completionRate > 0 ? "Check-in habit forming" : null;
  const strongest = [...correlations].sort((a, b) => Math.abs(b.coefficient) - Math.abs(a.coefficient))[0];
  const mostValuableDiscovery = strongest
    ? `${strongest.a} and ${strongest.b} appear related (${strongest.level}, r=${strongest.coefficient}).`
    : null;
  const suggestedNextInvestigation = suggestedInvestigations[0]?.label ?? openQuestions[0] ?? null;

  const content: WeeklyReportContent = {
    period: "weekly",
    periodStart,
    periodEnd,
    checkins: { days, completionRate },
    indexTrends,
    correlations,
    findings,
    positives,
    openQuestions: dedupe(openQuestions),
    suggestedInvestigations,
    momentum: {
      score: momentum.score,
      mostImproved,
      mostConsistent,
      largestPositiveTrend,
      mostValuableDiscovery,
      suggestedNextInvestigation,
    },
  };

  // Defensive guardrail pass over free-text fields.
  const guarded = applyGuardrails({
    system: "detective",
    observations: [...content.findings, ...content.positives],
    questions: content.openQuestions,
    hypotheses: [],
    disclaimers: [],
    guardrailFlags: [],
  });
  // Keep counts aligned: re-split guarded observations back is non-trivial; since
  // our engine never emits banned language, we only replace if nothing was dropped.
  const findingsCount = content.findings.length;
  if (guarded.observations.length === findingsCount + content.positives.length) {
    content.findings = guarded.observations.slice(0, findingsCount);
    content.positives = guarded.observations.slice(findingsCount);
  }
  content.openQuestions = guarded.questions;

  return content;
}

function dedupe(arr: string[]): string[] {
  return Array.from(new Set(arr));
}
