import type { PackDefinition } from "@/types/packs";
import { normScale, weightedAverage } from "@/packs/normalize";

// Sleep Pack. Metrics + Sleep/Recovery indices.
// Formulas: docs/20-index-formulas.md sections 2.1, 2.2.
export const sleepPack: PackDefinition = {
  slug: "sleep",
  name: "Sleep Pack",
  description: "Sleep quality, recovery, and related metrics.",
  version: "1.0.0",
  isEligible: () => true, // all users
  metrics: [
    { slug: "sleep_quality", label: "Sleep quality", kind: "scale", min: 1, max: 10, sensitivity: "normal" },
    { slug: "daytime_fatigue", label: "Daytime fatigue", kind: "scale", min: 1, max: 10, sensitivity: "normal" },
  ],
  indices: [
    {
      indexKind: "sleep_score",
      label: "Sleep Score",
      compute: (input) => {
        const quality = input.metricEntries.find((m) => m.metricSlug === "sleep_quality")?.valueNum;
        const score = weightedAverage([
          { value: quality !== undefined ? normScale(quality) : undefined, weight: 1 },
        ]);
        return score ?? 0;
      },
    },
  ],
  dashboard: {
    cards: [{ indexKind: "sleep_score", title: "Sleep Score", chart: "line" }],
  },
};
