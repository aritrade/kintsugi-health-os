import type { CanonicalMetricValue, IntegrationProvider, MetricAdapter } from "@/types/canonical";
import { CANONICAL_CATALOG } from "@/lib/canonical/catalog";

// Vendor -> canonical adapters (docs/22 section 5). Each maps a raw daily-summary
// payload into canonical values with units converted. Unknown fields are dropped,
// never guessed. All device data is quality Level A. Adapters are pure functions,
// so live OAuth sync only needs to fetch the payload and hand it here.

type Raw = Record<string, unknown>;

function num(v: unknown): number | undefined {
  const n = typeof v === "string" ? Number(v) : (v as number);
  return typeof n === "number" && Number.isFinite(n) ? n : undefined;
}

// Resolve a value from the first matching dotted/flat path.
function pick(raw: Raw, paths: string[]): number | undefined {
  for (const p of paths) {
    const parts = p.split(".");
    let cur: unknown = raw;
    for (const part of parts) {
      if (cur && typeof cur === "object" && part in (cur as Raw)) cur = (cur as Raw)[part];
      else {
        cur = undefined;
        break;
      }
    }
    const n = num(cur);
    if (n !== undefined) return n;
  }
  return undefined;
}

function build(
  source: string,
  capturedAt: string,
  entries: Array<{ metric: keyof typeof CANONICAL_CATALOG; value: number | undefined }>,
): CanonicalMetricValue[] {
  return entries
    .filter((e) => e.value !== undefined)
    .map((e) => ({
      metric: e.metric,
      value: e.value as number,
      unit: CANONICAL_CATALOG[e.metric].unit,
      source,
      capturedAt,
      qualityLevel: "A" as const,
    }));
}

function capturedAtOf(raw: Raw, fallbackKeys: string[] = ["day", "date", "timestamp", "summary_date"]): string {
  for (const k of fallbackKeys) {
    const v = raw[k];
    if (typeof v === "string" && v.length >= 10) {
      return v.length === 10 ? `${v}T12:00:00Z` : v;
    }
  }
  return new Date().toISOString();
}

// --- Oura (daily_sleep / daily_readiness / daily_activity) ---
const oura: MetricAdapter = {
  provider: "oura",
  toCanonical(rawIn) {
    const raw = (rawIn ?? {}) as Raw;
    const at = capturedAtOf(raw);
    const sleepSec = pick(raw, ["total_sleep_duration", "contributors.total_sleep_duration"]);
    return build("oura", at, [
      { metric: "sleepDurationMinutes", value: sleepSec !== undefined ? Math.round(sleepSec / 60) : undefined },
      { metric: "sleepEfficiency", value: pick(raw, ["efficiency", "sleep_efficiency"]) },
      { metric: "sleepQualityScore", value: pick(raw, ["score", "sleep_score"]) },
      { metric: "nightAwakenings", value: pick(raw, ["awake_count", "restless_periods"]) },
      { metric: "recoveryScore", value: pick(raw, ["readiness_score", "readiness.score"]) },
      { metric: "restingHeartRate", value: pick(raw, ["lowest_heart_rate", "resting_heart_rate", "hr_lowest"]) },
      { metric: "heartRateVariability", value: pick(raw, ["average_hrv", "rmssd", "hrv"]) },
      { metric: "bodyTemperature", value: pick(raw, ["temperature_deviation", "body_temperature"]) },
      { metric: "respiratoryRate", value: pick(raw, ["respiratory_rate", "breath_average"]) },
      { metric: "steps", value: pick(raw, ["steps"]) },
      { metric: "activeCalories", value: pick(raw, ["active_calories", "cal_active"]) },
    ]);
  },
};

