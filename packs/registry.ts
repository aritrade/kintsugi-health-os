import type { PackDefinition } from "@/types/packs";
import type { Profile } from "@/types";
import { sleepPack } from "@/packs/sleep/definition";
import { sexualHealthPack } from "@/packs/sexual-health/definition";
import { weightPack } from "@/packs/weight/definition";
import { thyroidPack } from "@/packs/thyroid/definition";
import { hypertensionPack } from "@/packs/hypertension/definition";
import { pcosPack } from "@/packs/pcos/definition";
import { fertilityPack } from "@/packs/fertility/definition";
import { menopausePack } from "@/packs/menopause/definition";
import { chronicFatiguePack } from "@/packs/chronic-fatigue/definition";
import { mentalHealthPack } from "@/packs/mental-health/definition";
import { longevityPack } from "@/packs/longevity/definition";

// Central pack registry. Adding a pack = adding it here (plus seed rows).
// Core never imports a specific pack directly; it goes through this registry.
export const ALL_PACKS: PackDefinition[] = [
  sleepPack,
  sexualHealthPack,
  weightPack,
  thyroidPack,
  hypertensionPack,
  pcosPack,
  fertilityPack,
  menopausePack,
  chronicFatiguePack,
  mentalHealthPack,
  longevityPack,
];

export function eligiblePacks(profile: Profile): PackDefinition[] {
  return ALL_PACKS.filter((pack) => pack.isEligible(profile));
}

export function getPack(slug: string): PackDefinition | undefined {
  return ALL_PACKS.find((pack) => pack.slug === slug);
}

// Metrics visible to a user, filtered by biological sex scope.
export function metricsForProfile(pack: PackDefinition, profile: Pick<Profile, "biologicalSex">) {
  return pack.metrics.filter((m) => !m.sexScope || m.sexScope === profile.biologicalSex);
}

// Packs a user can browse/activate in the marketplace, filtered by sex scope
// (a pack scoped entirely to the other sex is hidden).
export function marketplacePacks(profile: Pick<Profile, "biologicalSex">): PackDefinition[] {
  return ALL_PACKS.filter((pack) => {
    const visibleMetrics = metricsForProfile(pack, profile);
    return visibleMetrics.length > 0;
  });
}
