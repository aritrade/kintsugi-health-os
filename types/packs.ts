// Investigation Pack plugin contract.
// Source of truth: docs/09-type-definitions.md section 8 + docs/04-information-architecture.md.

import type { BiologicalSex, IndexKind, MetricKind, Profile, Sensitivity } from "./index";
import type { CheckinCore } from "./checkin";
import type { CanonicalMetric } from "./canonical";

export interface PackMetricDefinition {
  slug: string;
  label: string;
  kind: MetricKind;
  min?: number;
  max?: number;
  sexScope?: BiologicalSex; // undefined = all
  sensitivity: Sensitivity;
}

export interface PackIndexDefinition {
  indexKind: IndexKind;
  label: string;
  // Restricts the index to a biological sex (e.g. erectile function). undefined = all.
  sexScope?: BiologicalSex;
  // Pure function specified in docs/20-index-formulas.md; implemented per pack.
  // Returns null when there are too few inputs to compute a meaningful value.
  compute: (input: IndexComputeInput) => number | null;
}

export interface IndexComputeInput {
  // Pack metric entries for the day (from pack_metric_entries).
  metricEntries: Array<{ metricSlug: string; valueNum?: number; valueBool?: boolean }>;
  // Core daily check-in fields for the day (from the checkins table). Several
  // indices (Sleep, Recovery, Confidence) are computed from these.
  core: CheckinCore | null;
  // Latest canonical metric values for the day (device/lab/manual), source-agnostic
  // (docs/22). Body / BP / activity indices prefer these when present.
  canonical?: Partial<Record<CanonicalMetric, number>>;
  windowDays: number;
}

export interface PackDashboardCard {
  indexKind: IndexKind;
  title: string;
  chart: "line" | "bar" | "gauge";
}

export interface PackDefinition {
  slug: string;
  name: string;
  description: string;
  version: string;
  // Determines whether the pack is auto-enabled for a given profile.
  isEligible: (profile: Profile) => boolean;
  metrics: PackMetricDefinition[];
  indices: PackIndexDefinition[];
  dashboard: { cards: PackDashboardCard[] };
}
