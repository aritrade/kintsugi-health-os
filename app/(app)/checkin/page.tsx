import { createClient } from "@/lib/supabase/server";
import { getActivePackMetrics } from "@/server/packs/active";
import { CheckinForm } from "@/components/checkin/checkin-form";
import type { BiologicalSex, PrivacyMode } from "@/types";
import type { CheckinCore } from "@/types/checkin";

function todayISO(): string {
  // Server runs in UTC; render the user's local date on the client label only.
  return new Date().toISOString().slice(0, 10);
}

const CORE_FROM_ROW: Record<keyof CheckinCore, string> = {
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

export default async function CheckinPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("biological_sex, privacy_mode")
    .eq("user_id", user!.id)
    .maybeSingle();

  const biologicalSex = (profile?.biological_sex ?? "prefer_not_to_say") as BiologicalSex;
  const privacyMode = (profile?.privacy_mode ?? "standard") as PrivacyMode;
  const date = todayISO();

  const activePacks = await getActivePackMetrics(supabase, biologicalSex);

  const { data: existing } = await supabase
    .from("checkins")
    .select("*")
    .eq("user_id", user!.id)
    .eq("checkin_date", date)
    .maybeSingle();

  const { data: existingMetrics } = await supabase
    .from("pack_metric_entries")
    .select("metric_id, value_num, value_bool")
    .eq("user_id", user!.id)
    .eq("entry_date", date);

  const initialCore: CheckinCore = {};
  if (existing) {
    for (const [k, col] of Object.entries(CORE_FROM_ROW)) {
      const val = existing[col];
      if (val !== null && val !== undefined) {
        (initialCore as Record<string, unknown>)[k] = typeof val === "string" && col.includes("time") ? val.slice(0, 5) : val;
      }
    }
  }

  const initialPackValues: Record<string, { valueNum?: number | null; valueBool?: boolean | null }> = {};
  for (const m of existingMetrics ?? []) {
    initialPackValues[m.metric_id as string] = {
      valueNum: m.value_num ?? null,
      valueBool: m.value_bool ?? null,
    };
  }

  const prettyDate = new Date(date + "T00:00:00").toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <CheckinForm
      date={date}
      prettyDate={prettyDate}
      privacyMode={privacyMode}
      activePacks={activePacks}
      initialCore={initialCore}
      initialPackValues={initialPackValues}
    />
  );
}
