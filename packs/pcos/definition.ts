import type { PackDefinition } from "@/types/packs";
import { normScale, normBool, metricNum, metricBool } from "@/packs/normalize";

// PCOS Pack (docs/14 section 2.1, female). Reproductive data is highly sensitive.
// pcos_symptom_load is a symptom-LOAD index (higher = more burden), never a diagnosis.
export const pcosPack: PackDefinition = {
  slug: "pcos",
  name: "PCOS Pack",
  description: "PCOS-related symptom tracking and cycle correlation.",
  version: "1.0.0",
  isEligible: () => false,
  metrics: [
    { slug: "acne", label: "Acne severity", kind: "scale", min: 1, max: 10, sexScope: "female", sensitivity: "highly_sensitive" },
    { slug: "hirsutism", label: "Excess hair growth", kind: "scale", min: 1, max: 10, sexScope: "female", sensitivity: "highly_sensitive" },
    { slug: "pcos_mood_swings", label: "Mood swings", kind: "scale", min: 1, max: 10, sexScope: "female", sensitivity: "highly_sensitive" },
    { slug: "irregular_cycle", label: "Irregular cycle today", kind: "boolean", sexScope: "female", sensitivity: "highly_sensitive" },
    { slug: "pcos_cravings", label: "Sugar cravings", kind: "scale", min: 1, max: 10, sexScope: "female", sensitivity: "highly_sensitive" },
  ],
  indices: [
    {
      indexKind: "pcos_symptom_load",
      label: "PCOS Symptom Load",
      sexScope: "female",
      compute: ({ metricEntries }) => {
        const scales = ["acne", "hirsutism", "pcos_mood_swings", "pcos_cravings"]
          .map((s) => metricNum(metricEntries, s))
          .filter((v): v is number => v != null)
          .map((v) => normScale(v));
        const irregular = metricBool(metricEntries, "irregular_cycle");
        if (irregular != null) scales.push(normBool(irregular));
        if (scales.length === 0) return null;
        return Math.round(scales.reduce((a, b) => a + b, 0) / scales.length);
      },
    },
  ],
  dashboard: { cards: [{ indexKind: "pcos_symptom_load", title: "PCOS Symptom Load", chart: "line" }] },
};
