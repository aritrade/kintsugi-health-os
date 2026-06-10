// P8 - Meal Plan Engine. Deterministic, nutrient-driven plan: assembles
// breakfast / lunch / dinner / snacks from personalized, edible foods that cover
// the target nutrients (greedy coverage), plus a hydration note. No prescriptions -
// just "foods to consider" framing.

import type { Food, MealItem, MealPlan, NutritionProfile } from "@/types/nutrition";
import { canEat, hasAllergen, isCulturalMatch, isDisliked } from "@/server/nutrition/personalize";
import { nutrientsInFood, type KnowledgeGraph } from "@/server/nutrition/knowledge";

const SLOTS: (keyof Pick<MealPlan, "breakfast" | "lunch" | "dinner" | "snacks">)[] = [
  "breakfast",
  "lunch",
  "dinner",
  "snacks",
];
// Catalog uses singular "snack" for the snacks slot.
const SLOT_TAG: Record<string, string> = { breakfast: "breakfast", lunch: "lunch", dinner: "dinner", snacks: "snack" };

function edibleFoods(kg: KnowledgeGraph, profile: NutritionProfile): Food[] {
  return [...kg.foods.values()].filter(
    (f) => canEat(f, profile.dietType) && !hasAllergen(f, profile.allergies) && !isDisliked(f, profile.dislikedFoods),
  );
}

export function buildMealPlan(
  kg: KnowledgeGraph,
  targetNutrients: string[],
  profile: NutritionProfile,
): MealPlan {
  const targets = new Set(targetNutrients);
  const covered = new Set<string>();
  const foods = edibleFoods(kg, profile);

  const plan: MealPlan = {
    targetNutrients,
    breakfast: [],
    lunch: [],
    dinner: [],
    snacks: [],
    hydration: "Sip water through the day; pair meals with a glass of water.",
    notes: [],
  };

  const makeItem = (food: Food, provides: string[]): MealItem => {
    const fn = kg.foodNutrients.find((x) => x.foodSlug === food.slug);
    return {
      foodSlug: food.slug,
      foodName: food.name,
      servingDesc: fn?.servingDesc ?? null,
      providesNutrients: provides.map((s) => kg.nutrients.get(s)?.name ?? s),
    };
  };

  for (const slot of SLOTS) {
    const tag = SLOT_TAG[slot];
    const candidates = foods.filter((f) => f.mealSlots.includes(tag));
    const picks: Food[] = [];

    // Greedy: pick foods that cover the most still-uncovered target nutrients.
    for (let n = 0; n < 2; n++) {
      let best: { food: Food; gain: number; provides: string[] } | null = null;
      for (const f of candidates) {
        if (picks.includes(f)) continue;
        const provided = nutrientsInFood(kg, f.slug).filter((s) => targets.has(s));
        const gain = provided.filter((s) => !covered.has(s)).length + (isCulturalMatch(f, profile) ? 0.25 : 0);
        if (gain <= 0) continue;
        if (!best || gain > best.gain) best = { food: f, gain, provides: provided };
      }
      if (!best) break;
      picks.push(best.food);
      for (const s of best.provides) covered.add(s);
      plan[slot].push(makeItem(best.food, best.provides));
    }
  }

  const coveredNames = [...covered].map((s) => kg.nutrients.get(s)?.name ?? s);
  if (coveredNames.length > 0) {
    plan.notes.push(`This plan emphasises foods that provide ${coveredNames.join(", ")}.`);
  }
  const missing = [...targets].filter((s) => !covered.has(s)).map((s) => kg.nutrients.get(s)?.name ?? s);
  if (missing.length > 0) {
    plan.notes.push(`Foods for ${missing.join(", ")} didn't fit your filters here - the recommendations list has more options.`);
  }

  return plan;
}
