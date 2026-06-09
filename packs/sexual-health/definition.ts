import type { PackDefinition } from "@/types/packs";
import { normScale, weightedAverage } from "@/packs/normalize";

// Sexual Health Pack. Sex-scoped metrics; all highly sensitive.
// Indices: Libido, Sexual Confidence, Erectile Function, Ejaculatory Control.
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
      compute: (input) => {
        const get = (slug: string) => input.metricEntries.find((m) => m.metricSlug === slug)?.valueNum;
        const score = weightedAverage([
          { value: get("libido_desire") !== undefined ? normScale(get("libido_desire")!) : undefined, weight: 0.4 },
          { value: get("libido_thoughts") !== undefined ? normScale(get("libido_thoughts")!) : undefined, weight: 0.2 },
          { value: get("libido_attraction") !== undefined ? normScale(get("libido_attraction")!) : undefined, weight: 0.2 },
          { value: get("libido_satisfaction") !== undefined ? normScale(get("libido_satisfaction")!) : undefined, weight: 0.2 },
        ]);
        return score ?? 0;
      },
    },
  ],
  dashboard: {
    cards: [{ indexKind: "libido", title: "Libido Index", chart: "line" }],
  },
};