// --- Whoop (recovery / sleep / cycle) ---
const whoop: MetricAdapter = {
  provider: "whoop",
  toCanonical(rawIn) {
    const raw = (rawIn ?? {}) as Raw;
    const at = capturedAtOf(raw, ["created_at", "start", "date"]);
    const sleepMs = pick(raw, ["score.stage_summary.total_in_bed_time_milli", "total_sleep_time_milli"]);
    return build("whoop", at, [
      { metric: "sleepDurationMinutes", value: sleepMs !== undefined ? Math.round(sleepMs / 60000) : undefined },
      { metric: "sleepEfficiency", value: pick(raw, ["score.sleep_efficiency_percentage", "sleep_efficiency"]) },
      { metric: "recoveryScore", value: pick(raw, ["score.recovery_score", "recovery_score"]) },
      { metric: "restingHeartRate", value: pick(raw, ["score.resting_heart_rate", "resting_heart_rate"]) },
      { metric: "heartRateVariability", value: pick(raw, ["score.hrv_rmssd_milli", "hrv_rmssd_milli"]) },
      { metric: "respiratoryRate", value: pick(raw, ["score.respiratory_rate", "respiratory_rate"]) },
      { metric: "trainingLoad", value: pick(raw, ["score.strain", "day_strain", "strain"]) },
      { metric: "activeCalories", value: pick(raw, ["score.kilojoule", "kilojoule"]) },
    ]);
  },
};

// --- Garmin (dailies / sleep) ---
const garmin: MetricAdapter = {
  provider: "garmin",
  toCanonical(rawIn) {
    const raw = (rawIn ?? {}) as Raw;
    const at = capturedAtOf(raw, ["calendarDate", "date"]);
    const sleepSec = pick(raw, ["sleepTimeSeconds", "durationInSeconds"]);
    return build("garmin", at, [
      { metric: "sleepDurationMinutes", value: sleepSec !== undefined ? Math.round(sleepSec / 60) : undefined },
      { metric: "restingHeartRate", value: pick(raw, ["restingHeartRateInBeatsPerMinute", "restingHeartRate"]) },
      { metric: "heartRateVariability", value: pick(raw, ["hrvWeeklyAverage", "avgOvernightHrv"]) },
      { metric: "respiratoryRate", value: pick(raw, ["avgWakingRespirationValue", "respirationRate"]) },
      { metric: "steps", value: pick(raw, ["steps", "totalSteps"]) },
      { metric: "distanceKm", value: distanceKm(pick(raw, ["distanceInMeters", "totalDistanceMeters"])) },
      { metric: "activeCalories", value: pick(raw, ["activeKilocalories", "activeCalories"]) },
      { metric: "exerciseMinutes", value: pick(raw, ["moderateIntensityDurationInSeconds"]) },
    ]);
  },
};

// --- Fitbit (sleep + activities summary) ---
const fitbit: MetricAdapter = {
  provider: "fitbit",
  toCanonical(rawIn) {
    const raw = (rawIn ?? {}) as Raw;
    const at = capturedAtOf(raw, ["dateOfSleep", "date"]);
    return build("fitbit", at, [
      { metric: "sleepDurationMinutes", value: pick(raw, ["minutesAsleep", "summary.totalMinutesAsleep"]) },
      { metric: "sleepEfficiency", value: pick(raw, ["efficiency"]) },
      { metric: "nightAwakenings", value: pick(raw, ["awakeCount", "summary.awakeCount"]) },
      { metric: "restingHeartRate", value: pick(raw, ["restingHeartRate", "summary.restingHeartRate"]) },
      { metric: "steps", value: pick(raw, ["steps", "summary.steps"]) },
      { metric: "distanceKm", value: pick(raw, ["distance", "summary.distances.0.distance"]) },
      { metric: "activeCalories", value: pick(raw, ["caloriesOut", "summary.activityCalories"]) },
    ]);
  },
};

// --- Ultrahuman (metrics array flattened to a daily summary object) ---
const ultrahuman: MetricAdapter = {
  provider: "ultrahuman",
  toCanonical(rawIn) {
    const raw = (rawIn ?? {}) as Raw;
    const at = capturedAtOf(raw);
    return build("ultrahuman", at, [
      { metric: "sleepDurationMinutes", value: pick(raw, ["sleep_duration_minutes", "total_sleep"]) },
      { metric: "sleepQualityScore", value: pick(raw, ["sleep_index", "sleep_score"]) },
      { metric: "recoveryScore", value: pick(raw, ["recovery_index", "readiness"]) },
      { metric: "restingHeartRate", value: pick(raw, ["resting_heart_rate", "rhr"]) },
      { metric: "heartRateVariability", value: pick(raw, ["hrv", "avg_hrv"]) },
      { metric: "steps", value: pick(raw, ["steps"]) },
      { metric: "trainingLoad", value: pick(raw, ["movement_index"]) },
    ]);
  },
};

