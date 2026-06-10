import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, authed } from "@/server/http";
import { loadKnowledgeGraph } from "@/server/nutrition/knowledge";
import { resolveMedicationClasses, validateFood } from "@/server/nutrition/safety";
import { getMedications, getNutritionProfile } from "@/server/nutrition/profile";

const Schema = z.object({
  foodSlug: z.string().min(1),
  nutrientSlug: z.string().min(1),
  medications: z.array(z.string()).max(40).optional(),
});

export async function POST(req: Request) {
  const { supabase, user } = await authed();
  if (!user) return apiError("unauthenticated", "Sign in required.", 401);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError("bad_request", "Invalid JSON.", 400);
  }
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return apiError("validation_error", parsed.error.issues[0]?.message ?? "Invalid input.", 400);

  const kg = await loadKnowledgeGraph(supabase);
  const profile = await getNutritionProfile(supabase, user.id);
  const meds = parsed.data.medications ?? (await getMedications(supabase, user.id));
  const result = validateFood(kg, parsed.data.foodSlug, parsed.data.nutrientSlug, profile, resolveMedicationClasses(meds));

  return NextResponse.json({ data: result });
}
