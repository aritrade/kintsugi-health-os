// Domain types for the Nutrition Intelligence Engine (deterministic, evidence-first).
// Mirrors the catalog in supabase/migrations/0009_nutrition.sql + 0010_nutrition_seed.sql.

import type { GuardrailFlag } from "@/types";

export type EvidenceGrade = "A" | "B" | "C" | "D" | "E";
export type DietType = "omnivore" | "vegetarian" | "vegan" | "pescatarian";
export type Budget = "low" | "medium" | "high";
export type SafetyStatus = "ok" | "flagged";
export type SafetySeverity = "caution" | "avoid";
export type RecommendationAction = "shown" | "accepted" | "dismissed";

// --- Catalog (Knowledge Graph) -------------------------------------------------

export interface Nutrient {
  slug: string;
  name: string;
  unit: string;
  category: string | null;
  rda: Record<string, number>;
  description: string | null;
}

export interface Food {
  slug: string;
  name: string;
  category: string | null;
  regionTags: string[];
  dietFlags: { vegetarian?: boolean; vegan?: boolean; pescatarian?: boolean };
  allergens: string[];
  culturalTags: string[];
  mealSlots: string[];
}

export interface FoodNutrient {
  foodSlug: string;
  nutrientSlug: string;
  amount: number;
  servingDesc: string | null;
}

export interface EvidenceSource {
  slug: string;
  citation: string;
  sourceType: string;
  grade: EvidenceGrade;
  note: string | null;
  url: string | null;
}

// --- Assessment ---------------------------------------------------------------

export interface AssessmentInput {
  symptoms?: string[];
  conditions?: string[];
  labs?: Record<string, number>; // biomarker slug -> value
  medications?: string[];
  goals?: string[];
}

export interface ReasoningStep {
  source: "lab" | "symptom" | "condition" | "goal";
  detail: string;
  contribution: number; // 0..1
}

export interface SuspectedFactor {
  nutrientSlug: string;
  nutrientName: string;
  factor: string; // e.g. "Vitamin D insufficiency"
  confidence: number; // 0..1
  reasoning: ReasoningStep[];
  labConfirmed: boolean;
}

export interface AssessmentResult {
  assessmentId?: string;
  suspectedFactors: SuspectedFactor[];
  reasoning: string[]; // plain-language, guardrailed summary lines
  disclaimers: string[];
}

// --- Recommendations + Why Engine ---------------------------------------------

export interface NutritionProfile {
  dietType: DietType;
  allergies: string[];
  religiousRestrictions: string[];
  budget: Budget | null;
  region: string | null;
  culturalPrefs: string[];
  dislikedFoods: string[];
  goals: string[];
  conditions: string[];
}

export interface SaferAlternative {
  foodSlug: string;
  foodName: string;
  reason: string;
}

export interface RecommendationExplanation {
  recommendation: string;
  nutrients: string[];
  mechanism: string | null;
  evidenceGrade: EvidenceGrade | null;
  evidenceLabel: string;
  confidence: number;
  reasoning: string[];
}

export interface FoodRecommendation {
  id?: string;
  nutrientSlug: string;
  nutrientName: string;
  foodSlug: string;
  foodName: string;
  amount: number;
  unit: string;
  servingDesc: string | null;
  why: string;
  mechanism: string | null;
  evidenceGrade: EvidenceGrade | null;
  confidence: number;
  safetyStatus: SafetyStatus;
  safetyNotes: string[];
  saferAlternatives: SaferAlternative[];
  explanation: RecommendationExplanation;
  culturalMatch: boolean;
}

// --- Safety -------------------------------------------------------------------

export interface SafetyFinding {
  kind: "allergy" | "medication" | "condition";
  severity: SafetySeverity;
  message: string;
  saferAlternatives: SaferAlternative[];
}

export interface SafetyResult {
  status: SafetyStatus;
  findings: SafetyFinding[];
}

// --- Meal plan ----------------------------------------------------------------

export interface MealItem {
  foodSlug: string;
  foodName: string;
  servingDesc: string | null;
  providesNutrients: string[];
}

export interface MealPlan {
  id?: string;
  targetNutrients: string[];
  breakfast: MealItem[];
  lunch: MealItem[];
  dinner: MealItem[];
  snacks: MealItem[];
  hydration: string;
  notes: string[];
}

// --- Outcomes -----------------------------------------------------------------

export interface OutcomeDelta {
  metric: string;
  label: string;
  baseline: number | null;
  followUp: number | null;
  delta: number | null;
  direction: "up" | "down" | "flat" | "unknown";
  improved: boolean | null;
}

export interface OutcomeResult {
  windowStart: string;
  windowEnd: string;
  deltas: OutcomeDelta[];
  narrative: string[];
}

// --- Copilot ------------------------------------------------------------------

export interface CopilotResponse {
  system: "nutrition";
  emergency?: boolean;
  paragraphs: string[];
  suspectedFactors: SuspectedFactor[];
  recommendations: FoodRecommendation[];
  mealPlan: MealPlan | null;
  questions: string[];
  disclaimers: string[];
  guardrailFlags: GuardrailFlag[];
}
