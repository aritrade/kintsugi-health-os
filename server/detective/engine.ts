import type { SupabaseClient } from "@supabase/supabase-js";
import type { AiResponse, ConfidenceLevel, Hypothesis, SuggestedNextStep } from "@/types";
import { alignByDate, confidenceLevel, pearson, trend, type DatedValue } from "@/server/detective/stats";

// Minimum sample requirements (docs/19 section 4).
const MIN_FREQUENCY = 7;
const MIN_TREND = 14;
const MIN_CORRELATION = 21;

// Variable directionality: "up" = higher is better, "down" = lower is better.
type Direction = "up" | "down";

interface VarDef {
  key: string;
  label: string;
  direction: Direction;
}

const SCALE_VARS: VarDef[] = [
  { key: "sleep_quality", label: "sleep quality", direction: "up" },
  { key: "energy", label: "energy", direction: "up" },
  { key: "recovery", label: "recovery", direction: "up" },
  { key: "mood", label: "mood", direction: "up" },
  { key: "confidence", label: "confidence", direction: "up" },
  { key: "fatigue", label: "fatigue", direction: "down" },
  { key: "anxiety", label: "anxiety", direction: "down" },
  { key: "stress", label: "stress", direction: "down" },
  { key: "pain", label: "pain", direction: "down" },
];

const INDEX_VARS: VarDef[] = [
  { key: "sleep_score", label: "Sleep Score", direction: "up" },
  { key: "recovery_score", label: "Recovery Score", direction: "up" },
  { key: "libido", label: "Libido Index", direction: "up" },
  { key: "sexual_confidence", label: "Sexual Confidence", direction: "up" },
  { key: "erectile_function", label: "Erectile Function", direction: "up" },
  { key: "ejaculatory_control", label: "Ejaculatory Control", direction: "up" },
  { key: "body_composition", label: "Body Composition", direction: "up" },
  { key: "bp_control", label: "Blood Pressure Control", direction: "up" },
  { key: "thyroid_symptom_load", label: "Thyroid Symptom Load", direction: "down" },
  { key: "pcos_symptom_load", label: "PCOS Symptom Load", direction: "down" },
  { key: "menopause_symptom_load", label: "Menopause Symptom Load", direction: "down" },
  { key: "energy_stability", label: "Energy Stability", direction: "up" },
  { key: "mood_stability", label: "Mood Stability", direction: "up" },
  { key: "longevity_score", label: "Longevity Score", direction: "up" },
];

// Concern booleans (higher frequency is worth investigating) and positive ones.
const CONCERN_BOOLS: { key: string; label: string }[] = [
  { key: "dry_mouth", label: "Dry mouth" },
  { key: "snoring", label: "Snoring" },
  { key: "nicotine", label: "Nicotine use" },
];
const POSITIVE_BOOLS: { key: string; label: string }[] = [
  { key: "ran", label: "Running" },
  { key: "strength_trained", label: "Strength training" },
  { key: "walked", label: "Walking" },
];

// Curated correlation pairs (avoids p-hacking explosion). label + optional template.
// Full Root Cause set per docs/13 §2.4 (Sleep x Libido, Sleep x Recovery, Sleep x
// Erections, Weight x Confidence, Exercise x Libido, Anxiety x Symptoms, Recovery x
// Sexual Health, Waist/Body x Health Metrics).
const PAIRS: { a: string; b: string; templateId?: string }[] = [
  { a: "sleep_quality", b: "energy", templateId: "sleep-vs-energy" },
  { a: "sleep_quality", b: "mood" },
  { a: "sleep_quality", b: "libido" },
  { a: "sleep_score", b: "libido" },
  { a: "sleep_score", b: "recovery_score" },
  { a: "sleep_score", b: "erectile_function" },
  { a: "exercised", b: "libido", templateId: "exercise-vs-libido" },
  { a: "exercised", b: "recovery_score" },
  { a: "alcohol_units", b: "sleep_quality", templateId: "alcohol-vs-sleep" },
  { a: "alcohol_units", b: "recovery_score" },
  { a: "caffeine_mg", b: "sleep_quality", templateId: "caffeine-vs-sleep" },
  { a: "anxiety", b: "sleep_quality" },
  { a: "anxiety", b: "thyroid_symptom_load" },
  { a: "anxiety", b: "pain" },
  { a: "steps", b: "mood" },
  { a: "stress", b: "recovery_score" },
  { a: "recovery_score", b: "sexual_confidence" },
  { a: "body_composition", b: "confidence" },
  { a: "body_composition", b: "bp_control" },
  { a: "mood_stability", b: "energy_stability" },
];

