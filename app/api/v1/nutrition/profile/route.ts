import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, authed } from "@/server/http";
import { getMedications, getNutritionProfile } from "@/server/nutrition/profile";

export async function GET() {
  const { supabase, user } = await authed();
  if (!user) return apiError("unauthenticated", "Sign in required.", 401);
  const profile = await getNutritionProfile(supabase, user.id);
  const { data: meds } = await supabase
    .from("nutrition_medications")
    .select("id, name, drug_class")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });
  return NextResponse.json({ data: { profile, medications: meds ?? [] } });
}

const ProfileSchema = z.object({
  dietType: z.enum(["omnivore", "vegetarian", "vegan", "pescatarian"]).optional(),
  allergies: z.array(z.string()).max(40).optional(),
  religiousRestrictions: z.array(z.string()).max(20).optional(),
  budget: z.enum(["low", "medium", "high"]).nullable().optional(),
  region: z.string().max(120).nullable().optional(),
  culturalPrefs: z.array(z.string()).max(20).optional(),
  dislikedFoods: z.array(z.string()).max(60).optional(),
  goals: z.array(z.string()).max(20).optional(),
  conditions: z.array(z.string()).max(20).optional(),
  medications: z.array(z.object({ name: z.string().min(1).max(120), drugClass: z.string().max(80).nullable().optional() })).max(40).optional(),
});

export async function PUT(req: Request) {
  const { supabase, user } = await authed();
  if (!user) return apiError("unauthenticated", "Sign in required.", 401);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError("bad_request", "Invalid JSON.", 400);
  }
  const parsed = ProfileSchema.safeParse(body);
  if (!parsed.success) return apiError("validation_error", parsed.error.issues[0]?.message ?? "Invalid input.", 400);
  const p = parsed.data;

  const { error } = await supabase.from("nutrition_profiles").upsert(
    {
      user_id: user.id,
      diet_type: p.dietType ?? "omnivore",
      allergies: p.allergies ?? [],
      religious_restrictions: p.religiousRestrictions ?? [],
      budget: p.budget ?? null,
      region: p.region ?? null,
      cultural_prefs: p.culturalPrefs ?? [],
      disliked_foods: p.dislikedFoods ?? [],
      goals: p.goals ?? [],
      conditions: p.conditions ?? [],
    },
    { onConflict: "user_id" },
  );
  if (error) return apiError("db_error", error.message, 500);

  if (p.medications) {
    await supabase.from("nutrition_medications").delete().eq("user_id", user.id);
    if (p.medications.length > 0) {
      await supabase.from("nutrition_medications").insert(
        p.medications.map((m) => ({ user_id: user.id, name: m.name, drug_class: m.drugClass ?? null })),
      );
    }
  }

  const profile = await getNutritionProfile(supabase, user.id);
  const medications = await getMedications(supabase, user.id);
  return NextResponse.json({ data: { profile, medications } });
}
