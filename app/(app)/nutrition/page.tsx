import { createClient } from "@/lib/supabase/server";
import { getNutritionProfile } from "@/server/nutrition/profile";
import { NutritionClient } from "@/components/nutrition/nutrition-client";

export default async function NutritionPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const profile = await getNutritionProfile(supabase, user!.id);
  const { data: medications } = await supabase
    .from("nutrition_medications")
    .select("id, name, drug_class")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: true });

  return <NutritionClient initialProfile={profile} initialMedications={(medications ?? []) as never} />;
}
