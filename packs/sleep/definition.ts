import type { PackDefinition } from "@/types/packs";
import {
  normScale,
  normInverse,
  scoreSleepDuration,
  scoreAwakenings,
  penaltyDryMouthSnoring,
  weightedAverage,
} from "@/packs/normalize";

// Sleep Pack. Sleep Score + Recovery Score.
// Formulas: docs/20-index-formulas.md sections 2.1, 2.2 (inputs from the core
// daily check-in: sleep_quality, sleep_duration_min, night_awakenings,
// dry_mouth, snoring, energy, recovery, fatigue).
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
      // 0.40*quality + 0.30*duration + 0.20*awakenings + 0.10*dryMouth/snoring penalty
      compute: ({ core }) => {
        if (!core) return null;
        return weightedAverage([
          { value: core.sleepQuality != null ? normScale(core.sleepQuality) : undefined, weight: 0.4 },
          { value: core.sleepDurationMin != null ? scoreSleepDuration(core.sleepDurationMin) : undefined, weight: 0.3 },
          { value: core.nightAwakenings != null ? scoreAwakenings(core.nightAwakenings) : undefined, weight: 0.2 },
          {
            value:
              core.dryMouth != null || core.snoring != null
                ? penaltyDryMouthSnoring(core.dryMouth, core.snoring)
                : undefined,
            weight: 0.1,
          },
        ]);
      },
    },
    {
      indexKind: "recovery_score",
      label: "Recovery Score",
      // 0.40*energy + 0.40*recovery + 0.20*fatigue(inverse)
      compute: ({ core }) => {
        if (!core) return null;
        return weightedAverage([
          { value: core.energy != null ? normScale(core.energy) : undefined, weight: 0.4 },
          { value: core.recovery != null ? normScale(core.recovery) : undefined, weight: 0.4 },
          { value: core.fatigue != null ? normInverse(core.fatigue) : undefined, weight: 0.2 },
        ]);
      },
    },
  ],
  dashboard: {
    cards: [
      { indexKind: "sleep_score", title: "Sleep Score", chart: "line" },
      { indexKind: "recovery_score", title: "Recovery Score", chart: "line" },
    ],
  },
};
