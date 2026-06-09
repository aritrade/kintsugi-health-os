import type { PackDefinition } from "@/types/packs";
import { normBool, weightedAverage, scoreTargetBand, metricNum, metricBool } from "@/packs/normalize";

// Longevity Pack (docs/14 section 2.1). longevity_score is a NON-DIAGNOSTIC
// composite of healthy daily behaviors and measures; higher = more favorable.
export const longevityPack: PackDefinition = {
  slug: "longevity",
  name: "Longevity Pack",
  description: "Healthspan behaviors: activity, recovery, restraint.",
  version: "1.0.0",
  isEligible: () => false,
  metrics: [
    { slug: "exercise_minutes", label: "Exercise minutes", kind: "numeric", sensitivity: "normal" },
    { slug: "alcohol_free", label: "Alcohol-free day", kind: "boolean", sensitivity: "normal" },
    { slug: "whole_foods", label: "Mostly whole foods", kind: "boolean", sensitivity: "normal" },
    { slug: "resting_hr", label: "Resting heart rate", kind: "numeric", sensitivity: "normal" },
  ],
  indices: [
    {
      indexKind: "longevity_score",
      label: "Longevity Score",
      compute: ({ metricEntries, canonical }) => {
        const exercise = metricNum(metricEntries, "exercise_minutes") ?? canonical?.exerciseMinutes;
        const alcoholFree = metricBool(metricEntries, "alcohol_free");
        const wholeFoods = metricBool(metricEntries, "whole_foods");
        const rhr = metricNum(metricEntries, "resting_hr") ?? canonical?.restingHeartRate;
        const steps = canonical?.steps;
        return weightedAverage([
          { value: exercise != null ? scoreTargetBand(exercise, 0, 30, 90, 180) : undefined, weight: 0.3 },
          { value: rhr != null ? scoreTargetBand(rhr, 38, 48, 60, 90) : undefined, weight: 0.25 },
          { value: steps != null ? scoreTargetBand(steps, 0, 8000, 15000, 25000) : undefined, weight: 0.2 },
          { value: alcoholFree != null ? normBool(alcoholFree) : undefined, weight: 0.15 },
          { value: wholeFoods != null ? normBool(wholeFoods) : undefined, weight: 0.1 },
        ]);
      },
    },
  ],
  dashboard: { cards: [{ indexKind: "longevity_score", title: "Longevity Score", chart: "line" }] },
};
