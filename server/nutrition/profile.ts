// Shared loaders for the user's nutrition profile + medications, with sane
// defaults when the user hasn't filled in a profile yet.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Budget, DietType, NutritionProfile } from "@/types/nutrition";

const DEFAULT_PROFILE: NutritionProfile = {
  dietType: "omnivore",
  allergies: [],
  religiousRestrictions: [],
  budget: null,
  region: null,
  culturalPrefs: [],
  dislikedFoods: [],
  goals: [],
  conditions: [],
};

export async function getNutritionProfile(sb: SupabaseClient, userId: string): Promise<NutritionProfile> {
  const { data } = await sb
    .from("nutrition_profiles")
    .select(
      "diet_type, allergies, religious_restrictions, budget, region, cultural_prefs, disliked_foods, goals, conditions",
    )
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) return { ...DEFAULT_PROFILE };
  return {
    dietType: (data.diet_type as DietType) ?? "omnivore",
    allergies: (data.allergies as string[]) ?? [],
    religiousRestrictions: (data.religious_restrictions as string[]) ?? [],
    budget: (data.budget as Budget) ?? null,
    region: (data.region as string) ?? null,
    culturalPrefs: (data.cultural_prefs as string[]) ?? [],
    dislikedFoods: (data.disliked_foods as string[]) ?? [],
    goals: (data.goals as string[]) ?? [],
    conditions: (data.conditions as string[]) ?? [],
  };
}

export async function getMedications(sb: SupabaseClient, userId: string): Promise<string[]> {
  const { data } = await sb.from("nutrition_medications").select("name, drug_class").eq("user_id", userId);
  const meds: string[] = [];
  for (const r of data ?? []) {
    if (r.drug_class) meds.push(r.drug_class as string);
    if (r.name) meds.push(r.name as string);
  }
  return meds;
}
