import type { PackDefinition } from "@/types/packs";
import { weightedAverage, scoreTargetBand, metricNum } from "@/packs/normalize";

// Weight Loss & Body Composition Pack (docs/13 section 2.2). Manual or device
// (canonical) inputs. body_composition is a NON-DIAGNOSTIC self-trend proxy, not a
// clinical assessment - it tracks movement, not a verdict.
export const weightPack: PackDefinition = {
  slug: "weight",
  name: "Weight & Body Composition",
  description: "Weight, waist, body fat, and composition trends.",
  version: "1.0.0",
  isEligible: () => false, // opt-in via the pack marketplace
  metrics: [
    { slug: "weight_kg", label: "Weight (kg)", kind: "numeric", sensitivity: "normal" },
    { slug: "waist_cm", label: "Waist (cm)", kind: "numeric", sensitivity: "normal" },
    { slug: "neck_cm", label: "Neck (cm)", kind: "numeric", sensitivity: "normal" },
    { slug: "body_fat_pct", label: "Body fat (%)", kind: "numeric", sensitivity: "normal" },
  ],
  indices: [
    {
      indexKind: "body_composition",
      label: "Body Composition",
      compute: ({ metricEntries, canonical }) => {
        const bodyFat = metricNum(metricEntries, "body_fat_pct") ?? canonical?.bodyFatPercent;
        const waist = metricNum(metricEntries, "waist_cm") ?? canonical?.waistCm;
        return weightedAverage([
          // Generic favorable bands; framed as relative self-trend (docs/20 non-diagnostic).
          { value: bodyFat != null ? scoreTargetBand(bodyFat, 3, 10, 22, 40) : undefined, weight: 0.5 },
          { value: waist != null ? scoreTargetBand(waist, 55, 70, 90, 120) : undefined, weight: 0.5 },
        ]);
      },
    },
  ],
  dashboard: { cards: [{ indexKind: "body_composition", title: "Body Composition", chart: "line" }] },
};
