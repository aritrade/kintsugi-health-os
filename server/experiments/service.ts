import type { SupabaseClient } from "@supabase/supabase-js";
import type { Experiment, IndexKind } from "@/types";
import { getTemplate } from "@/server/experiments/templates";

const INDEX_KEYS = new Set<string>([
  "libido", "sexual_confidence", "erectile_function", "ejaculatory_control",
  "sleep_score", "recovery_score", "health_momentum",
]);

export function mapExperiment(r: Record<string, unknown>): Experiment {
  return {
    id: r.id as string,
    question: r.question as string,
    hypothesis: r.hypothesis as string,
    variables: (r.variables as Record<string, unknown>) ?? {},
    metrics: (r.metrics as string[]) ?? [],
    durationDays: r.duration_days as number,
    successCriteria: (r.success_criteria as string) ?? undefined,
    status: r.status as Experiment["status"],
    startedAt: (r.started_at as string) ?? undefined,
    endedAt: (r.ended_at as string) ?? undefined,
    results: (r.results as Record<string, unknown>) ?? undefined,
    conclusion: (r.conclusion as string) ?? undefined,
    confidence: r.confidence != null ? Number(r.confidence) : undefined,
    createdAt: r.created_at as string,
  };
}

export interface CreateExperimentInput {
  templateId?: string;
  question?: string;
  hypothesis?: string;
  variables?: Record<string, unknown>;
  metrics?: string[];
  durationDays?: number;
  successCriteria?: string;
}

export async function createExperiment(
  supabase: SupabaseClient,
  userId: string,
  input: CreateExperimentInput,
): Promise<Experiment> {
  const tpl = input.templateId ? getTemplate(input.templateId) : undefined;
  const row = {
    user_id: userId,
    question: input.question ?? tpl?.question ?? "Untitled investigation",
    hypothesis: input.hypothesis ?? tpl?.hypothesis ?? "",
    variables: input.variables ?? tpl?.variables ?? {},
    metrics: input.metrics ?? tpl?.metrics ?? [],
    duration_days: input.durationDays ?? tpl?.durationDays ?? 14,
    success_criteria: input.successCriteria ?? tpl?.successCriteria ?? null,
    status: "draft" as const,
  };
  const { data, error } = await supabase.from("experiments").insert(row).select().single();
  if (error) throw error;
  return mapExperiment(data);
}

export type ExperimentAction = "start" | "complete" | "abandon";

export async function transitionExperiment(
  supabase: SupabaseClient,
  userId: string,
  id: string,
  action: ExperimentAction,
): Promise<Experiment | null> {
  const today = new Date().toISOString().slice(0, 10);
  const patch: Record<string, unknown> =
    action === "start"
      ? { status: "active", started_at: today }
      : action === "complete"
        ? { status: "completed", ended_at: today }
        : { status: "abandoned", ended_at: today };

  const { data, error } = await supabase
    .from("experiments")
    .update(patch)
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .maybeSingle();
  if (error) throw error;
  return data ? mapExperiment(data) : null;
}

// Fetch a metric's daily mean series over [from, to]. Indices come from
// derived_indices; everything else from the checkins table.
async function metricSeries(
  supabase: SupabaseClient,
  userId: string,
  metric: string,
  from: string,
  to: string,
): Promise<number[]> {
  if (INDEX_KEYS.has(metric)) {
    const { data } = await supabase
      .from("derived_indices")
      .select("value")
      .eq("user_id", userId)
      .eq("index_kind", metric as IndexKind)
      .eq("index_slug", "default")
      .gte("index_date", from)
      .lte("index_date", to);
    return (data ?? []).map((r) => Number(r.value));
  }
  const { data } = await supabase
    .from("checkins")
    .select(metric)
    .eq("user_id", userId)
    .gte("checkin_date", from)
    .lte("checkin_date", to);
  return (data ?? [])
    .map((r) => (r as unknown as Record<string, unknown>)[metric])
    .filter((v): v is number => typeof v === "number");
}

const mean = (arr: number[]) => (arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : null);

// Deterministic outcome analysis: compares the primary metric during the
// experiment window to an equal-length baseline immediately before it.
// Findings use possibility language only; never diagnostic (docs/19).
export async function analyzeExperiment(
  supabase: SupabaseClient,
  userId: string,
  id: string,
): Promise<Experiment | null> {
  const { data: row } = await supabase
    .from("experiments")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  if (!row) return null;
  const exp = mapExperiment(row);

  const startedAt = exp.startedAt ?? new Date().toISOString().slice(0, 10);
  const endedAt = exp.endedAt ?? new Date().toISOString().slice(0, 10);
  const dur = exp.durationDays || 14;
  const baselineEnd = new Date(new Date(startedAt).getTime() - 86400000).toISOString().slice(0, 10);
  const baselineStart = new Date(new Date(startedAt).getTime() - dur * 86400000).toISOString().slice(0, 10);

  const primary = exp.metrics.find((m) => m !== "exercised") ?? exp.metrics[0];
  let conclusion: string;
  let confidence = 0;
  const results: Record<string, unknown> = { primaryMetric: primary };

  if (!primary) {
    conclusion = "No tracked metric was set for this experiment, so no comparison could be made.";
  } else {
    const during = await metricSeries(supabase, userId, primary, startedAt, endedAt);
    const baseline = await metricSeries(supabase, userId, primary, baselineStart, baselineEnd);
    const dM = mean(during);
    const bM = mean(baseline);
    results.duringMean = dM != null ? Math.round(dM * 100) / 100 : null;
    results.baselineMean = bM != null ? Math.round(bM * 100) / 100 : null;
    results.duringN = during.length;
    results.baselineN = baseline.length;

    if (dM == null || bM == null || during.length < 3 || baseline.length < 3) {
      conclusion =
        "Not enough data to compare this period to your baseline yet. Keep logging and re-analyze later.";
    } else {
      const delta = dM - bM;
      const pct = bM !== 0 ? Math.round((delta / Math.abs(bM)) * 100) : 0;
      // Confidence scales with how much data backs the comparison (capped).
      confidence = Math.min(0.8, (Math.min(during.length, baseline.length) / dur) * 0.8);
      const dirWord = delta > 0 ? "higher" : delta < 0 ? "lower" : "about the same";
      results.delta = Math.round(delta * 100) / 100;
      results.percentChange = pct;
      if (Math.abs(pct) < 5) {
        conclusion = `During this experiment, ${labelFor(primary)} was about the same as your baseline (${results.duringMean} vs ${results.baselineMean}). This change does not appear meaningful for you.`;
      } else {
        conclusion = `During this experiment, ${labelFor(primary)} was ${dirWord} than your baseline (${results.duringMean} vs ${results.baselineMean}, ${Math.abs(pct)}% difference). This may be worth investigating further; it is an observation, not proof of cause.`;
      }
    }
  }

  const { data: updated, error } = await supabase
    .from("experiments")
    .update({
      results,
      conclusion,
      confidence,
      status: exp.status === "active" ? "completed" : exp.status,
      ended_at: exp.endedAt ?? new Date().toISOString().slice(0, 10),
    })
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single();
  if (error) throw error;
  return mapExperiment(updated);
}

function labelFor(metric: string): string {
  const labels: Record<string, string> = {
    libido: "your Libido Index",
    sleep_score: "your Sleep Score",
    recovery_score: "your Recovery Score",
    sleep_quality: "your sleep quality",
    energy: "your energy",
    mood: "your mood",
    caffeine_mg: "your caffeine intake",
    alcohol_units: "your alcohol intake",
  };
  return labels[metric] ?? metric;
}
