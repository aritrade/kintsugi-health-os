// P3 - Recommendation Engine. Turns suspected nutrient factors into ranked,
// personalized, nutrients-first food suggestions. Each suggestion is explained
// (Why Engine), graded (Evidence Framework), and validated (Safety Engine) before
// it is ever shown. Output phrasing is always "foods that provide X include ...".

import type { FoodRecommendation, NutritionProfile, SuspectedFactor } from "@/types/nutrition";
import { bestEvidenceForNutrient, combineConfidence } from "@/server/nutrition/evidence";
import { buildExplanation } from "@/server/nutrition/explain";
import { personalizedFoodsForNutrient } from "@/server/nutrition/personalize";
import { resolveMedicationClasses, validateFood } from "@/server/nutrition/safety";
import type { KnowledgeGraph } from "@/server/nutrition/knowledge";

export interface RecommendOptions {
  maxNutrients?: number;
  foodsPerNutrient?: number;
  maxTotal?: number;
  medications?: string[];
}

export function buildRecommendations(
  kg: KnowledgeGraph,
  factors: SuspectedFactor[],
  profile: NutritionProfile,
  options: RecommendOptions = {},
): FoodRecommendation[] {
  const maxNutrients = options.maxNutrients ?? 4;
  const foodsPerNutrient = options.foodsPerNutrient ?? 3;
  const maxTotal = options.maxTotal ?? 9;
  const medClasses = resolveMedicationClasses(options.medications ?? []);

  const recs: FoodRecommendation[] = [];
  const seen = new Set<string>();

  for (const factor of factors.slice(0, maxNutrients)) {
    const nutrient = kg.nutrients.get(factor.nutrientSlug);
    if (!nutrient) continue;
    const evidence = bestEvidenceForNutrient(kg, factor.nutrientSlug);
    const confidence = combineConfidence(factor.confidence, evidence.grade);
    const ranked = personalizedFoodsForNutrient(kg, factor.nutrientSlug, profile);

    let added = 0;
    for (const r of ranked) {
      if (added >= foodsPerNutrient) break;
      const key = `${factor.nutrientSlug}:${r.food.slug}`;
      if (seen.has(key)) continue;

      const safety = validateFood(kg, r.food.slug, factor.nutrientSlug, profile, medClasses);
      // Skip outright only if an allergen slipped through; flagged items stay (with warnings).
      if (safety.findings.some((f) => f.kind === "allergy")) continue;

      const explanation = buildExplanation({
        factor,
        nutrient,
        foodName: r.food.name,
        amount: r.amount,
        servingDesc: r.servingDesc,
        evidence,
        confidence,
      });

      recs.push({
        nutrientSlug: factor.nutrientSlug,
        nutrientName: nutrient.name,
        foodSlug: r.food.slug,
        foodName: r.food.name,
        amount: r.amount,
        unit: nutrient.unit,
        servingDesc: r.servingDesc,
        why: `Foods that provide ${nutrient.name} include ${r.food.name}.`,
        mechanism: evidence.mechanism,
        evidenceGrade: evidence.grade,
        confidence: safety.status === "flagged" ? Math.round(confidence * 80) / 100 : confidence,
        safetyStatus: safety.status,
        safetyNotes: safety.findings.map((f) => f.message),
        saferAlternatives: safety.findings.flatMap((f) => f.saferAlternatives),
        explanation,
        culturalMatch: r.culturalMatch,
      });
      seen.add(key);
      added++;
      if (recs.length >= maxTotal) return recs;
    }
  }

  return recs;
}
