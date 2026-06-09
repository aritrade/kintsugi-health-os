import type { PackDefinition } from "@/types/packs";
import { normScale, metricNum } from "@/packs/normalize";

// Menopause Pack (docs/14 section 2.1, female). menopause_symptom_load is a
// symptom-LOAD index (higher = more burden), never a diagnosis.
export const menopausePack: PackDefinition = {
  slug: "menopause",
  name: "Menopause Pack",
  description: "Perimenopause / menopause symptom tracking.",
  version: "1.0.0",
  isEligible: () => false,
  metrics: [
    { slug: "hot_flashes", label: "Hot flashes", kind: "scale", min: 1, max: 10, sexScope: "female", sensitivity: "highly_sensitive" },
    { slug: "night_sweats", label: "Night sweats", kind: "scale", min: 1, max: 10, sexScope: "female", sensitivity: "highly_sensitive" },
    { slug: "meno_sleep_disruption", label: "Sleep disruption", kind: "scale", min: 1, max: 10, sexScope: "female", sensitivity: "highly_sensitive" },
    { slug: "meno_mood_changes", label: "Mood changes", kind: "scale", min: 1, max: 10, sexScope: "female", sensitivity: "highly_sensitive" },
    { slug: "vaginal_dryness", label: "Vaginal dryness", kind: "scale", min: 1, max: 10, sexScope: "female", sensitivity: "highly_sensitive" },
  ],
  indices: [
    {
      indexKind: "menopause_symptom_load",
      label: "Menopause Symptom Load",
      sexScope: "female",
      compute: ({ metricEntries }) => {
        const slugs = ["hot_flashes", "night_sweats", "meno_sleep_disruption", "meno_mood_changes", "vaginal_dryness"];
        const vals = slugs.map((s) => metricNum(metricEntries, s)).filter((v): v is number => v != null);
        if (vals.length === 0) return null;
        return Math.round(vals.reduce((a, b) => a + normScale(b), 0) / vals.length);
      },
    },
  ],
  dashboard: { cards: [{ indexKind: "menopause_symptom_load", title: "Menopause Symptom Load", chart: "line" }] },
};
