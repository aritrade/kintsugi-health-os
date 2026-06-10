import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, authed } from "@/server/http";
import type { SuspectedFactor } from "@/types/nutrition";
import { loadKnowledgeGraph } from "@/server/nutrition/knowledge";
import { buildMealPlan } from "@/server/nutrition/mealplan";
import { getNutritionProfile } from "@/server/nutrition/profile";

const Schema = z.object({
  assessmentId: z.string().uuid().optional(),
  targetNutrients: z.array(z.string()).max(12).optional(),
  persist: z.boolean().optional(),
});

export async function POST(req: Request) {
  const { supabase, user } = await authed();
  if (!user) return apiError("unauthenticated", "Sign in required.", 401);

  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    /* empty body allowed */
  }
  const parsed = Schema.safeParse(body ?? {});
  if (!parsed.success) return apiError("validation_error", parsed.error.issues[0]?.message ?? "Invalid input.", 400);

  let targets = parsed.data.targetNutrients ?? [];
  let assessmentId = parsed.data.assessmentId ?? null;

  if (targets.length === 0) {
    let q = supabase.from("nutrition_assessments").select("id, suspected_factors").eq("user_id", user.id);
    q = assessmentId ? q.eq("id", assessmentId) : q.order("created_at", { ascending: false }).limit(1);
    const { data: assessment } = await q.maybeSingle();
    if (!assessment) return apiError("not_found", "Run an assessment or pass target nutrients.", 404);
    assessmentId = assessment.id as string;
    targets = ((assessment.suspected_factors as SuspectedFactor[]) ?? []).slice(0, 4).map((f) => f.nutrientSlug);
  }

  const kg = await loadKnowledgeGraph(supabase);
  const profile = await getNutritionProfile(supabase, user.id);
  const plan = buildMealPlan(kg, targets, profile);

  let planId: string | undefined;
  if (parsed.data.persist !== false) {
    const { data: inserted, error } = await supabase
      .from("meal_plans")
      .insert({ user_id: user.id, assessment_id: assessmentId, target_nutrients: targets, plan })
      .select("id")
      .single();
    if (error) return apiError("db_error", error.message, 500);
    planId = inserted.id as string;
  }

  await supabase.from("ai_interactions").insert({
    user_id: user.id,
    system: "nutrition",
    provider: "deterministic",
    model: "nutrition-mealplan-v1",
    prompt_summary: `mealplan targets=${targets.join(",")}`,
    output_summary: `plan for ${targets.length} nutrients`,
    guardrail_flags: [],
  });

  return NextResponse.json({ data: { ...plan, id: planId } });
}
