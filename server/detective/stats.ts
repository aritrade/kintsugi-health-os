import type { ConfidenceLevel } from "@/types";

// Pure statistics for the Detective. Source: docs/19 sections 4-5, docs/20 section 7.

export interface DatedValue {
  date: string; // YYYY-MM-DD
  value: number;
}

// Pearson correlation coefficient over paired numbers. Returns null if <2 pairs
// or zero variance in either series.
export function pearson(xs: number[], ys: number[]): number | null {
  const n = Math.min(xs.length, ys.length);
  if (n < 2) return null;
  let sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0;
  for (let i = 0; i < n; i++) {
    sx += xs[i];
    sy += ys[i];
    sxx += xs[i] * xs[i];
    syy += ys[i] * ys[i];
    sxy += xs[i] * ys[i];
  }
  const cov = n * sxy - sx * sy;
  const denom = Math.sqrt((n * sxx - sx * sx) * (n * syy - sy * sy));
  if (denom === 0) return null;
  return cov / denom;
}

// Align two dated series by common dates, preserving order.
export function alignByDate(a: DatedValue[], b: DatedValue[]): { xs: number[]; ys: number[] } {
  const mb = new Map(b.map((d) => [d.date, d.value]));
  const xs: number[] = [];
  const ys: number[] = [];
  for (const d of a) {
    if (mb.has(d.date)) {
      xs.push(d.value);
      ys.push(mb.get(d.date)!);
    }
  }
  return { xs, ys };
}

// Bucket a coefficient by absolute strength (docs/19 section 5). Returns null
// below 0.20 (treated as no meaningful relationship).
export function confidenceLevel(coefficient: number): ConfidenceLevel | null {
  const a = Math.abs(coefficient);
  if (a >= 0.8) return "Very High";
  if (a >= 0.6) return "High";
  if (a >= 0.4) return "Moderate";
  if (a >= 0.2) return "Low";
  return null;
}

// Simple trend over a dated series: compares the mean of the older half to the
// newer half. Returns percent change of the newer vs older half mean.
export interface TrendResult {
  direction: "improving" | "declining" | "stable";
  percentChange: number; // signed, relative to older-half mean
  olderMean: number;
  newerMean: number;
  n: number;
}

export function trend(series: DatedValue[]): TrendResult | null {
  const n = series.length;
  if (n < 4) return null;
  const mid = Math.floor(n / 2);
  const older = series.slice(0, mid);
  const newer = series.slice(mid);
  const mean = (arr: DatedValue[]) => arr.reduce((s, d) => s + d.value, 0) / arr.length;
  const olderMean = mean(older);
  const newerMean = mean(newer);
  if (olderMean === 0) return null;
  const percentChange = ((newerMean - olderMean) / Math.abs(olderMean)) * 100;
  const direction = percentChange > 5 ? "improving" : percentChange < -5 ? "declining" : "stable";
  return { direction, percentChange: Math.round(percentChange), olderMean, newerMean, n };
}
