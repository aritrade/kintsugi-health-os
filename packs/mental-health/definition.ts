import type { PackDefinition } from "@/types/packs";
import { normScale, normInverse, weightedAverage, metricNum } from "@/packs/normalize";

// Mental Health Pack (docs/14 section 2.1). mood_stability is higher = better.
// Dedicated slugs avoid clashing with core check-in mood/anxiety. Non-diagnostic.
export const mentalHealthPack: PackDefinition = {
  slug: "mental-health",
  name: "Mental Health Pack",
  description: "Mood, anxiety, motivation, and connection tracking.",
  version: "1.0.0",
  isEligible: () => false,
  metrics: [
    { slug: "mh_mood", label: "Mood", kind: "scale", min: 1, max: 10, sensitivity: "sensitive" },
    { slug: "mh_anxiety", label: "Anxiety", kind: "scale", min: 1, max: 10, sensitivity: "sensitive" },
    { slug: "mh_motivation", label: "Motivation", kind: "scale", min: 1, max: 10, sensitivity: "sensitive" },
    { slug: "mh_social", label: "Social connection", kind: "scale", min: 1, max: 10, sensitivity: "sensitive" },
    { slug: "mh_intrusive", label: "Intrusive thoughts", kind: "scale", min: 1, max: 10, sensitivity: "sensitive" },
  ],
  indices: [
    {
      indexKind: "mood_stability",
      label: "Mood Stability",
      compute: ({ metricEntries }) => {
        const mood = metricNum(metricEntries, "mh_mood");
        const anxiety = metricNum(metricEntries, "mh_anxiety");
        const motivation = metricNum(metricEntries, "mh_motivation");
        const social = metricNum(metricEntries, "mh_social");
        const intrusive = metricNum(metricEntries, "mh_intrusive");
        return weightedAverage([
          { value: mood != null ? normScale(mood) : undefined, weight: 0.3 },
          { value: anxiety != null ? normInverse(anxiety) : undefined, weight: 0.25 },
          { value: motivation != null ? normScale(motivation) : undefined, weight: 0.2 },
          { value: social != null ? normScale(social) : undefined, weight: 0.15 },
          { value: intrusive != null ? normInverse(intrusive) : undefined, weight: 0.1 },
        ]);
      },
    },
  ],
  dashboard: { cards: [{ indexKind: "mood_stability", title: "Mood Stability", chart: "line" }] },
};
