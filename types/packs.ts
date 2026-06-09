// Investigation Pack plugin contract.
// Source of truth: docs/09-type-definitions.md section 8 + docs/04-information-architecture.md.

import type { BiologicalSex, IndexKind, MetricKind, Profile, Sensitivity } from "./index";

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
  // Pure function specified in docs/20-index-formulas.md; implemented per pack.
  compute: (input: IndexComputeInput) => number;
}

export interface IndexComputeInput {
  // Minimal shape for M0; expanded in later milestones.
  metricEntries: Array<{ metricSlug: string; valueNum?: number; valueBool?: boolean }>;
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
