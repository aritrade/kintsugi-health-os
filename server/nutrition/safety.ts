// P7 - Safety Engine. Validates every recommendation against the user's allergies,
// medication classes (food-drug interactions), and condition-based dietary
// restrictions BEFORE display. Flags risky items and offers safer alternatives.
// Deterministic; reads only the curated catalog.

import type { NutritionProfile, SafetyFinding, SafetyResult, SaferAlternative } from "@/types/nutrition";
import type { KnowledgeGraph } from "@/server/nutrition/knowledge";
import { foodsForNutrient } from "@/server/nutrition/knowledge";
import { canEat, hasAllergen } from "@/server/nutrition/personalize";

// Map common medication names onto the interaction medication_class values.
const MED_CLASS_ALIASES: Record<string, string> = {
  warfarin: "anticoagulant",
  coumadin: "anticoagulant",
  acenocoumarol: "anticoagulant",
  apixaban: "anticoagulant",
  lisinopril: "ace_inhibitor",
  ramipril: "ace_inhibitor",
  enalapril: "ace_inhibitor",
  perindopril: "ace_inhibitor",
  spironolactone: "potassium_sparing_diuretic",
  amiloride: "potassium_sparing_diuretic",
  eplerenone: "potassium_sparing_diuretic",
  levothyroxine: "levothyroxine",
  synthroid: "levothyroxine",
  thyroxine: "levothyroxine",
  atorvastatin: "statin",
  simvastatin: "statin",
  rosuvastatin: "statin",
  statin: "statin",
  tetracycline: "tetracycline_antibiotic",
  doxycycline: "tetracycline_antibiotic",
};

// Tag subjects in the interaction catalog that expand to multiple foods.
const TAG_FOODS: Record<string, string[]> = {
  vitamin_k_foods: ["spinach", "mustard_greens", "broccoli", "moringa"],
};

export function resolveMedicationClasses(meds: string[]): Set<string> {
  const out = new Set<string>();
  for (const m of meds) {
    const key = m.trim().toLowerCase();
    if (MED_CLASS_ALIASES[key]) out.add(MED_CLASS_ALIASES[key]);
    else out.add(key); // allow callers to pass a class directly
  }
  return out;
}

function resolveAlternatives(kg: KnowledgeGraph, slugs: string[], reason: string): SaferAlternative[] {
  const out: SaferAlternative[] = [];
  for (const slug of slugs) {
    const food = kg.foods.get(slug);
    if (food) out.push({ foodSlug: food.slug, foodName: food.name, reason });
  }
  return out;
}

// Safe, edible foods for the same nutrient (fallback alternatives).
function safeFoodsForNutrient(
  kg: KnowledgeGraph,
  nutrientSlug: string,
  profile: NutritionProfile,
  excludeFoodSlug: string,
  reason: string,
): SaferAlternative[] {
  return foodsForNutrient(kg, nutrientSlug)
    .filter((s) => s.food.slug !== excludeFoodSlug)
    .filter((s) => canEat(s.food, profile.dietType) && !hasAllergen(s.food, profile.allergies))
    .slice(0, 3)
    .map((s) => ({ foodSlug: s.food.slug, foodName: s.food.name, reason }));
}

// Validate one food/nutrient pairing for a user.
export function validateFood(
  kg: KnowledgeGraph,
  foodSlug: string,
  nutrientSlug: string,
  profile: NutritionProfile,
  medClasses: Set<string>,
): SafetyResult {
  const food = kg.foods.get(foodSlug);
  const findings: SafetyFinding[] = [];
  if (!food) return { status: "ok", findings };

  // 1) Allergy.
  if (hasAllergen(food, profile.allergies)) {
    findings.push({
      kind: "allergy",
      severity: "avoid",
      message: `${food.name} contains an allergen you listed (${food.allergens.join(", ")}).`,
      saferAlternatives: safeFoodsForNutrient(kg, nutrientSlug, profile, foodSlug, "Allergen-free source of the same nutrient"),
    });
  }

  // 2) Medication interactions (subject = this nutrient, this food, or a tag that includes it).
  for (const inter of kg.interactions) {
    if (!medClasses.has(inter.medicationClass)) continue;
    const matchesNutrient = inter.subjectKind === "nutrient" && inter.subject === nutrientSlug;
    const matchesFood = inter.subjectKind === "food" && inter.subject === foodSlug;
    const matchesTag = inter.subjectKind === "food" && (TAG_FOODS[inter.subject]?.includes(foodSlug) ?? false);
    if (matchesNutrient || matchesFood || matchesTag) {
      findings.push({
        kind: "medication",
        severity: inter.severity,
        message: inter.note,
        saferAlternatives: inter.saferAlternatives.length
          ? resolveAlternatives(kg, inter.saferAlternatives, "Lower-interaction option")
          : safeFoodsForNutrient(kg, nutrientSlug, profile, foodSlug, "Alternative source of the same nutrient"),
      });
    }
  }

  // 3) Condition-based dietary restrictions.
  const conditions = profile.conditions.map((c) => c.trim().toLowerCase());
  for (const r of kg.restrictions) {
    if (!conditions.includes(r.conditionSlug)) continue;
    const matchesNutrient = r.restrictedKind === "nutrient" && r.restricted === nutrientSlug;
    const matchesFood = r.restrictedKind === "food" && r.restricted === foodSlug;
    if (matchesNutrient || matchesFood) {
      findings.push({
        kind: "condition",
        severity: r.severity,
        message: r.rule,
        saferAlternatives: r.saferAlternatives.length
          ? resolveAlternatives(kg, r.saferAlternatives, "Better fit for your condition")
          : safeFoodsForNutrient(kg, nutrientSlug, profile, foodSlug, "Alternative source of the same nutrient"),
      });
    }
  }

  return { status: findings.length > 0 ? "flagged" : "ok", findings };
}
