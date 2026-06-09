// Daily Check-in domain types.
// Source of truth: docs/05-database-schema.md (checkins, pack_metric_entries) + docs/11-wireframes.md S05.

import type { BiologicalSex, MetricKind, Sensitivity } from "./index";

// A pack metric definition resolved for a specific user (sex-scoped, with current value).
export interface ResolvedPackMetric {
  metricId: string;
  packSlug: string;
  slug: string;
  label: string;
  kind: MetricKind;
  min?: number;
  max?: number;
  sexScope?: BiologicalSex;
  sensitivity: Sensitivity;
}

export interface ActivePackMetrics {
  packSlug: string;
  packName: string;
  containsSensitive: boolean;
  metrics: ResolvedPackMetric[];
}

// Core check-in scalar fields (all optional for partial saves).
export interface CheckinCore {
  bedtime?: string | null;
  wakeTime?: string | null;
  sleepDurationMin?: number | null;
  sleepQuality?: number | null;
  dryMouth?: boolean | null;
  snoring?: boolean | null;
  nightAwakenings?: number | null;
  energy?: number | null;
  fatigue?: number | null;
  recovery?: number | null;
  pain?: number | null;
  mood?: number | null;
  anxiety?: number | null;
  stress?: number | null;
  confidence?: number | null;
  ran?: boolean | null;
  strengthTrained?: boolean | null;
  walked?: boolean | null;
  steps?: number | null;
  waterMl?: number | null;
  alcoholUnits?: number | null;
  nicotine?: boolean | null;
  caffeineMg?: number | null;
}

export interface PackMetricValue {
  metricId: string;
  valueNum?: number | null;
  valueBool?: boolean | null;
  valueText?: string | null;
}

export interface CheckinPayload extends CheckinCore {
  isComplete?: boolean;
  packMetrics?: PackMetricValue[];
}
