import type { PackDefinition } from "@/types/packs";
import { normScale, metricNum } from "@/packs/normalize";

// Thyroid Pack (docs/13 section 2.2). Tracks symptom burden over time to correlate
// with TSH/T3/T4 labs. thyroid_symptom_load is a symptom-LOAD index (higher = more
// symptom burden) - it is NOT a diagnosis of any thyroid condition.
export const thyroidPack: PackDefinition = {
  slug: "thyroid",
  name: "Thyroid Pack",
  description: "Thyroid-related symptom tracking and lab correlation.",
  version: "1.0.0",
  isEligible: () => false,
  metrics: [
    { slug: "cold_intolerance", label: "Cold intolerance", kind: "scale", min: 1, max: 10, sensitivity: "normal" },
    { slug: "thyroid_fatigue", label: "Fatigue", kind: "scale", min: 1, max: 10, sensitivity: "normal" },
    { slug: "hair_thinning", label: "Hair thinning", kind: "scale", min: 1, max: 10, sensitivity: "normal" },
    { slug: "brain_fog", label: "Brain fog", kind: "scale", min: 1, max: 10, sensitivity: "normal" },
    { slug: "constipation", label: "Constipation", kind: "scale", min: 1, max: 10, sensitivity: "normal" },
  ],
  indices: [
    {
      indexKind: "thyroid_symptom_load",
      label: "Thyroid Symptom Load",
      compute: ({ metricEntries }) => {
        const slugs = ["cold_intolerance", "thyroid_fatigue", "hair_thinning", "brain_fog", "constipation"];
        const vals = slugs.map((s) => metricNum(metricEntries, s)).filter((v): v is number => v != null);
        if (vals.length === 0) return null;
        // Average severity on a 0-100 load scale (higher = more burden).
        return Math.round(vals.reduce((a, b) => a + normScale(b), 0) / vals.length);
      },
    },
  ],
  dashboard: { cards: [{ indexKind: "thyroid_symptom_load", title: "Thyroid Symptom Load", chart: "line" }] },
};
