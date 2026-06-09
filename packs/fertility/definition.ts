import type { PackDefinition } from "@/types/packs";
import { normScale, normBool, weightedAverage, metricNum, metricBool } from "@/packs/normalize";

// Fertility Pack (docs/14 section 2.1, female). Cycle + fertility-window signals.
// Highly sensitive reproductive data. fertility_readiness reflects logged
// fertile-window indicators; it is NOT medical fertility advice.
export const fertilityPack: PackDefinition = {
  slug: "fertility",
  name: "Fertility Pack",
  description: "Cycle tracking and fertility-window signals.",
  version: "1.0.0",
  isEligible: () => false,
  metrics: [
    { slug: "cycle_day", label: "Cycle day", kind: "numeric", sexScope: "female", sensitivity: "highly_sensitive" },
    { slug: "period_today", label: "Period today", kind: "boolean", sexScope: "female", sensitivity: "highly_sensitive" },
    { slug: "bbt", label: "Basal body temp (Celsius)", kind: "numeric", sexScope: "female", sensitivity: "highly_sensitive" },
    { slug: "cervical_mucus", label: "Cervical mucus quality", kind: "scale", min: 1, max: 10, sexScope: "female", sensitivity: "highly_sensitive" },
    { slug: "ovulation_positive", label: "Ovulation test positive", kind: "boolean", sexScope: "female", sensitivity: "highly_sensitive" },
  ],
  indices: [
    {
      indexKind: "fertility_readiness",
      label: "Fertility Readiness",
      sexScope: "female",
      compute: ({ metricEntries }) => {
        const mucus = metricNum(metricEntries, "cervical_mucus");
        const ovPos = metricBool(metricEntries, "ovulation_positive");
        return weightedAverage([
          { value: mucus != null ? normScale(mucus) : undefined, weight: 0.5 },
          { value: ovPos != null ? normBool(ovPos) : undefined, weight: 0.5 },
        ]);
      },
    },
  ],
  dashboard: { cards: [{ indexKind: "fertility_readiness", title: "Fertility Readiness", chart: "line" }] },
};
