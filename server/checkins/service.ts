import type { SupabaseClient } from "@supabase/supabase-js";
import type { BiologicalSex, DerivedIndex } from "@/types";
import type { CheckinCore, CheckinPayload } from "@/types/checkin";
import { getPack } from "@/packs/registry";
import { getActivePackMetrics } from "@/server/packs/active";
import { BASELINE_MIN_OBSERVATIONS } from "@/packs/normalize";
import { computeMomentum } from "@/server/momentum/engine";
import { checkinToCanonical } from "@/server/canonical/from-checkin";
import { ingestCanonical } from "@/server/canonical/ingest";

// Maps the camelCase payload to the snake_case `checkins` columns.
const CORE_COLUMN_MAP: Record<string, string> = {
  bedtime: "bedtime",
  wakeTime: "wake_time",
  sleepDurationMin: "sleep_duration_min",
  sleepQuality: "sleep_quality",
  dryMouth: "dry_mouth",
  snoring: "snoring",
  nightAwakenings: "night_awakenings",
  energy: "energy",
  fatigue: "fatigue",
  recovery: "recovery",
  pain: "pain",
  mood: "mood",
  anxiety: "anxiety",
  stress: "stress",
  confidence: "confidence",
  ran: "ran",
  strengthTrained: "strength_trained",
  walked: "walked",
  steps: "steps",
  waterMl: "water_ml",
  alcoholUnits: "alcohol_units",
  nicotine: "nicotine",
  caffeineMg: "caffeine_mg",
};

// Reverse of CORE_COLUMN_MAP: maps a fetched snake_case checkins row to CheckinCore.
function mapCoreRow(row: Record<string, unknown>): CheckinCore {
  const core: Record<string, unknown> = {};
  for (const [key, column] of Object.entries(CORE_COLUMN_MAP)) {
    const v = row[column];
    if (v !== undefined && v !== null) core[key] = v;
  }
  return core as CheckinCore;
}

export interface SaveCheckinResult {
  checkin: Record<string, unknown>;
  recomputedIndices: DerivedIndex[];
}

export async function saveCheckin(
  supabase: SupabaseClient,
  userId: string,
  date: string,
  biologicalSex: BiologicalSex,
  payload: CheckinPayload,
): Promise<SaveCheckinResult> {
  const row: Record<string, unknown> = {
    user_id: userId,
    checkin_date: date,
    is_complete: payload.isComplete ?? false,
  };
  for (const [key, column] of Object.entries(CORE_COLUMN_MAP)) {
    const value = (payload as Record<string, unknown>)[key];
    if (value !== undefined) row[column] = value;
  }

  const { data: checkin, error } = await supabase
    .from("checkins")
    .upsert(row, { onConflict: "user_id,checkin_date" })
    .select()
    .single();
  if (error) throw error;

  const checkinId = checkin.id as string;

  // Upsert pack metric entries (idempotent per user/metric/date).
  if (payload.packMetrics && payload.packMetrics.length > 0) {
    const entries = payload.packMetrics
      .filter((m) => m.valueNum != null || m.valueBool != null || m.valueText != null)
      .map((m) => ({
        user_id: userId,
        metric_id: m.metricId,
        checkin_id: checkinId,
        entry_date: date,
        value_num: m.valueNum ?? null,
        value_bool: m.valueBool ?? null,
        value_text: m.valueText ?? null,
      }));
    if (entries.length > 0) {
      const { error: meError } = await supabase
        .from("pack_metric_entries")
        .upsert(entries, { onConflict: "user_id,metric_id,entry_date" });
      if (meError) throw meError;
    }
  }

  // Mirror manual fields into the canonical metric layer (Level C, docs/22 §5)
  // so manual and device data are interchangeable inputs. Best-effort.
  try {
    const canonical = checkinToCanonical(payload, date);
    if (canonical.length > 0) await ingestCanonical(supabase, userId, canonical);
  } catch {
    // non-critical
  }

  const recomputedIndices = await recomputeIndicesForDate(supabase, userId, date, biologicalSex);
  // Momentum recompute runs alongside index recomputation (docs/25 section 7).
  // Best-effort: a momentum failure must never block a check-in save.
  try {
    await computeMomentum(supabase, userId);
  } catch {
    // swallow - momentum is non-critical to capture
  }
  return { checkin, recomputedIndices };
}

