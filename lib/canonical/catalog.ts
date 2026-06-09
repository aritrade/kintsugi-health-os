import type { CanonicalMetric } from "@/types/canonical";

// Canonical metric catalog: label + fixed unit (docs/22 sections 1 & 4).
export const CANONICAL_CATALOG: Record<CanonicalMetric, { label: string; unit: string }> = {
  sleepDurationMinutes: { label: "Sleep duration", unit: "minutes" },
  sleepEfficiency: { label: "Sleep efficiency", unit: "%" },
  sleepQualityScore: { label: "Sleep quality", unit: "score" },
  nightAwakenings: { label: "Night awakenings", unit: "count" },
  recoveryScore: { label: "Recovery / readiness", unit: "score" },
  restingHeartRate: { label: "Resting heart rate", unit: "bpm" },
  heartRateVariability: { label: "Heart rate variability", unit: "ms" },
  bodyTemperature: { label: "Body temperature", unit: "Celsius" },
  respiratoryRate: { label: "Respiratory rate", unit: "breaths/min" },
  steps: { label: "Steps", unit: "count" },
  distanceKm: { label: "Distance", unit: "km" },
  activeCalories: { label: "Active calories", unit: "kcal" },
  exerciseMinutes: { label: "Exercise", unit: "minutes" },
  trainingLoad: { label: "Training load", unit: "load" },
  weightKg: { label: "Weight", unit: "kg" },
  bodyFatPercent: { label: "Body fat", unit: "%" },
  waistCm: { label: "Waist circumference", unit: "cm" },
  neckCm: { label: "Neck circumference", unit: "cm" },
  heightCm: { label: "Height", unit: "cm" },
  systolicBP: { label: "Systolic BP", unit: "mmHg" },
  diastolicBP: { label: "Diastolic BP", unit: "mmHg" },
};

// Descending quality (docs/22 section 2): A device > B lab > C user > D ocr.
export const QUALITY_RANK: Record<string, number> = { A: 4, B: 3, C: 2, D: 1 };

export function isCanonicalMetric(key: string): key is CanonicalMetric {
  return key in CANONICAL_CATALOG;
}
