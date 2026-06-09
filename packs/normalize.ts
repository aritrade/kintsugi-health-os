// Normalization helpers shared by pack index formulas.
// Source of truth: docs/20-index-formulas.md section 3.

// 1-10 scale -> 0..100
export function normScale(value: number): number {
  return ((value - 1) / 9) * 100;
}

// boolean -> 0 or 100
export function normBool(value: boolean): number {
  return value ? 100 : 0;
}

// inverse 1-10 (lower is better) -> 0..100
export function normInverse(value: number): number {
  return 100 - normScale(value);
}

function clamp(n: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, n));
}

function lerp(x: number, x0: number, x1: number, y0: number, y1: number): number {
  if (x1 === x0) return y0;
  return y0 + ((x - x0) / (x1 - x0)) * (y1 - y0);
}

// --- Section 4: scoring non-scale numerics against tunable, non-diagnostic bands ---

// Sleep duration (minutes) -> 0..100. Target band 7-9h = 100; falls off linearly,
// approaching 0 below 4h or above 11h. (docs/20 section 4)
export function scoreSleepDuration(minutes: number): number {
  const TARGET_LOW = 420, TARGET_HIGH = 540, FLOOR_LOW = 240, FLOOR_HIGH = 660;
  if (minutes >= TARGET_LOW && minutes <= TARGET_HIGH) return 100;
  if (minutes < TARGET_LOW) return clamp(lerp(minutes, FLOOR_LOW, TARGET_LOW, 0, 100));
  return clamp(lerp(minutes, TARGET_HIGH, FLOOR_HIGH, 100, 0));
}

// Night awakenings (count) -> 0..100. 0 = 100, each awakening -20, floored at 0.
export function scoreAwakenings(count: number): number {
  return clamp(100 - count * 20);
}

// Dry-mouth / snoring composite penalty -> 0..100 (100 best). (docs/20 section 5)
export function penaltyDryMouthSnoring(dryMouth?: boolean | null, snoring?: boolean | null): number {
  return 100 - (dryMouth ? 50 : 0) - (snoring ? 50 : 0);
}

// Ejaculatory latency (minutes) -> 0..100, relative self-trend only (not diagnostic).
export function scoreLatencyMinutes(minutes: number): number {
  return clamp((minutes / 7) * 100);
}

// Erection duration (minutes) -> 0..100, relative self-trend only (not diagnostic).
export function scoreErectionDurationMinutes(minutes: number): number {
  return clamp((minutes / 15) * 100);
}

// Average a list of contributions, ignoring undefined inputs and renormalizing weights.
export function weightedAverage(parts: Array<{ value?: number; weight: number }>): number | null {
  const present = parts.filter((p) => typeof p.value === "number") as Array<{
    value: number;
    weight: number;
  }>;
  if (present.length === 0) return null;
  const totalWeight = present.reduce((s, p) => s + p.weight, 0);
  if (totalWeight === 0) return null;
  const sum = present.reduce((s, p) => s + p.value * p.weight, 0);
  return Math.round(sum / totalWeight);
}

export const BASELINE_MIN_OBSERVATIONS = 7; // docs/20 section 6
