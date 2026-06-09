// Canonical (vendor-independent) health metric layer.
// Source of truth: docs/22-canonical-health-metrics.md.

import type { MetricQuality } from "./index";

// Canonical metric keys (docs/22 section 1). Adapters map vendor payloads here.
export type CanonicalMetric =
  // Sleep
  | "sleepDurationMinutes"
  | "sleepEfficiency"
  | "sleepQualityScore"
  | "nightAwakenings"
  // Recovery
  | "recoveryScore"
  | "restingHeartRate"
  | "heartRateVariability"
  | "bodyTemperature"
  | "respiratoryRate"
  // Activity
  | "steps"
  | "distanceKm"
  | "activeCalories"
  | "exerciseMinutes"
  | "trainingLoad"
  // Body
  | "weightKg"
  | "bodyFatPercent"
  | "waistCm"
  | "neckCm"
  | "heightCm"
  // Cardiovascular
  | "systolicBP"
  | "diastolicBP";

export interface CanonicalMetricValue {
  metric: CanonicalMetric;
  value: number;
  unit: string; // canonical unit (docs/22 section 4)
  source: string; // 'whoop' | 'oura' | 'manual' | 'lab' | 'ocr' | 'apple_health' | ...
  capturedAt: string; // RFC3339; when measured, not ingested
  qualityLevel: MetricQuality; // A device / B lab / C user / D ocr
}

// Adapters translate a raw vendor payload into canonical values (units converted).
export interface MetricAdapter {
  provider: string;
  toCanonical: (raw: unknown) => CanonicalMetricValue[];
}

export type IntegrationProvider =
  | "oura"
  | "whoop"
  | "garmin"
  | "ultrahuman"
  | "fitbit"
  | "apple_health"
  | "google_fit";
