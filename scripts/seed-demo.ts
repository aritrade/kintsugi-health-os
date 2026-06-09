/**
 * Seeds the shared public demo account with ~12 weeks of realistic, correlated
 * health data and runs every engine (indices, momentum, detective, graph,
 * experiments, reports, case). Idempotent: wipes the demo user's data and rebuilds.
 *
 * Run: npx tsx scripts/seed-demo.ts
 */
import { existsSync, readFileSync } from "node:fs";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { DEMO_EMAIL, DEMO_PASSWORD } from "@/lib/demo";
import { recomputeIndicesForDate } from "@/server/checkins/service";
import { computeMomentum } from "@/server/momentum/engine";
import { runDetectiveScan } from "@/server/detective/engine";
import { rebuildGraph } from "@/server/graph/build";
import { buildReport } from "@/server/reports/weekly";
import { buildCaseContent } from "@/server/cases/build";
import { ingestCanonical } from "@/server/canonical/ingest";
import type { CanonicalMetricValue } from "@/types/canonical";

function loadEnv() {
  const candidates = [process.env.E2E_ENV_FILE, ".env.local", "/tmp/kintsugi.env"].filter(Boolean) as string[];
  for (const path of candidates) {
    if (!existsSync(path)) continue;
    for (const line of readFileSync(path, "utf8").split("\n")) {
      const m = line.match(/^([A-Za-z0-9_]+)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
    }
  }
}
loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const N = 84; // days of history

// --- helpers -------------------------------------------------------------
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const ri = (n: number) => Math.round(n);
function wob(i: number, amp: number, phase = 0) {
  return Math.sin(i * 0.7 + phase) * amp;
}
function dateOf(daysAgo: number) {
  return new Date(Date.now() - daysAgo * 86400000).toISOString().slice(0, 10);
}

// Progress 0..1 over the window (older -> newer), i = 0 oldest.
function model(i: number) {
  const p = i / (N - 1);
  const scale = (base: number, span: number, amp: number, phase = 0) =>
    clamp(ri(base + span * p + wob(i, amp, phase)), 1, 10);
  const alcohol = clamp(ri(3 - 3 * p + wob(i, 0.8, 1)), 0, 6);
  return {
    // core scales
    sleep_quality: scale(4, 4, 0.7),
    energy: scale(4, 3.5, 0.7, 1),
    recovery: scale(4, 3.5, 0.6, 2),
    mood: scale(5, 3, 0.6, 0.5),
    anxiety: scale(7, -4, 0.7, 1.5),
    stress: scale(6, -3, 0.6, 2.5),
    confidence: scale(4, 4, 0.5, 0.3),
    fatigue: scale(7, -3.5, 0.6, 1.2),
    pain: clamp(ri(3 - 1 * p + wob(i, 0.6, 2)), 1, 10),
    // sleep / lifestyle
    sleep_duration_min: clamp(ri(360 + 110 * p + wob(i, 25, 1)), 300, 540),
    night_awakenings: clamp(ri(3 - 2 * p + wob(i, 0.6)), 0, 5),
    dry_mouth: p < 0.35 && i % 3 === 0,
    snoring: p < 0.4 && i % 4 === 0,
    alcohol_units: alcohol,
    caffeine_mg: clamp(ri(220 + wob(i, 40)), 0, 400),
    ran: p > 0.4 && i % 2 === 0,
    strength_trained: p > 0.5 && i % 3 === 0,
    walked: i % 5 !== 0,
    steps: clamp(ri(5000 + 5500 * p + wob(i, 1200)), 1500, 16000),
    nicotine: false,
    water_ml: clamp(ri(1500 + 1000 * p + wob(i, 150)), 800, 3500),
    // pack metrics (sexual health)
    libido_desire: scale(3, 5, 0.7, 0.8),
    libido_thoughts: scale(3, 5, 0.7, 1.1),
    libido_attraction: scale(4, 4, 0.6, 1.4),
    libido_satisfaction: scale(3, 5, 0.6, 0.9),
    morning_erection: Math.random() < 0.3 + 0.5 * p,
    spontaneous_erection: Math.random() < 0.25 + 0.5 * p,
    erection_quality: scale(4, 4, 0.6, 0.7),
    erection_duration: clamp(ri(5 + 8 * p + wob(i, 1.5)), 2, 20),
    erectile_confidence: scale(4, 4, 0.5, 0.5),
    ejac_control: scale(4, 3, 0.6, 1.3),
    ejac_latency: clamp(ri(3 + 3 * p + wob(i, 0.8)), 1, 12),
    ejac_satisfaction: scale(5, 3, 0.5, 0.6),
    // weight / body
    weight_kg: clamp(ri(88 - 6 * p + wob(i, 0.4)), 78, 92),
    waist_cm: clamp(ri(96 - 8 * p + wob(i, 0.5)), 84, 100),
    body_fat_pct: clamp(ri(24 - 5 * p + wob(i, 0.4)), 16, 28),
    // hypertension
    systolic: clamp(ri(132 - 12 * p + wob(i, 3)), 108, 145),
    diastolic: clamp(ri(86 - 8 * p + wob(i, 2)), 66, 95),
    high_sodium_day: i % 4 === 0,
    // mental health
    mh_mood: scale(5, 3, 0.6, 0.5),
    mh_anxiety: scale(7, -4, 0.7, 1.5),
    mh_motivation: scale(4, 4, 0.6, 0.9),
    mh_social: scale(5, 3, 0.6, 1.7),
    mh_intrusive: scale(6, -3, 0.6, 2.1),
    // longevity
    exercise_minutes: clamp(ri(10 + 45 * p + wob(i, 10)), 0, 120),
    resting_hr: clamp(ri(64 - 8 * p + wob(i, 2)), 48, 72),
  };
}

async function wipe(sb: SupabaseClient, userId: string) {
  const tables = [
    "pack_metric_entries",
    "checkins",
    "derived_indices",
    "insights",
    "correlations",
    "experiments",
    "reports",
    "cases",
    "timeline_events",
    "lab_results",
    "canonical_metric_values",
    "momentum_events",
    "graph_edges",
    "graph_nodes",
    "integration_connections",
  ];
  for (const t of tables) await sb.from(t).delete().eq("user_id", userId);
}

async function main() {
  const auth = createClient(url, anon);
  let session = (await auth.auth.signInWithPassword({ email: DEMO_EMAIL, password: DEMO_PASSWORD })).data.session;
  if (!session) {
    const su = await auth.auth.signUp({ email: DEMO_EMAIL, password: DEMO_PASSWORD });
    if (su.error) throw su.error;
    session = su.data.session;
    if (!session) {
      session = (await auth.auth.signInWithPassword({ email: DEMO_EMAIL, password: DEMO_PASSWORD })).data.session;
    }
  }
  if (!session) throw new Error("Could not obtain demo session.");
  const userId = session.user.id;
  const sb = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${session.access_token}` } },
  });
  console.log(`[ok] demo user ${DEMO_EMAIL} (${userId})`);

  // Profile (persona P1: Arjun-style founder investigator, but broad packs active).
  await sb.from("profiles").upsert({
    user_id: userId,
    biological_sex: "male",
    date_of_birth: "1991-03-14",
    display_name: "Alex (Demo)",
    onboarding_completed: true,
    privacy_mode: "standard",
    region: "US",
  });

  await wipe(sb, userId);

  // Activate a broad set of packs to showcase breadth.
  const { data: defs } = await sb.from("pack_definitions").select("id, slug");
  const idBySlug = new Map((defs ?? []).map((d) => [d.slug as string, d.id as string]));
  const activeSlugs = ["sleep", "sexual-health", "weight", "hypertension", "mental-health", "longevity"];
  await sb.from("pack_activations").upsert(
    activeSlugs
      .map((s) => idBySlug.get(s))
      .filter(Boolean)
      .map((pack_id) => ({ user_id: userId, pack_id, activated_by: "system", is_enabled: true })),
    { onConflict: "user_id,pack_id" },
  );

  // Metric id lookup by metric slug.
  const { data: metricDefs } = await sb.from("pack_metric_definitions").select("id, slug");
  const metricId = new Map((metricDefs ?? []).map((m) => [m.slug as string, m.id as string]));

  // Seed check-ins + pack metric entries.
  const checkinRows: Record<string, unknown>[] = [];
  const entryRows: Record<string, unknown>[] = [];
  const PACK_NUM: [string, keyof ReturnType<typeof model>][] = [
    ["libido_desire", "libido_desire"], ["libido_thoughts", "libido_thoughts"],
    ["libido_attraction", "libido_attraction"], ["libido_satisfaction", "libido_satisfaction"],
    ["erection_quality", "erection_quality"], ["erection_duration", "erection_duration"],
    ["erectile_confidence", "erectile_confidence"], ["ejac_control", "ejac_control"],
    ["ejac_latency", "ejac_latency"], ["ejac_satisfaction", "ejac_satisfaction"],
    ["weight_kg", "weight_kg"], ["waist_cm", "waist_cm"], ["body_fat_pct", "body_fat_pct"],
    ["systolic", "systolic"], ["diastolic", "diastolic"],
    ["mh_mood", "mh_mood"], ["mh_anxiety", "mh_anxiety"], ["mh_motivation", "mh_motivation"],
    ["mh_social", "mh_social"], ["mh_intrusive", "mh_intrusive"],
    ["exercise_minutes", "exercise_minutes"], ["resting_hr", "resting_hr"],
  ];
  const PACK_BOOL: [string, keyof ReturnType<typeof model>][] = [
    ["morning_erection", "morning_erection"], ["spontaneous_erection", "spontaneous_erection"],
    ["high_sodium_day", "high_sodium_day"],
  ];

  for (let i = 0; i < N; i++) {
    const m = model(i);
    const date = dateOf(N - 1 - i);
    checkinRows.push({
      user_id: userId, checkin_date: date, is_complete: true,
      sleep_quality: m.sleep_quality, sleep_duration_min: m.sleep_duration_min,
      night_awakenings: m.night_awakenings, dry_mouth: m.dry_mouth, snoring: m.snoring,
      energy: m.energy, fatigue: m.fatigue, recovery: m.recovery, pain: m.pain,
      mood: m.mood, anxiety: m.anxiety, stress: m.stress, confidence: m.confidence,
      ran: m.ran, strength_trained: m.strength_trained, walked: m.walked, steps: m.steps,
      water_ml: m.water_ml, alcohol_units: m.alcohol_units, nicotine: m.nicotine, caffeine_mg: m.caffeine_mg,
    });
    for (const [slug, key] of PACK_NUM) {
      const id = metricId.get(slug);
      if (id) entryRows.push({ user_id: userId, metric_id: id, entry_date: date, value_num: m[key] as number });
    }
    for (const [slug, key] of PACK_BOOL) {
      const id = metricId.get(slug);
      if (id) entryRows.push({ user_id: userId, metric_id: id, entry_date: date, value_bool: m[key] as boolean });
    }
    // longevity booleans
    const alcoholFreeId = metricId.get("alcohol_free");
    if (alcoholFreeId) entryRows.push({ user_id: userId, metric_id: alcoholFreeId, entry_date: date, value_bool: m.alcohol_units === 0 });
    const wholeFoodsId = metricId.get("whole_foods");
    if (wholeFoodsId) entryRows.push({ user_id: userId, metric_id: wholeFoodsId, entry_date: date, value_bool: i % 3 !== 0 });
  }

  // Bulk insert in chunks.
  for (let k = 0; k < checkinRows.length; k += 200) {
    await sb.from("checkins").upsert(checkinRows.slice(k, k + 200), { onConflict: "user_id,checkin_date" });
  }
  for (let k = 0; k < entryRows.length; k += 500) {
    await sb.from("pack_metric_entries").insert(entryRows.slice(k, k + 500));
  }
  console.log(`[ok] seeded ${checkinRows.length} check-ins, ${entryRows.length} pack entries`);

  // Canonical (Oura-like) device data for the last 30 days + connection.
  await sb.from("integration_connections").insert({ user_id: userId, provider: "oura", status: "connected", scopes: ["daily"] });
  const canonical: CanonicalMetricValue[] = [];
  for (let i = N - 30; i < N; i++) {
    const m = model(i);
    const p = i / (N - 1);
    const at = `${dateOf(N - 1 - i)}T07:00:00Z`;
    canonical.push(
      { metric: "sleepDurationMinutes", value: m.sleep_duration_min, unit: "minutes", source: "oura", capturedAt: at, qualityLevel: "A" },
      { metric: "recoveryScore", value: clamp(ri(50 + 35 * p + wob(i, 6)), 20, 99), unit: "score", source: "oura", capturedAt: at, qualityLevel: "A" },
      { metric: "heartRateVariability", value: clamp(ri(42 + 28 * p + wob(i, 6)), 20, 110), unit: "ms", source: "oura", capturedAt: at, qualityLevel: "A" },
      { metric: "restingHeartRate", value: m.resting_hr, unit: "bpm", source: "oura", capturedAt: at, qualityLevel: "A" },
    );
  }
  await ingestCanonical(sb, userId, canonical);
  console.log(`[ok] ingested ${canonical.length} canonical (Oura) values`);

  // Recompute indices for every day.
  for (let i = 0; i < N; i++) {
    await recomputeIndicesForDate(sb, userId, dateOf(N - 1 - i), "male");
  }
  console.log("[ok] recomputed indices");

  await computeMomentum(sb, userId);
  const scan = await runDetectiveScan(sb, userId, 84);
  console.log(`[ok] detective: ${scan.response.observations.length} observations`);
  const graph = await rebuildGraph(sb, userId);
  console.log(`[ok] graph: ${graph.nodes.length} nodes, ${graph.edges.length} edges`);

  // Timeline events (give the Historian + timeline something to narrate).
  await sb.from("timeline_events").insert([
    { user_id: userId, life_stage: "adult", title: "Started tracking with Kintsugi", description: "Began daily check-ins.", category: "health", subcategory: "milestone", event_date: dateOf(N - 1), source: "user" },
    { user_id: userId, life_stage: "adult", title: "Began a running routine", description: "Started running 3x/week.", category: "fitness", subcategory: "exercise", event_date: dateOf(Math.round(N * 0.5)), source: "user" },
    { user_id: userId, life_stage: "adult", title: "Cut back on alcohol", description: "Reduced evening drinks.", category: "lifestyle", subcategory: "alcohol", event_date: dateOf(Math.round(N * 0.45)), source: "user" },
    { user_id: userId, life_stage: "adult", title: "Blood panel taken", description: "Fasting labs at clinic.", category: "labs", subcategory: "panel", event_date: dateOf(20), source: "user" },
  ]);

  // Labs (one slightly out of range to showcase status + appointment prep).
  const { data: biomarkers } = await sb.from("biomarkers").select("id, slug, unit, default_ref_low, default_ref_high");
  const bm = new Map((biomarkers ?? []).map((b) => [b.slug as string, b]));
  const labRows: Record<string, unknown>[] = [];
  const addLab = (slug: string, value: number, date: string) => {
    const b = bm.get(slug);
    if (!b) return;
    labRows.push({
      user_id: userId, biomarker_id: b.id, value, unit: b.unit,
      ref_low: b.default_ref_low, ref_high: b.default_ref_high, result_date: date, sensitivity: "sensitive",
    });
  };
  addLab("vitamin_d", 22, dateOf(60)); addLab("vitamin_d", 34, dateOf(20)); // low -> normal
  addLab("testosterone_total", 420, dateOf(60)); addLab("testosterone_total", 560, dateOf(20));
  addLab("hba1c", 5.7, dateOf(60)); addLab("hba1c", 5.3, dateOf(20));
  addLab("ldl", 138, dateOf(20)); addLab("tsh", 2.1, dateOf(20));
  await sb.from("lab_results").insert(labRows);
  console.log(`[ok] timeline + ${labRows.length} labs`);

  // Experiments: one completed (positive), one active.
  const sleepPackId = idBySlug.get("sleep");
  await sb.from("experiments").insert([
    {
      user_id: userId, pack_id: sleepPackId,
      question: "Does cutting alcohol improve my sleep quality?",
      hypothesis: "Alcohol-free evenings may be associated with higher sleep quality.",
      variables: { intervention: "no_alcohol" }, metrics: ["sleep_quality"],
      duration_days: 21, success_criteria: "Sleep quality up >= 1 point on average",
      status: "completed", started_at: dateOf(50), ended_at: dateOf(29),
      results: { baselineAvg: 5.1, experimentAvg: 6.8, deltaPct: 33, n: 21 },
      conclusion: "During alcohol-free weeks, average sleep quality was higher than baseline.",
      confidence: 0.62,
    },
    {
      user_id: userId, pack_id: idBySlug.get("longevity"),
      question: "Does morning exercise raise my next-day libido?",
      hypothesis: "Exercise days may be associated with higher next-day desire.",
      variables: { intervention: "am_exercise" }, metrics: ["libido_desire"],
      duration_days: 14, success_criteria: "Libido up on exercise days",
      status: "active", started_at: dateOf(10),
    },
  ]);

  // Reports: weekly + monthly.
  for (const period of ["weekly", "monthly"] as const) {
    const content = await buildReport(sb, userId, period);
    await sb.from("reports").insert({
      user_id: userId, period, period_start: content.periodStart, period_end: content.periodEnd, content,
    });
  }

  // Case for a urologist.
  const caseContent = await buildCaseContent(sb, userId, "Urologist");
  await sb.from("cases").insert({
    user_id: userId, title: "Sexual Health & Sleep - Urology Prep", specialist: "Urologist", content: caseContent,
  });
  console.log("[ok] experiments + reports + case created");

  console.log("\nDEMO SEED COMPLETE");
}

main().catch((e) => {
  console.error("SEED FAILED:", e?.message ?? e);
  process.exit(1);
});
