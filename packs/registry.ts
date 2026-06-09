import type { PackDefinition } from "@/types/packs";
import type { Profile } from "@/types";
import { sleepPack } from "@/packs/sleep/definition";
import { sexualHealthPack } from "@/packs/sexual-health/definition";

// Central pack registry. Adding a pack = adding it here (plus seed rows).
// Core never imports a specific pack directly; it goes through this registry.
export const ALL_PACKS: PackDefinition[] = [sleepPack, sexualHealthPack];

export function eligiblePacks(profile: Profile): PackDefinition[] {
  return ALL_PACKS.filter((pack) => pack.isEligible(profile));
}

export function getPack(slug: string): PackDefinition | undefined {
  return ALL_PACKS.find((pack) => pack.slug === slug);
}

// Metrics visible to a user, filtered by biological sex scope.
export function metricsForProfile(pack: PackDefinition, profile: Profile) {
  return pack.metrics.filter((m) => !m.sexScope || m.sexScope === profile.biologicalSex);
}
