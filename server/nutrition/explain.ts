// P4 - Why Engine. Builds the "Why am I being told this?" drill-down for a single
// recommendation: the nutrient gap, the food's contribution, the biological
// mechanism, the evidence grade, and the overall confidence - every line passes
// the nutrition guardrails.

import type { Nutrient, RecommendationExplanation, SuspectedFactor } from "@/types/nutrition";
import { applyNutritionGuardrails } from "@/ai/nutrition-guardrails";
import { gradeLabel, type BestEvidence } from "@/server/nutrition/evidence";

export function buildExplanation(args: {
  factor: SuspectedFactor;
  nutrient: Nutrient;
  foodName: string;
  amount: number;
  servingDesc: string | null;
  evidence: BestEvidence;
  confidence: number;
}): RecommendationExplanation {
  const { factor, nutrient, foodName, amount, servingDesc, evidence, confidence } = args;
  const topReason = factor.reasoning[0]?.detail ?? `a suspected gap in ${nutrient.name}`;

  const rawReasoning = [
    `This came up because of ${factor.factor.toLowerCase()} - ${topReason}`,
    `${foodName} provides about ${amount} ${nutrient.unit} of ${nutrient.name}${servingDesc ? ` per ${servingDesc}` : ""}.`,
    evidence.mechanism
      ? `${nutrient.name} ${evidence.mechanism}.`
      : `${nutrient.name} plays a role in ${nutrient.category ?? "everyday"} processes.`,
    `Evidence strength: ${gradeLabel(evidence.grade)}.`,
    `Overall confidence in this association: ${Math.round(confidence * 100)}%.`,
  ];
  const { lines } = applyNutritionGuardrails(rawReasoning);

  return {
    recommendation: `Foods that provide ${nutrient.name} include ${foodName}.`,
    nutrients: [nutrient.name],
    mechanism: evidence.mechanism,
    evidenceGrade: evidence.grade,
    evidenceLabel: gradeLabel(evidence.grade),
    confidence: Math.round(confidence * 100) / 100,
    reasoning: lines,
  };
}