// --- Apple Health (HKQuantity sample summary) ---
const appleHealth: MetricAdapter = {
  provider: "apple_health",
  toCanonical(rawIn) {
    const raw = (rawIn ?? {}) as Raw;
    const at = capturedAtOf(raw, ["date", "startDate"]);
    return build("apple_health", at, [
      { metric: "sleepDurationMinutes", value: pick(raw, ["sleepAnalysisMinutes", "HKCategoryTypeIdentifierSleepAnalysis"]) },
      { metric: "restingHeartRate", value: pick(raw, ["restingHeartRate", "HKQuantityTypeIdentifierRestingHeartRate"]) },
      { metric: "heartRateVariability", value: pick(raw, ["hrv", "HKQuantityTypeIdentifierHeartRateVariabilitySDNN"]) },
      { metric: "respiratoryRate", value: pick(raw, ["respiratoryRate", "HKQuantityTypeIdentifierRespiratoryRate"]) },
      { metric: "steps", value: pick(raw, ["steps", "HKQuantityTypeIdentifierStepCount"]) },
      { metric: "distanceKm", value: distanceKm(pick(raw, ["HKQuantityTypeIdentifierDistanceWalkingRunning"])) },
      { metric: "activeCalories", value: pick(raw, ["activeEnergyBurned", "HKQuantityTypeIdentifierActiveEnergyBurned"]) },
      { metric: "weightKg", value: pick(raw, ["bodyMass", "HKQuantityTypeIdentifierBodyMass"]) },
      { metric: "bodyFatPercent", value: pct(pick(raw, ["bodyFatPercentage", "HKQuantityTypeIdentifierBodyFatPercentage"])) },
    ]);
  },
};

// --- Google Fit (aggregated buckets flattened) ---
const googleFit: MetricAdapter = {
  provider: "google_fit",
  toCanonical(rawIn) {
    const raw = (rawIn ?? {}) as Raw;
    const at = capturedAtOf(raw);
    return build("google_fit", at, [
      { metric: "steps", value: pick(raw, ["steps", "com.google.step_count.delta"]) },
      { metric: "distanceKm", value: distanceKm(pick(raw, ["distance", "com.google.distance.delta"])) },
      { metric: "activeCalories", value: pick(raw, ["calories", "com.google.calories.expended"]) },
      { metric: "exerciseMinutes", value: pick(raw, ["activeMinutes", "com.google.active_minutes"]) },
      { metric: "heartRateVariability", value: pick(raw, ["hrv"]) },
      { metric: "weightKg", value: pick(raw, ["weight", "com.google.weight"]) },
    ]);
  },
};

function distanceKm(meters: number | undefined): number | undefined {
  return meters === undefined ? undefined : Math.round((meters / 1000) * 100) / 100;
}
function pct(fraction: number | undefined): number | undefined {
  if (fraction === undefined) return undefined;
  return fraction <= 1 ? Math.round(fraction * 1000) / 10 : fraction; // 0-1 -> %
}

const ADAPTERS: Record<IntegrationProvider, MetricAdapter> = {
  oura,
  whoop,
  garmin,
  fitbit,
  ultrahuman,
  apple_health: appleHealth,
  google_fit: googleFit,
};

export const PROVIDERS: { id: IntegrationProvider; label: string }[] = [
  { id: "oura", label: "Oura Ring" },
  { id: "whoop", label: "Whoop" },
  { id: "garmin", label: "Garmin" },
  { id: "ultrahuman", label: "Ultrahuman" },
  { id: "fitbit", label: "Fitbit" },
  { id: "apple_health", label: "Apple Health" },
  { id: "google_fit", label: "Google Fit" },
];

export function getAdapter(provider: string): MetricAdapter | undefined {
  return ADAPTERS[provider as IntegrationProvider];
}

export function isProvider(p: string): p is IntegrationProvider {
  return p in ADAPTERS;
}
