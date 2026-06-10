// P5 - Evidence Framework. Maps the A-E grade hierarchy to plain-language labels
// and to a confidence weight, and selects the strongest available citation for a
// nutrient/condition or nutrient/symptom link.

import type { EvidenceGrade } from "@/types/nutrition";
import type { ConditionLink, KnowledgeGraph, SymptomLink } from "@/server/nutrition/knowledge";

export const GRADE_LABELS: Record<EvidenceGrade, string> = {
  A: "Strong (meta-analysis / systematic review)",
  B: "Moderate (controlled trials)",
  C: "Limited (observational / mixed)",
  D: "Preliminary",
  E: "Anecdotal",
};

const GRADE_CONFIDENCE: Record<EvidenceGrade, number> = {
  A: 0.9,
  B: 0.75,
  C: 0.55,
  D: 0.4,
  E: 0.25,
};

const GRADE_RANK: Record<EvidenceGrade, number> = { A: 5, B: 4, C: 3, D: 2, E: 1 };

export function gradeLabel(grade: EvidenceGrade | null): string {
  return grade ? GRADE_LABELS[grade] : "Reference data";
}

export function gradeToConfidence(grade: EvidenceGrade | null): number {
  return grade ? GRADE_CONFIDENCE[grade] : 0.4;
}

// Blend how suspected the nutrient gap is with how strong the supporting evidence is.
export function combineConfidence(factorConfidence: number, grade: EvidenceGrade | null): number {
  const blended = 0.5 * factorConfidence + 0.5 * gradeToConfidence(grade);
  return Math.round(Math.max(0, Math.min(1, blended)) * 100) / 100;
}

export interface BestEvidence {
  grade: EvidenceGrade | null;
  slug: string | null;
  mechanism: string | null;
}

// Strongest evidence + mechanism for a nutrient, optionally constrained to a condition.
export function bestEvidenceForNutrient(
  kg: KnowledgeGraph,
  nutrientSlug: string,
  conditionSlug?: string,
): BestEvidence {
  const candidates: (ConditionLink | SymptomLink)[] = [
    ...kg.conditionLinks.filter(
      (l) => l.nutrientSlug === nutrientSlug && (!conditionSlug || l.conditionSlug === conditionSlug),
    ),
    ...kg.symptomLinks.filter((l) => l.nutrientSlug === nutrientSlug),
  ];
  let best: BestEvidence = { grade: null, slug: null, mechanism: null };
  let bestRank = -1;
  for (const c of candidates) {
    const rank = c.evidenceGrade ? GRADE_RANK[c.evidenceGrade] : 0;
    if (rank > bestRank) {
      bestRank = rank;
      best = { grade: c.evidenceGrade, slug: c.evidenceSlug, mechanism: c.mechanism };
    }
  }
  return best;
}
