import type { PackDefinition, IndexComputeInput } from "@/types/packs";
import {
  normScale,
  normBool,
  normInverse,
  scoreLatencyMinutes,
  scoreErectionDurationMinutes,
  weightedAverage,
} from "@/packs/normalize";

const slugVal = (input: IndexComputeInput, slug: string) =>
  input.metricEntries.find((m) => m.metricSlug === slug)?.valueNum;
const slugBool = (input: IndexComputeInput, slug: string) =>
  input.metricEntries.find((m) => m.metricSlug === slug)?.valueBool;

// Libido Index (docs/20 section 2.4) - reused as an input to Sexual Confidence.
function computeLibido(input: IndexComputeInput): number | null {
  return weightedAverage([
    { value: slugVal(input, "libido_desire") != null ? normScale(slugVal(input, "libido_desire")!) : undefined, weight: 0.4 },
    { value: slugVal(input, "libido_thoughts") != null ? normScale(slugVal(input, "libido_thoughts")!) : undefined, weight: 0.2 },
    { value: slugVal(input, "libido_attraction") != null ? normScale(slugVal(input, "libido_attraction")!) : undefined, weight: 0.2 },
    { value: slugVal(input, "libido_satisfaction") != null ? normScale(slugVal(input, "libido_satisfaction")!) : undefined, weight: 0.2 },
  ]);
}

// Confidence Index (docs/20 section 2.3) from core mental fields - input to Sexual Confidence.
function computeConfidence(input: IndexComputeInput): number | null {
  const core = input.core;
  if (!core) return null;
  return weightedAverage([
    { value: core.confidence != null ? normScale(core.confidence) : undefined, weight: 0.5 },
    { value: core.mood != null ? normScale(core.mood) : undefined, weight: 0.3 },
    { value: core.anxiety != null ? normInverse(core.anxiety) : undefined, weight: 0.2 },
  ]);
}

