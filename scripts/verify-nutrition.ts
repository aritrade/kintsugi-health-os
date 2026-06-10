/**
 * Deterministic verification for the Nutrition Intelligence Engine. Pure - runs
 * the assessment -> recommend -> explain -> mealplan pipeline plus the safety
 * engine and guardrails against an in-memory Knowledge Graph fixture (no DB).
 *
 * Run: npx tsx scripts/verify-nutrition.ts
 */
import type { Food, Nutrient, NutritionProfile } from "@/types/nutrition";
import type { KnowledgeGraph } from "@/server/nutrition/knowledge";
import { runAssessment } from "@/server/nutrition/assessment";
import { buildRecommendations } from "@/server/nutrition/recommend";
import { buildMealPlan } from "@/server/nutrition/mealplan";
import { validateFood, resolveMedicationClasses } from "@/server/nutrition/safety";
import { scanNutritionStatement, NUTRITION_DISCLAIMER } from "@/ai/nutrition-guardrails";

let pass = 0;
let fail = 0;
function check(name: string, cond: boolean) {
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}`);
  cond ? pass++ : fail++;
}

// --- Fixture Knowledge Graph -------------------------------------------------
const nutrient = (slug: string, name: string, unit: string): Nutrient => ({
  slug,
  name,
  unit,
  category: "test",
  rda: {},
  description: null,
});
const food = (slug: string, name: string, extra: Partial<Food> = {}): Food => ({
  slug,
  name,
  category: "test",
  regionTags: [],
  dietFlags: { vegetarian: true, vegan: true, pescatarian: true },
  allergens: [],
  culturalTags: [],
  mealSlots: ["breakfast", "lunch", "dinner", "snack"],
  ...extra,
});

const kg: KnowledgeGraph = {
  nutrients: new Map([
    ["vitamin_d", nutrient("vitamin_d", "Vitamin D", "mcg")],
    ["iron", nutrient("iron", "Iron", "mg")],
    ["calcium", nutrient("calcium", "Calcium", "mg")],
    ["magnesium", nutrient("magnesium", "Magnesium", "mg")],
    ["potassium", nutrient("potassium", "Potassium", "mg")],
  ]),
  foods: new Map([
    ["spinach", food("spinach", "Spinach")],
    ["milk_fortified", food("milk_fortified", "Fortified milk", { dietFlags: { vegetarian: true, pescatarian: true }, allergens: ["dairy"] })],
    ["banana", food("banana", "Banana")],
    ["mustard_greens", food("mustard_greens", "Mustard greens", { regionTags: ["West Bengal"], culturalTags: ["bengali"] })],
    ["sesame_seeds", food("sesame_seeds", "Sesame seeds", { allergens: ["sesame"] })],
  ]),
  foodNutrients: [
    { foodSlug: "spinach", nutrientSlug: "iron", amount: 3.6, servingDesc: "100 g" },
    { foodSlug: "spinach", nutrientSlug: "calcium", amount: 136, servingDesc: "100 g" },
    { foodSlug: "spinach", nutrientSlug: "magnesium", amount: 79, servingDesc: "100 g" },
    { foodSlug: "milk_fortified", nutrientSlug: "calcium", amount: 300, servingDesc: "240 ml" },
    { foodSlug: "milk_fortified", nutrientSlug: "vitamin_d", amount: 3, servingDesc: "240 ml" },
    { foodSlug: "banana", nutrientSlug: "potassium", amount: 422, servingDesc: "1 medium" },
    { foodSlug: "banana", nutrientSlug: "magnesium", amount: 32, servingDesc: "1 medium" },
    { foodSlug: "mustard_greens", nutrientSlug: "calcium", amount: 165, servingDesc: "100 g" },
    { foodSlug: "mustard_greens", nutrientSlug: "iron", amount: 1.5, servingDesc: "100 g" },
    { foodSlug: "sesame_seeds", nutrientSlug: "calcium", amount: 280, servingDesc: "28 g" },
    { foodSlug: "sesame_seeds", nutrientSlug: "iron", amount: 4.1, servingDesc: "28 g" },
  ],
  symptomLinks: [
    { nutrientSlug: "iron", nutrientName: "Iron", symptom: "fatigue", weight: 0.6, mechanism: "is built into hemoglobin", evidenceSlug: "ev_iron", evidenceGrade: "B" },
    { nutrientSlug: "magnesium", nutrientName: "Magnesium", symptom: "muscle cramps", weight: 0.6, mechanism: "supports muscle contraction", evidenceSlug: "ev_mag", evidenceGrade: "C" },
    { nutrientSlug: "calcium", nutrientName: "Calcium", symptom: "muscle cramps", weight: 0.4, mechanism: "supports muscle contraction", evidenceSlug: "ev_cal", evidenceGrade: "A" },
  ],
  conditionLinks: [
    { conditionSlug: "bone_health", nutrientSlug: "calcium", nutrientName: "Calcium", relationship: "supports", mechanism: "is deposited into bone", evidenceSlug: "ev_cal", evidenceGrade: "A" },
    { conditionSlug: "bone_health", nutrientSlug: "vitamin_d", nutrientName: "Vitamin D", relationship: "supports", mechanism: "helps absorb calcium", evidenceSlug: "ev_vitd", evidenceGrade: "A" },
  ],
  labMarkers: [
    { nutrientSlug: "vitamin_d", nutrientName: "Vitamin D", biomarkerSlug: "vitamin_d", lowThreshold: 30, unit: "ng/mL" },
    { nutrientSlug: "iron", nutrientName: "Iron", biomarkerSlug: "ferritin", lowThreshold: 30, unit: "ng/mL" },
  ],
  evidence: new Map([
    ["ev_iron", { slug: "ev_iron", citation: "Iron + fatigue", sourceType: "rct", grade: "B", note: null, url: null }],
    ["ev_cal", { slug: "ev_cal", citation: "Calcium + bone", sourceType: "meta_analysis", grade: "A", note: null, url: null }],
    ["ev_vitd", { slug: "ev_vitd", citation: "Vitamin D + bone", sourceType: "meta_analysis", grade: "A", note: null, url: null }],
    ["ev_mag", { slug: "ev_mag", citation: "Magnesium + cramps", sourceType: "rct", grade: "C", note: null, url: null }],
  ]),
  interactions: [
    { subject: "vitamin_k_foods", subjectKind: "food", medicationClass: "anticoagulant", severity: "caution", note: "Steady vitamin-K greens with blood thinners.", saferAlternatives: ["milk_fortified"] },
    { subject: "potassium", subjectKind: "nutrient", medicationClass: "ace_inhibitor", severity: "caution", note: "High potassium can interact with ACE inhibitors.", saferAlternatives: [] },
  ],
  restrictions: [
    { conditionSlug: "ckd", restricted: "banana", restrictedKind: "food", rule: "Bananas are high in potassium and often limited in CKD.", severity: "avoid", saferAlternatives: ["spinach"] },
    { conditionSlug: "ckd", restricted: "potassium", restrictedKind: "nutrient", rule: "Limit potassium in CKD.", severity: "avoid", saferAlternatives: [] },
  ],
};

const baseProfile: NutritionProfile = {
  dietType: "omnivore",
  allergies: [],
  religiousRestrictions: [],
  budget: null,
  region: "West Bengal",
  culturalPrefs: ["bengali"],
  dislikedFoods: [],
  goals: [],
  conditions: [],
};

// --- Assessment ---------------------------------------------------------------
const assessment = runAssessment(kg, {
  symptoms: ["fatigue", "muscle cramps"],
  labs: { vitamin_d: 18, ferritin: 25 },
  goals: ["improve bone health"],
});
const slugs = assessment.suspectedFactors.map((f) => f.nutrientSlug);
check("assessment surfaces vitamin_d (lab)", slugs.includes("vitamin_d"));
check("assessment surfaces iron (lab + symptom)", slugs.includes("iron"));
check("assessment surfaces magnesium (symptom)", slugs.includes("magnesium"));
check("assessment surfaces calcium (goal: bone health)", slugs.includes("calcium"));
check(
  "lab-confirmed factors are labelled 'insufficiency'",
  assessment.suspectedFactors.find((f) => f.nutrientSlug === "vitamin_d")?.factor.includes("insufficiency") === true,
);
check("every factor has >=1 reasoning step", assessment.suspectedFactors.every((f) => f.reasoning.length > 0));
check("factors sorted by confidence (desc)", assessment.suspectedFactors.every((f, i, a) => i === 0 || a[i - 1].confidence >= f.confidence));
check("assessment includes the nutrition disclaimer", assessment.disclaimers.includes(NUTRITION_DISCLAIMER));

// --- Recommendations ----------------------------------------------------------
const recs = buildRecommendations(kg, assessment.suspectedFactors, baseProfile, {});
check("recommendations produced", recs.length > 0);
check("every rec names a nutrient", recs.every((r) => r.nutrientName.length > 0));
check("every rec has mechanism OR evidence grade", recs.every((r) => Boolean(r.mechanism) || Boolean(r.evidenceGrade)));
check("every rec confidence in (0,1]", recs.every((r) => r.confidence > 0 && r.confidence <= 1));
check("every rec uses nutrients-first phrasing", recs.every((r) => r.why.startsWith("Foods that provide")));
check("every rec explanation passes guardrails (>=1 line)", recs.every((r) => r.explanation.reasoning.length > 0));
check("cultural pick surfaced (mustard greens for a Bengali user)", recs.some((r) => r.foodSlug === "mustard_greens"));

// --- Personalization safety: allergy filtering --------------------------------
const veganProfile: NutritionProfile = { ...baseProfile, dietType: "vegan", allergies: ["dairy"] };
const veganRecs = buildRecommendations(kg, assessment.suspectedFactors, veganProfile, {});
check("dairy allergen filtered out for calcium", veganRecs.every((r) => r.foodSlug !== "milk_fortified"));

// --- Safety Engine ------------------------------------------------------------
const ckdProfile: NutritionProfile = { ...baseProfile, conditions: ["ckd"] };
const bananaSafety = validateFood(kg, "banana", "potassium", ckdProfile, resolveMedicationClasses([]));
check("CKD flags banana (potassium)", bananaSafety.status === "flagged");
check("CKD banana offers safer alternative", bananaSafety.findings.some((f) => f.saferAlternatives.length > 0));

const warfarinSafety = validateFood(kg, "spinach", "iron", baseProfile, resolveMedicationClasses(["warfarin"]));
check("warfarin flags vitamin-K greens (spinach)", warfarinSafety.status === "flagged");

const okSafety = validateFood(kg, "sesame_seeds", "calcium", baseProfile, resolveMedicationClasses([]));
check("safe food passes safety with no meds/conditions", okSafety.status === "ok");

// --- Meal plan ----------------------------------------------------------------
const plan = buildMealPlan(kg, ["calcium", "iron"], baseProfile);
const totalItems = plan.breakfast.length + plan.lunch.length + plan.dinner.length + plan.snacks.length;
check("meal plan has items", totalItems > 0);
check("meal plan has hydration guidance", plan.hydration.length > 0);

// --- Guardrails ---------------------------------------------------------------
check("guardrail blocks 'cure' claim", scanNutritionStatement("This will cure your anemia.").blocked);
check("guardrail blocks 'treat' claim", scanNutritionStatement("Eat this to treat your condition.").blocked);
check("guardrail blocks supplement dosing", scanNutritionStatement("Take 50 mg of iron supplement daily.").blocked);
const reframed = scanNutritionStatement("You should eat spinach for iron.");
check("guardrail reframes 'you should eat' (not blocked)", !reframed.blocked && reframed.flags.length > 0);
check("guardrail keeps benign nutrients-first phrasing", !scanNutritionStatement("Foods that provide iron include spinach.").blocked);

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
