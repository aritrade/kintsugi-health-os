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
