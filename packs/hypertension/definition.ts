import type { PackDefinition } from "@/types/packs";
import { weightedAverage, scoreTargetBand, metricNum } from "@/packs/normalize";

// Hypertension Pack (docs/13 section 2.2). BP logging + lifestyle correlates.
// bp_control is a NON-DIAGNOSTIC self-monitoring index (higher = closer to a
// commonly-cited healthy range); it never diagnoses hypertension.
export const hypertensionPack: PackDefinition = {
  slug: "hypertension",
  name: "Hypertension Pack",
  description: "Blood pressure logging and lifestyle correlation.",
  version: "1.0.0",
  isEligible: () => false,
  metrics: [
    { slug: "systolic", label: "Systolic (mmHg)", kind: "numeric", sensitivity: "normal" },
    { slug: "diastolic", label: "Diastolic (mmHg)", kind: "numeric", sensitivity: "normal" },
    { slug: "bp_meds_taken", label: "BP medication taken", kind: "boolean", sensitivity: "normal" },
    { slug: "high_sodium_day", label: "High-sodium day", kind: "boolean", sensitivity: "normal" },
  ],
  indices: [
    {
      indexKind: "bp_control",
      label: "Blood Pressure Control",
      compute: ({ metricEntries, canonical }) => {
        const sys = metricNum(metricEntries, "systolic") ?? canonical?.systolicBP;
        const dia = metricNum(metricEntries, "diastolic") ?? canonical?.diastolicBP;
        return weightedAverage([
          { value: sys != null ? scoreTargetBand(sys, 80, 100, 120, 160) : undefined, weight: 0.6 },
          { value: dia != null ? scoreTargetBand(dia, 50, 65, 80, 100) : undefined, weight: 0.4 },
        ]);
      },
    },
  ],
  dashboard: { cards: [{ indexKind: "bp_control", title: "Blood Pressure Control", chart: "line" }] },
};