// Sexual Health Pack. Sex-scoped metrics; all highly sensitive.
// Indices: Libido, Sexual Confidence, Erectile Function (male), Ejaculatory Control (male).
// Formulas: docs/20-index-formulas.md sections 2.4, 2.4b, 2.5, 2.6.
export const sexualHealthPack: PackDefinition = {
  slug: "sexual-health",
  name: "Sexual Health Pack",
  description: "Libido, erectile function, female sexual wellness, ejaculatory control.",
  version: "1.0.0",
  isEligible: () => true, // available to all; metrics are sex-scoped
  metrics: [
    // Libido (all)
    { slug: "libido_desire", label: "Sexual desire", kind: "scale", min: 1, max: 10, sensitivity: "highly_sensitive" },
    { slug: "libido_thoughts", label: "Sexual thoughts", kind: "scale", min: 1, max: 10, sensitivity: "highly_sensitive" },
    { slug: "libido_attraction", label: "Attraction", kind: "scale", min: 1, max: 10, sensitivity: "highly_sensitive" },
    { slug: "libido_satisfaction", label: "Sexual satisfaction", kind: "scale", min: 1, max: 10, sensitivity: "highly_sensitive" },
    // Erectile function (male)
    { slug: "morning_erection", label: "Morning erection", kind: "boolean", sexScope: "male", sensitivity: "highly_sensitive" },
    { slug: "spontaneous_erection", label: "Spontaneous erection", kind: "boolean", sexScope: "male", sensitivity: "highly_sensitive" },
    { slug: "erection_quality", label: "Erection quality", kind: "scale", min: 1, max: 10, sexScope: "male", sensitivity: "highly_sensitive" },
    { slug: "erection_duration", label: "Erection duration", kind: "numeric", sexScope: "male", sensitivity: "highly_sensitive" },
    { slug: "erectile_confidence", label: "Sexual confidence", kind: "scale", min: 1, max: 10, sexScope: "male", sensitivity: "highly_sensitive" },
    // Ejaculatory control (male)
    { slug: "ejac_latency", label: "Latency", kind: "numeric", sexScope: "male", sensitivity: "highly_sensitive" },
    { slug: "ejac_control", label: "Control", kind: "scale", min: 1, max: 10, sexScope: "male", sensitivity: "highly_sensitive" },
    { slug: "ejac_satisfaction", label: "Satisfaction", kind: "scale", min: 1, max: 10, sexScope: "male", sensitivity: "highly_sensitive" },
    // Female sexual wellness (female)
    { slug: "fsw_desire", label: "Desire", kind: "scale", min: 1, max: 10, sexScope: "female", sensitivity: "highly_sensitive" },
    { slug: "fsw_arousal", label: "Arousal", kind: "scale", min: 1, max: 10, sexScope: "female", sensitivity: "highly_sensitive" },
    { slug: "fsw_lubrication", label: "Lubrication", kind: "scale", min: 1, max: 10, sexScope: "female", sensitivity: "highly_sensitive" },
    { slug: "fsw_orgasm", label: "Orgasm satisfaction", kind: "scale", min: 1, max: 10, sexScope: "female", sensitivity: "highly_sensitive" },
    { slug: "fsw_intimacy", label: "Intimacy satisfaction", kind: "scale", min: 1, max: 10, sexScope: "female", sensitivity: "highly_sensitive" },
  ],
  indices: [
    {
      indexKind: "libido",
      label: "Libido Index",
      compute: computeLibido,
    },
    {
      indexKind: "sexual_confidence",
      label: "Sexual Confidence",
      // 0.50*self-reported sexual confidence + 0.30*Libido Index + 0.20*Confidence Index.
      // Sub-indices already 0-100 are used directly. Renormalizes over present inputs.
      compute: (input) => {
        const selfConfidence = slugVal(input, "erectile_confidence");
        const libido = computeLibido(input);
        const confidence = computeConfidence(input);
        return weightedAverage([
          { value: selfConfidence != null ? normScale(selfConfidence) : undefined, weight: 0.5 },
          { value: libido ?? undefined, weight: 0.3 },
          { value: confidence ?? undefined, weight: 0.2 },
        ]);
      },
    },
    {
      indexKind: "erectile_function",
      label: "Erectile Function",
      sexScope: "male",
      // 0.25*morning erection + 0.35*quality + 0.20*duration(band) + 0.20*sexual confidence
      compute: (input) => {
        const morning = slugBool(input, "morning_erection");
        const quality = slugVal(input, "erection_quality");
        const duration = slugVal(input, "erection_duration");
        const confidence = slugVal(input, "erectile_confidence");
        return weightedAverage([
          { value: morning != null ? normBool(morning) : undefined, weight: 0.25 },
          { value: quality != null ? normScale(quality) : undefined, weight: 0.35 },
          { value: duration != null ? scoreErectionDurationMinutes(duration) : undefined, weight: 0.2 },
          { value: confidence != null ? normScale(confidence) : undefined, weight: 0.2 },
        ]);
      },
    },
    {
      indexKind: "ejaculatory_control",
      label: "Ejaculatory Control",
      sexScope: "male",
      // 0.30*latency(band) + 0.50*control + 0.20*satisfaction
      compute: (input) => {
        const latency = slugVal(input, "ejac_latency");
        const control = slugVal(input, "ejac_control");
        const satisfaction = slugVal(input, "ejac_satisfaction");
        return weightedAverage([
          { value: latency != null ? scoreLatencyMinutes(latency) : undefined, weight: 0.3 },
          { value: control != null ? normScale(control) : undefined, weight: 0.5 },
          { value: satisfaction != null ? normScale(satisfaction) : undefined, weight: 0.2 },
        ]);
      },
    },
  ],
  dashboard: {
    cards: [
      { indexKind: "libido", title: "Libido Index", chart: "line" },
      { indexKind: "sexual_confidence", title: "Sexual Confidence", chart: "line" },
      { indexKind: "erectile_function", title: "Erectile Function", chart: "line" },
      { indexKind: "ejaculatory_control", title: "Ejaculatory Control", chart: "line" },
    ],
  },
};
