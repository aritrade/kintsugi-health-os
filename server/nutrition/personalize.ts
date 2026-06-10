// P6 - Personalization. Deterministic filters + ranking for diet type, allergies,
// religion, region, culture, budget, and disliked foods. Used by the
// Recommendation Engine and Meal Plan Engine so every suggestion is edible and
// culturally relevant for the user.

import type { Food, NutritionProfile } from "@/types/nutrition";
import { foodsForNutrient, type FoodSource, type KnowledgeGraph } from "@/server/nutrition/knowledge";

// Normalize common allergy phrasings onto catalog allergen tags.
const ALLERGEN_ALIASES: Record<string, string> = {
  nuts: "tree_nut",
  "tree nuts": "tree_nut",
  nut: "tree_nut",
  almond: "tree_nut",
  milk: "dairy",
  lactose: "dairy",
  shellfish: "fish",
  seafood: "fish",
  eggs: "egg",
  soya: "soy",
  til: "sesame",
};

function normalizeAllergen(raw: string): string {
  const a = raw.trim().toLowerCase();
  return ALLERGEN_ALIASES[a] ?? a;
}

export function canEat(food: Food, dietType: NutritionProfile["dietType"]): boolean {
  if (dietType === "omnivore") return true;
  return Boolean(food.dietFlags[dietType]);
}

export function hasAllergen(food: Food, allergies: string[]): boolean {
  if (allergies.length === 0) return false;
  const normalized = allergies.map(normalizeAllergen);
  return food.allergens.some((a) => normalized.includes(a.toLowerCase()));
}

export function isDisliked(food: Food, disliked: string[]): boolean {
  if (disliked.length === 0) return false;
  const norm = disliked.map((d) => d.trim().toLowerCase());
  return norm.includes(food.slug) || norm.includes(food.name.toLowerCase());
}

// Religion-driven exclusions kept simple + transparent (extendable in the catalog later).
function violatesReligion(food: Food, restrictions: string[]): boolean {
  const r = restrictions.map((x) => x.trim().toLowerCase());
  if (r.some((x) => /halal|kosher/.test(x)) && food.slug === "beef") return false; // beef can be halal/kosher if certified
  if (r.some((x) => /no beef|hindu/.test(x)) && food.slug === "beef") return true;
  if (r.some((x) => /no pork|halal|kosher/.test(x)) && food.slug === "pork") return true;
  if (r.some((x) => /jain|no onion|no root/.test(x)) && /onion|garlic|potato/.test(food.slug)) return true;
  return false;
}

// Does the food align with the user's region / cultural preferences?
export function isCulturalMatch(food: Food, profile: NutritionProfile): boolean {
  const region = (profile.region ?? "").trim().toLowerCase();
  const prefs = profile.culturalPrefs.map((p) => p.trim().toLowerCase());
  const regionHit = region.length > 0 && food.regionTags.some((t) => t.toLowerCase().includes(region) || region.includes(t.toLowerCase()));
  const cultureHit = food.culturalTags.some((t) => prefs.includes(t.toLowerCase()));
  return regionHit || cultureHit;
}

export interface RankedFood extends FoodSource {
  culturalMatch: boolean;
}

// Edible foods for a nutrient, ranked by content with a cultural/region boost.
export function personalizedFoodsForNutrient(
  kg: KnowledgeGraph,
  nutrientSlug: string,
  profile: NutritionProfile,
): RankedFood[] {
  const sources = foodsForNutrient(kg, nutrientSlug);
  const maxAmount = sources.reduce((m, s) => Math.max(m, s.amount), 1);

  return sources
    .filter((s) => canEat(s.food, profile.dietType))
    .filter((s) => !hasAllergen(s.food, profile.allergies))
    .filter((s) => !isDisliked(s.food, profile.dislikedFoods))
    .filter((s) => !violatesReligion(s.food, profile.religiousRestrictions))
    .map((s) => ({ ...s, culturalMatch: isCulturalMatch(s.food, profile) }))
    .sort((a, b) => {
      // Normalized nutrient density (0..1) plus a cultural boost.
      const scoreA = a.amount / maxAmount + (a.culturalMatch ? 0.35 : 0);
      const scoreB = b.amount / maxAmount + (b.culturalMatch ? 0.35 : 0);
      return scoreB - scoreA;
    });
}