const LABELS: Record<string, string> = {
  ...Object.fromEntries(SCALE_VARS.map((v) => [v.key, v.label])),
  ...Object.fromEntries(INDEX_VARS.map((v) => [v.key, v.label])),
  exercised: "exercise",
  alcohol_units: "alcohol intake",
  caffeine_mg: "caffeine intake",
  steps: "step count",
};

const CHECKIN_COLUMNS = [
  "checkin_date",
  "sleep_quality", "energy", "fatigue", "recovery", "pain",
  "mood", "anxiety", "stress", "confidence",
  "steps", "alcohol_units", "caffeine_mg",
  "dry_mouth", "snoring", "nicotine", "ran", "strength_trained", "walked",
];

interface BuiltObservation {
  text: string;
  isPositive: boolean;
  sourceMetrics: string[];
  sampleSize: number;
  windowStart: string;
  windowEnd: string;
  stage: "observation" | "pattern" | "correlation";
}

export interface DetectiveScan {
  response: AiResponse;
  windowStart: string;
  windowEnd: string;
}

export async function runDetectiveScan(
  supabase: SupabaseClient,
  userId: string,
  windowDays = 30,
): Promise<DetectiveScan> {
  const end = new Date();
  const start = new Date(end.getTime() - windowDays * 86400000);
  const windowEnd = end.toISOString().slice(0, 10);
  const windowStart = start.toISOString().slice(0, 10);

  const { data: checkins } = await supabase
    .from("checkins")
    .select(CHECKIN_COLUMNS.join(", "))
    .eq("user_id", userId)
    .gte("checkin_date", windowStart)
    .order("checkin_date", { ascending: true });
  const rows = (checkins ?? []) as unknown as Record<string, unknown>[];

  const { data: indexRows } = await supabase
    .from("derived_indices")
    .select("index_kind, index_date, value")
    .eq("user_id", userId)
    .eq("index_slug", "default")
    .gte("index_date", windowStart)
    .order("index_date", { ascending: true });

  // Build dated numeric series per variable key.
  const series: Record<string, DatedValue[]> = {};
  const pushVal = (key: string, date: string, value: number | null | undefined) => {
    if (value == null) return;
    (series[key] ??= []).push({ date, value: Number(value) });
  };
  for (const r of rows) {
    const d = r.checkin_date as string;
    for (const v of SCALE_VARS) pushVal(v.key, d, r[v.key] as number | null);
    pushVal("steps", d, r.steps as number | null);
    pushVal("alcohol_units", d, r.alcohol_units as number | null);
    pushVal("caffeine_mg", d, r.caffeine_mg as number | null);
    // exercised = ran OR strength_trained (1/0), only when at least one is recorded.
    const ran = r.ran as boolean | null;
    const st = r.strength_trained as boolean | null;
    if (ran != null || st != null) pushVal("exercised", d, ran || st ? 1 : 0);
  }
  for (const ir of indexRows ?? []) {
    pushVal(ir.index_kind as string, ir.index_date as string, ir.value as number);
  }

  const observations: BuiltObservation[] = [];
  const questions: string[] = [];
  const hypotheses: Hypothesis[] = [];
  const persistedCorrelations: {
    a: string; b: string; coefficient: number; level: ConfidenceLevel; n: number;
  }[] = [];

  // --- Frequency patterns (min 7) ---
  const boolFreq = (key: string): { count: number; total: number } | null => {
    const present = rows.filter((r) => r[key] != null);
    if (present.length < MIN_FREQUENCY) return null;
    return { count: present.filter((r) => r[key] === true).length, total: present.length };
  };
  for (const b of CONCERN_BOOLS) {
    const f = boolFreq(b.key);
    if (f && f.count / f.total >= 0.5) {
      observations.push({
        text: `${b.label} was reported on ${f.count} of the last ${f.total} days.`,
        isPositive: false,
        sourceMetrics: [b.key],
        sampleSize: f.total,
        windowStart, windowEnd,
        stage: "pattern",
      });
    }
  }
  for (const b of POSITIVE_BOOLS) {
    const f = boolFreq(b.key);
    if (f && f.count / f.total >= 0.4) {
      observations.push({
        text: `${b.label} was logged on ${f.count} of the last ${f.total} days.`,
        isPositive: true,
        sourceMetrics: [b.key],
        sampleSize: f.total,
        windowStart, windowEnd,
        stage: "pattern",
      });
    }
  }

  // --- Trends (min 14) ---
  for (const v of [...SCALE_VARS, ...INDEX_VARS]) {
    const s = series[v.key];
    if (!s || s.length < MIN_TREND) continue;
    const t = trend(s);
    if (!t || t.direction === "stable") continue;
    // "Improving" = movement in the good direction.
    const good = v.direction === "up" ? t.direction === "improving" : t.direction === "declining";
    const magnitude = Math.abs(t.percentChange);
    if (magnitude < 5) continue;
    const dirWord = t.direction === "improving" ? "increased" : "decreased";
    observations.push({
      text: `${cap(v.label)} ${dirWord} by ${magnitude}% over the last ${t.n} observations.`,
      isPositive: good,
      sourceMetrics: [v.key],
      sampleSize: t.n,
      windowStart, windowEnd,
      stage: "pattern",
    });
  }

  // --- Longitudinal regime changes (docs/14 §2.2) ---
  // With enough history, compare the first vs second half of the window. A large
  // shift in the mean is surfaced as a possibility-framed regime change.
  const MIN_LONGITUDINAL = 28;
  for (const v of [...INDEX_VARS, ...SCALE_VARS]) {
    const s = series[v.key];
    if (!s || s.length < MIN_LONGITUDINAL) continue;
    const mid = Math.floor(s.length / 2);
    const firstMean = mean(s.slice(0, mid).map((d) => d.value));
    const secondMean = mean(s.slice(mid).map((d) => d.value));
    if (firstMean === 0) continue;
    const shift = Math.round(((secondMean - firstMean) / Math.abs(firstMean)) * 100);
    if (Math.abs(shift) < 15) continue;
    const good = v.direction === "up" ? shift > 0 : shift < 0;
    const dirWord = shift > 0 ? "higher" : "lower";
    observations.push({
      text: `Over the longer term, your ${v.label} has settled ${Math.abs(shift)}% ${dirWord} than earlier in this window.`,
      isPositive: good,
      sourceMetrics: [v.key],
      sampleSize: s.length,
      windowStart, windowEnd,
      stage: "pattern",
    });
  }

  // --- Correlations (min 21) ---
  for (const pair of PAIRS) {
    const sa = series[pair.a];
    const sb = series[pair.b];
    if (!sa || !sb) continue;
    const { xs, ys } = alignByDate(sa, sb);
    if (xs.length < MIN_CORRELATION) continue;
    const coef = pearson(xs, ys);
    if (coef == null) continue;
    const level = confidenceLevel(coef);
    if (!level) continue; // |r| < 0.20 -> not surfaced

    const la = LABELS[pair.a] ?? pair.a;
    const lb = LABELS[pair.b] ?? pair.b;
    const dir = coef > 0 ? "higher" : "lower";
    persistedCorrelations.push({ a: pair.a, b: pair.b, coefficient: round2(coef), level, n: xs.length });

    // Adaptive experiment duration (docs/14 §2.2): sparser data => longer window.
    const adaptiveDuration = xs.length >= 40 ? 14 : xs.length >= 28 ? 21 : 28;
    const next: SuggestedNextStep = pair.templateId
      ? { type: "experiment", templateId: pair.templateId, durationDays: adaptiveDuration }
      : { type: "observation", label: "Keep logging to confirm this relationship." };

    hypotheses.push({
      statement: `Higher ${la} may be associated with ${dir} ${lb}.`,
      confidence: Math.abs(coef),
      supportingSignals: [pair.a, pair.b],
    });
    questions.push(`Would you like to investigate whether ${la} relates to ${lb}?`);
    observations.push({
      text: `${cap(la)} and ${lb} moved together over ${xs.length} days (${level.toLowerCase()} correlation, r=${round2(coef)}).`,
      isPositive: false,
      sourceMetrics: [pair.a, pair.b],
      sampleSize: xs.length,
      windowStart, windowEnd,
      stage: "correlation",
    });

    // Persist the correlation row (audit) and an insight below.
    await supabase.from("correlations").insert({
      user_id: userId,
      variable_a: pair.a,
      variable_b: pair.b,
      coefficient: round2(coef),
      confidence: Math.abs(coef),
      sample_size: xs.length,
      window_start: windowStart,
      window_end: windowEnd,
      hypothesis: `Higher ${la} may be associated with ${dir} ${lb}.`,
    });
    // Carry the suggested next step into the persisted insight.
    (pair as { _next?: SuggestedNextStep })._next = next;
  }

  // --- Contradiction handling (docs/19 section 6) ---
  const { data: priorInsights } = await supabase
    .from("insights")
    .select("id, source_metrics, stage")
    .eq("user_id", userId)
    .eq("status", "active")
    .eq("stage", "correlation");
  for (const prior of priorInsights ?? []) {
    const sm = (prior.source_metrics as string[]) ?? [];
    if (sm.length !== 2) continue;
    const stillPresent = persistedCorrelations.some(
      (c) => (c.a === sm[0] && c.b === sm[1]) || (c.a === sm[1] && c.b === sm[0]),
    );
    if (!stillPresent) {
      // Previously surfaced relationship no longer meets threshold.
      await supabase.from("insights").update({ status: "contradicted" }).eq("id", prior.id);
      observations.push({
        text: `An earlier relationship between ${LABELS[sm[0]] ?? sm[0]} and ${LABELS[sm[1]] ?? sm[1]} is no longer evident.`,
        isPositive: false,
        sourceMetrics: sm,
        sampleSize: 0,
        windowStart, windowEnd,
        stage: "correlation",
      });
    }
  }

  // --- Anti-anxiety balance (docs/19 section 10b) ---
  const hasConcern = observations.some((o) => !o.isPositive);
  const hasPositive = observations.some((o) => o.isPositive);
  if (hasConcern && !hasPositive) {
    // Find a genuine positive: best improving "up" metric trend not already shown.
    for (const v of [...INDEX_VARS, ...SCALE_VARS]) {
      const s = series[v.key];
      if (!s || s.length < MIN_TREND) continue;
      const t = trend(s);
      if (!t) continue;
      const good = v.direction === "up" ? t.percentChange > 5 : t.percentChange < -5;
      if (good) {
        const dirWord = t.direction === "improving" ? "increased" : "decreased";
        observations.push({
          text: `On a positive note, ${v.label} ${dirWord} by ${Math.abs(t.percentChange)}% over the last ${t.n} observations.`,
          isPositive: true,
          sourceMetrics: [v.key],
          sampleSize: t.n,
          windowStart, windowEnd,
          stage: "pattern",
        });
        break;
      }
    }
  }

  // --- Persist insights with full audit trace ---
  for (const o of observations) {
    let next: SuggestedNextStep = { type: "observation" };
    let coefficient: number | null = null;
    let level: string | null = null;
    if (o.stage === "correlation" && o.sourceMetrics.length === 2) {
      const c = persistedCorrelations.find(
        (pc) => pc.a === o.sourceMetrics[0] && pc.b === o.sourceMetrics[1],
      );
      if (c) {
        coefficient = c.coefficient;
        level = c.level;
        const pairDef = PAIRS.find((p) => p.a === c.a && p.b === c.b) as { _next?: SuggestedNextStep } | undefined;
        if (pairDef?._next) next = pairDef._next;
      }
    }
    await supabase.from("insights").insert({
      user_id: userId,
      stage: o.stage,
      status: "active",
      observation: o.text,
      investigation_question: o.stage === "correlation" ? questions[0] ?? null : null,
      suggested_next_step: next,
      source_metrics: o.sourceMetrics,
      sample_size: o.sampleSize || null,
      window_start: o.windowStart,
      window_end: o.windowEnd,
      confidence_level: level,
      coefficient,
      is_positive: o.isPositive,
    });
  }

  const response: AiResponse = {
    system: "detective",
    observations: observations.map((o) => o.text),
    questions: dedupe(questions),
    hypotheses,
    disclaimers: [],
    guardrailFlags: [],
  };

  return { response, windowStart, windowEnd };
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function mean(xs: number[]): number {
  return xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length;
}
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
function dedupe(arr: string[]): string[] {
  return Array.from(new Set(arr));
}
