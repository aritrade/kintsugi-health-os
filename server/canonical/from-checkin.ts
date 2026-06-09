import type { CheckinCore } from "@/types/checkin";
import type { CanonicalMetricValue } from "@/types/canonical";
import { CANONICAL_CATALOG } from "@/lib/canonical/catalog";

// Manual check-in fields are themselves canonical metrics at quality Level C
// (docs/22 section 5), so manual and device data are interchangeable index inputs.
export function checkinToCanonical(core: CheckinCore, date: string): CanonicalMetricValue[] {
  const capturedAt = `${date}T12:00:00Z`;
  const out: CanonicalMetricValue[] = [];
  const add = (metric: keyof typeof CANONICAL_CATALOG, value: number | null | undefined) => {
    if (value == null || !Number.isFinite(value)) return;
    out.push({
      metric,
      value,
      unit: CANONICAL_CATALOG[metric].unit,
      source: "manual",
      capturedAt,
      qualityLevel: "C",
    });
  };

  add("sleepDurationMinutes", core.sleepDurationMin);
  add("nightAwakenings", core.nightAwakenings);
  add("steps", core.steps);
  if (core.sleepQuality != null) add("sleepQualityScore", core.sleepQuality * 10); // 1-10 -> 0-100

  return out;
}