// Recomputes derived indices for the active packs on a given date, from that
// day's pack metric entries. Index formulas live in the pack definitions
// (docs/20-index-formulas.md). Display gating (>= 7 observations) is applied by callers.
export async function recomputeIndicesForDate(
  supabase: SupabaseClient,
  userId: string,
  date: string,
  biologicalSex: BiologicalSex,
): Promise<DerivedIndex[]> {
  const activePacks = await getActivePackMetrics(supabase, biologicalSex);
  const metricIdToSlug = new Map<string, string>();
  for (const p of activePacks) for (const m of p.metrics) metricIdToSlug.set(m.metricId, m.slug);

  const { data: entries, error } = await supabase
    .from("pack_metric_entries")
    .select("metric_id, value_num, value_bool")
    .eq("entry_date", date);
  if (error) throw error;

  const metricEntries = (entries ?? []).map((e) => ({
    metricSlug: metricIdToSlug.get(e.metric_id as string) ?? "",
    valueNum: e.value_num ?? undefined,
    valueBool: e.value_bool ?? undefined,
  }));

  // Load the day's core check-in - several indices (Sleep, Recovery, Confidence)
  // are computed from these fields, not from pack metric entries.
  const { data: coreRow } = await supabase
    .from("checkins")
    .select(Object.values(CORE_COLUMN_MAP).join(", "))
    .eq("user_id", userId)
    .eq("checkin_date", date)
    .maybeSingle();
  const core: CheckinCore | null = coreRow ? mapCoreRow(coreRow as unknown as Record<string, unknown>) : null;

  // Latest canonical metric value per key for the day (device/lab/manual), so
  // body/BP/activity indices can prefer measured data (docs/22).
  const { data: canonRows } = await supabase
    .from("canonical_metric_values")
    .select("metric, value, captured_at")
    .eq("user_id", userId)
    .gte("captured_at", `${date}T00:00:00Z`)
    .lte("captured_at", `${date}T23:59:59Z`)
    .order("captured_at", { ascending: false });
  const canonical: Record<string, number> = {};
  for (const r of canonRows ?? []) {
    const key = r.metric as string;
    if (!(key in canonical)) canonical[key] = Number(r.value);
  }

  const computed: DerivedIndex[] = [];
  for (const pack of activePacks) {
    const def = getPack(pack.packSlug);
    if (!def) continue;
    const packSlugs = new Set(pack.metrics.map((m) => m.slug));
    const packEntries = metricEntries.filter((e) => packSlugs.has(e.metricSlug));

    for (const index of def.indices) {
      // Skip indices scoped to a different biological sex.
      if (index.sexScope && index.sexScope !== biologicalSex) continue;
      const value = index.compute({ metricEntries: packEntries, core, canonical, windowDays: 1 });
      if (value == null) continue; // too few inputs to compute
      const { data: saved, error: upErr } = await supabase
        .from("derived_indices")
        .upsert(
          {
            user_id: userId,
            index_kind: index.indexKind,
            index_slug: "default",
            index_date: date,
            value,
            inputs: {
              ...(core ?? {}),
              ...Object.fromEntries(packEntries.map((e) => [e.metricSlug, e.valueNum ?? e.valueBool])),
            },
          },
          { onConflict: "user_id,index_kind,index_slug,index_date" },
        )
        .select()
        .single();
      if (upErr) throw upErr;
      computed.push({
        id: saved.id,
        userId: saved.user_id,
        indexKind: saved.index_kind,
        indexSlug: saved.index_slug,
        indexDate: saved.index_date,
        value: Number(saved.value),
        inputs: saved.inputs ?? {},
      });
    }
  }
  return computed;
}

export { BASELINE_MIN_OBSERVATIONS };
