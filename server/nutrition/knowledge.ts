// P2 - Nutrition Knowledge Graph loaders + typed queries over the catalog
// (supabase/migrations/0009_nutrition.sql + 0010_nutrition_seed.sql).
//
// Catalog tables are world-readable, so any authenticated client can read them.
// Everything is loaded once into a KnowledgeGraph and queried in-memory by the
// deterministic engines.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { EvidenceGrade, EvidenceSource, Food, Nutrient } from "@/types/nutrition";

export interface SymptomLink {
  nutrientSlug: string;
  nutrientName: string;
  symptom: string;
  weight: number;
  mechanism: string | null;
  evidenceSlug: string | null;
  evidenceGrade: EvidenceGrade | null;
}

export interface ConditionLink {
  conditionSlug: string;
  nutrientSlug: string;
  nutrientName: string;
  relationship: string;
  mechanism: string | null;
  evidenceSlug: string | null;
  evidenceGrade: EvidenceGrade | null;
}

export interface LabMarker {
  nutrientSlug: string;
  nutrientName: string;
  biomarkerSlug: string;
  lowThreshold: number;
  unit: string | null;
}

export interface FoodNutrientLink {
  foodSlug: string;
  nutrientSlug: string;
  amount: number;
  servingDesc: string | null;
}

export interface Interaction {
  subject: string;
  subjectKind: string;
  medicationClass: string;
  severity: "caution" | "avoid";
  note: string;
  saferAlternatives: string[];
}

export interface Restriction {
  conditionSlug: string;
  restricted: string;
  restrictedKind: string;
  rule: string;
  severity: "caution" | "avoid";
  saferAlternatives: string[];
}

export interface KnowledgeGraph {
  nutrients: Map<string, Nutrient>;
  foods: Map<string, Food>;
  foodNutrients: FoodNutrientLink[];
  symptomLinks: SymptomLink[];
  conditionLinks: ConditionLink[];
  labMarkers: LabMarker[];
  evidence: Map<string, EvidenceSource>;
  interactions: Interaction[];
  restrictions: Restriction[];
}

type Row = Record<string, unknown>;
const asArr = (v: unknown): Row[] => (Array.isArray(v) ? (v as Row[]) : []);
// PostgREST returns an embedded to-one relation as an object (or array of one).
const one = (v: unknown): Row | null => (Array.isArray(v) ? ((v[0] as Row) ?? null) : ((v as Row) ?? null));

