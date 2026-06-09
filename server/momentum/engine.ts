import type { SupabaseClient } from "@supabase/supabase-js";
import { trend, type DatedValue } from "@/server/detective/stats";
import { weightedAverage } from "@/packs/normalize";

// Health Momentum Engine (docs/25). A 0-100 progress score from four equally
// weighted components, stored as the `health_momentum` derived index. Counters
// progress against problem-tracking (anti-anxiety, Principle 5).

export interface MomentumComponents {
  consistency: number | null;
  physicalProgress: number | null;
  understanding: number | null;
  confidence: number | null;
}

export interface MomentumResult {
  score: number | null;
  components: MomentumComponents;
  inputs: Record<string, number>;
}

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));
// Map a percent change to 0-100 where 0% = 50 (neutral), +/-50% saturates.
const pctToScore = (pct: number) => clamp(50 + pct);

export async function computeMomentum(
  supabase: SupabaseClient,
  userId: string,
  windowDays = 30,
): Promise<MomentumResult> {
  const today = new Date();
  const windowStart = new Date(today.getTime() - windowDays * 86400000).toISOString().slice(0, 10);
  const todayStr = today.toISOString().slice(0, 10);

  // --- data pulls ---
  const { data: checkins } = await supabase
    .from("checkins")
    .select("checkin_date, confidence, anxiety")
    .eq("user_id", userId)
    .gte("checkin_date", windowStart)
    .order("checkin_date", { ascending: true });
  const checkinRows = checkins ?? [];

  const { count: totalCheckins } = await supabase
    .from("checkins")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  const { data: experiments } = await supabase
    .from("experiments")
    .select("status")
    .eq("user_id", userId);
  const expCompleted = (experiments ?? []).filter((e) => e.status === "completed").length;
  const expEngaged = (experiments ?? []).filter((e) => e.status !== "draft").length;

  const { data: insights } = await supabase
    .from("insights")
    .select("stage, is_positive")
    .eq("user_id", userId)
    .eq("status", "active");
  const correlationInsights = (insights ?? []).filter((i) => i.stage === "correlation").length;
  const positiveInsights = (insights ?? []).filter((i) => i.is_positive).length;
  const insightCount = (insights ?? []).length;

  const { data: indexRows } = await supabase
    .from("derived_indices")
    .select("index_kind, index_date, value")
    .eq("user_id", userId)
    .eq("index_slug", "default")
    .in("index_kind", ["sleep_score", "recovery_score"])
    .gte("index_date", windowStart)
    .order("index_date", { ascending: true });
  const idxSeries = (kind: string): DatedValue[] =>
    (indexRows ?? [])
      .filter((r) => r.index_kind === kind)
      .map((r) => ({ date: r.index_date as string, value: Number(r.value) }));

  // --- Consistency (25%) ---
  const distinctDays = new Set(checkinRows.map((r) => r.checkin_date as string)).size;
  const checkinRate = Math.min(1, distinctDays / windowDays) * 100;
  const expRate = expEngaged > 0 ? (expCompleted / expEngaged) * 100 : undefined;
  const consistency = weightedAverage([
    { value: checkinRate, weight: 0.7 },
    { value: expRate, weight: 0.3 },
  ]);

  // --- Physical Progress (25%) ---
  const physParts: number[] = [];
  for (const k of ["sleep_score", "recovery_score"]) {
    const s = idxSeries(k);
    const t = s.length >= 4 ? trend(s) : null;
    if (t) physParts.push(pctToScore(t.percentChange));
  }
  const physicalProgress = physParts.length ? Math.round(physParts.reduce((a, b) => a + b, 0) / physParts.length) : null;

  // --- Understanding (25%) ---
  const understandingRaw = insightCount * 10 + expCompleted * 25 + correlationInsights * 5;
  const understanding = insightCount === 0 && expCompleted === 0 ? null : Math.round(clamp(understandingRaw));

  // --- Confidence (25%) ---
  const confSeries: DatedValue[] = checkinRows
    .filter((r) => r.confidence != null)
    .map((r) => ({ date: r.checkin_date as string, value: Number(r.confidence) }));
  const anxSeries: DatedValue[] = checkinRows
    .filter((r) => r.anxiety != null)
    .map((r) => ({ date: r.checkin_date as string, value: Number(r.anxiety) }));
  const confT = confSeries.length >= 4 ? trend(confSeries) : null;
  const anxT = anxSeries.length >= 4 ? trend(anxSeries) : null;
  const confParts: number[] = [];
  if (confT) confParts.push(pctToScore(confT.percentChange));
  if (anxT) confParts.push(pctToScore(-anxT.percentChange)); // anxiety down is good
  let confidence: number | null = confParts.length
    ? Math.round(confParts.reduce((a, b) => a + b, 0) / confParts.length)
    : null;
  if (confidence != null) confidence = Math.round(clamp(confidence + Math.min(20, positiveInsights * 5)));

  const components: MomentumComponents = {
    consistency: consistency != null ? Math.round(consistency) : null,
    physicalProgress,
    understanding,
    confidence,
  };

  const score = weightedAverage([
    { value: components.consistency ?? undefined, weight: 0.25 },
    { value: components.physicalProgress ?? undefined, weight: 0.25 },
    { value: components.understanding ?? undefined, weight: 0.25 },
    { value: components.confidence ?? undefined, weight: 0.25 },
  ]);

  const inputs: Record<string, number> = {
    checkin_days: distinctDays,
    window_days: windowDays,
    experiments_completed: expCompleted,
    correlation_insights: correlationInsights,
    positive_insights: positiveInsights,
  };
  if (components.consistency != null) inputs.consistency = components.consistency;
  if (components.physicalProgress != null) inputs.physical_progress = components.physicalProgress;
  if (components.understanding != null) inputs.understanding = components.understanding;
  if (components.confidence != null) inputs.confidence = components.confidence;

  // Persist today's score (transparent + trended like other indices).
  if (score != null) {
    await supabase.from("derived_indices").upsert(
      {
        user_id: userId,
        index_kind: "health_momentum",
        index_slug: "default",
        index_date: todayStr,
        value: score,
        inputs,
      },
      { onConflict: "user_id,index_kind,index_slug,index_date" },
    );
  }

  await detectMomentumEvents(supabase, userId, {
    totalCheckins: totalCheckins ?? 0,
    expCompleted,
    correlationInsights,
    sleepTrendPct: (() => {
      const s = idxSeries("sleep_score");
      const t = s.length >= 4 ? trend(s) : null;
      return t?.percentChange ?? 0;
    })(),
  });

  return { score: score != null ? Math.round(score) : null, components, inputs };
}

