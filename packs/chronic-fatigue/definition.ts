import type { PackDefinition } from "@/types/packs";
import { normInverse, normBool, weightedAverage, metricNum, metricBool } from "@/packs/normalize";

// Chronic Fatigue Pack (docs/14 section 2.1). energy_stability is higher = better
// (more stable energy / less symptom burden). Non-diagnostic.
export const chronicFatiguePack: PackDefinition = {
  slug: "chronic-fatigue",
  name: "Chronic Fatigue Pack",
  description: "Energy, post-exertional malaise, and pacing.",
  version: "1.0.0",
  isEligible: () => false,
  metrics: [
    { slug: "post_exertional_malaise", label: "Post-exertional malaise", kind: "scale", min: 1, max: 10, sensitivity: "normal" },
    { slug: "unrefreshing_sleep", label: "Unrefreshing sleep", kind: "scale", min: 1, max: 10, sensitivity: "normal" },
    { slug: "cognitive_difficulty", label: "Cognitive difficulty", kind: "scale", min: 1, max: 10, sensitivity: "normal" },
    { slug: "widespread_pain", label: "Widespread pain", kind: "scale", min: 1, max: 10, sensitivity: "normal" },
    { slug: "energy_envelope_exceeded", label: "Overdid it today", kind: "boolean", sensitivity: "normal" },
  ],
  indices: [
    {
      indexKind: "energy_stability",
      label: "Energy Stability",
      compute: ({ metricEntries }) => {
        const pem = metricNum(metricEntries, "post_exertional_malaise");
        const unrefreshing = metricNum(metricEntries, "unrefreshing_sleep");
        const cog = metricNum(metricEntries, "cognitive_difficulty");
        const pain = metricNum(metricEntries, "widespread_pain");
        const overdid = metricBool(metricEntries, "energy_envelope_exceeded");
        return weightedAverage([
          { value: pem != null ? normInverse(pem) : undefined, weight: 0.3 },
          { value: unrefreshing != null ? normInverse(unrefreshing) : undefined, weight: 0.25 },
          { value: cog != null ? normInverse(cog) : undefined, weight: 0.2 },
          { value: pain != null ? normInverse(pain) : undefined, weight: 0.15 },
          { value: overdid != null ? normBool(!overdid) : undefined, weight: 0.1 },
        ]);
      },
    },
  ],
  dashboard: { cards: [{ indexKind: "energy_stability", title: "Energy Stability", chart: "line" }] },
};