export async function loadKnowledgeGraph(sb: SupabaseClient): Promise<KnowledgeGraph> {
  const [nutrientsRes, foodsRes, fnRes, symRes, condRes, labRes, evRes, interRes, restrRes] =
    await Promise.all([
      sb.from("nutrients").select("slug, name, unit, category, rda, description"),
      sb.from("foods").select("slug, name, category, region_tags, diet_flags, allergens, cultural_tags, meal_slots"),
      sb.from("food_nutrients").select("amount, serving_desc, foods(slug), nutrients(slug)"),
      sb
        .from("nutrient_symptoms")
        .select("symptom_name, weight, nutrients(slug, name), mechanisms(description), nutrition_evidence_sources(slug, grade)"),
      sb
        .from("nutrient_conditions")
        .select("condition_slug, relationship, nutrients(slug, name), mechanisms(description), nutrition_evidence_sources(slug, grade)"),
      sb.from("nutrient_lab_markers").select("biomarker_slug, low_threshold, unit, nutrients(slug, name)"),
      sb.from("nutrition_evidence_sources").select("slug, citation, source_type, grade, note, url"),
      sb.from("food_drug_interactions").select("subject, subject_kind, medication_class, severity, note, safer_alternatives"),
      sb.from("condition_diet_restrictions").select("condition_slug, restricted, restricted_kind, rule, severity, safer_alternatives"),
    ]);

  const nutrients = new Map<string, Nutrient>();
  for (const r of asArr(nutrientsRes.data)) {
    nutrients.set(r.slug as string, {
      slug: r.slug as string,
      name: r.name as string,
      unit: r.unit as string,
      category: (r.category as string) ?? null,
      rda: (r.rda as Record<string, number>) ?? {},
      description: (r.description as string) ?? null,
    });
  }

  const foods = new Map<string, Food>();
  for (const r of asArr(foodsRes.data)) {
    foods.set(r.slug as string, {
      slug: r.slug as string,
      name: r.name as string,
      category: (r.category as string) ?? null,
      regionTags: (r.region_tags as string[]) ?? [],
      dietFlags: (r.diet_flags as Food["dietFlags"]) ?? {},
      allergens: (r.allergens as string[]) ?? [],
      culturalTags: (r.cultural_tags as string[]) ?? [],
      mealSlots: (r.meal_slots as string[]) ?? [],
    });
  }

  const foodNutrients: FoodNutrientLink[] = [];
  for (const r of asArr(fnRes.data)) {
    const food = one(r.foods);
    const nutrient = one(r.nutrients);
    if (!food || !nutrient) continue;
    foodNutrients.push({
      foodSlug: food.slug as string,
      nutrientSlug: nutrient.slug as string,
      amount: Number(r.amount),
      servingDesc: (r.serving_desc as string) ?? null,
    });
  }

  const symptomLinks: SymptomLink[] = [];
  for (const r of asArr(symRes.data)) {
    const nutrient = one(r.nutrients);
    if (!nutrient) continue;
    const mech = one(r.mechanisms);
    const ev = one(r.nutrition_evidence_sources);
    symptomLinks.push({
      nutrientSlug: nutrient.slug as string,
      nutrientName: nutrient.name as string,
      symptom: r.symptom_name as string,
      weight: Number(r.weight),
      mechanism: (mech?.description as string) ?? null,
      evidenceSlug: (ev?.slug as string) ?? null,
      evidenceGrade: (ev?.grade as EvidenceGrade) ?? null,
    });
  }

  const conditionLinks: ConditionLink[] = [];
  for (const r of asArr(condRes.data)) {
    const nutrient = one(r.nutrients);
    if (!nutrient) continue;
    const mech = one(r.mechanisms);
    const ev = one(r.nutrition_evidence_sources);
    conditionLinks.push({
      conditionSlug: r.condition_slug as string,
      nutrientSlug: nutrient.slug as string,
      nutrientName: nutrient.name as string,
      relationship: r.relationship as string,
      mechanism: (mech?.description as string) ?? null,
      evidenceSlug: (ev?.slug as string) ?? null,
      evidenceGrade: (ev?.grade as EvidenceGrade) ?? null,
    });
  }

  const labMarkers: LabMarker[] = [];
  for (const r of asArr(labRes.data)) {
    const nutrient = one(r.nutrients);
    if (!nutrient) continue;
    labMarkers.push({
      nutrientSlug: nutrient.slug as string,
      nutrientName: nutrient.name as string,
      biomarkerSlug: r.biomarker_slug as string,
      lowThreshold: Number(r.low_threshold),
      unit: (r.unit as string) ?? null,
    });
  }

  const evidence = new Map<string, EvidenceSource>();
  for (const r of asArr(evRes.data)) {
    evidence.set(r.slug as string, {
      slug: r.slug as string,
      citation: r.citation as string,
      sourceType: r.source_type as string,
      grade: r.grade as EvidenceGrade,
      note: (r.note as string) ?? null,
      url: (r.url as string) ?? null,
    });
  }

  const interactions: Interaction[] = asArr(interRes.data).map((r) => ({
    subject: r.subject as string,
    subjectKind: r.subject_kind as string,
    medicationClass: r.medication_class as string,
    severity: (r.severity as "caution" | "avoid") ?? "caution",
    note: r.note as string,
    saferAlternatives: (r.safer_alternatives as string[]) ?? [],
  }));

  const restrictions: Restriction[] = asArr(restrRes.data).map((r) => ({
    conditionSlug: r.condition_slug as string,
    restricted: r.restricted as string,
    restrictedKind: r.restricted_kind as string,
    rule: r.rule as string,
    severity: (r.severity as "caution" | "avoid") ?? "caution",
    saferAlternatives: (r.safer_alternatives as string[]) ?? [],
  }));

  return {
    nutrients,
    foods,
    foodNutrients,
    symptomLinks,
    conditionLinks,
    labMarkers,
    evidence,
    interactions,
    restrictions,
  };
}

// --- in-memory queries --------------------------------------------------------

export interface FoodSource {
  food: Food;
  amount: number;
  servingDesc: string | null;
}

// Foods that provide a given nutrient, richest first.
export function foodsForNutrient(kg: KnowledgeGraph, nutrientSlug: string): FoodSource[] {
  return kg.foodNutrients
    .filter((fn) => fn.nutrientSlug === nutrientSlug)
    .map((fn) => {
      const food = kg.foods.get(fn.foodSlug);
      return food ? { food, amount: fn.amount, servingDesc: fn.servingDesc } : null;
    })
    .filter((x): x is FoodSource => x !== null)
    .sort((a, b) => b.amount - a.amount);
}

// Which nutrients does this food provide?
export function nutrientsInFood(kg: KnowledgeGraph, foodSlug: string): string[] {
  return kg.foodNutrients.filter((fn) => fn.foodSlug === foodSlug).map((fn) => fn.nutrientSlug);
}