interface EventSignals {
  totalCheckins: number;
  expCompleted: number;
  correlationInsights: number;
  sleepTrendPct: number;
}

// Inserts data-backed milestones once (deduped by type). Never inflated praise.
async function detectMomentumEvents(supabase: SupabaseClient, userId: string, s: EventSignals) {
  const candidates: { type: string; label: string; when: boolean; evidence: Record<string, unknown> }[] = [
    { type: "first_30_days", label: "Completed 30 days of check-ins.", when: s.totalCheckins >= 30, evidence: { metrics: ["checkins"], value: s.totalCheckins } },
    { type: "first_experiment", label: "Completed your first experiment.", when: s.expCompleted >= 1, evidence: { metrics: ["experiments"], value: s.expCompleted } },
    { type: "first_correlation", label: "Identified your first meaningful correlation.", when: s.correlationInsights >= 1, evidence: { metrics: ["correlations"], value: s.correlationInsights } },
    { type: "sleep_improved_10pct", label: "Improved your Sleep Score by 10%.", when: s.sleepTrendPct >= 10, evidence: { metrics: ["sleep_score"], value: Math.round(s.sleepTrendPct) } },
  ];
  for (const c of candidates) {
    if (!c.when) continue;
    const { data: existing } = await supabase
      .from("momentum_events")
      .select("id")
      .eq("user_id", userId)
      .eq("type", c.type)
      .maybeSingle();
    if (existing) continue;
    await supabase.from("momentum_events").insert({
      user_id: userId,
      type: c.type,
      label: c.label,
      evidence: c.evidence,
    });
  }
}
