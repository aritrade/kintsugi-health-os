import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, authed } from "@/server/http";
import type { SuspectedFactor } from "@/types/nutrition";
import { loadKnowledgeGraph } from "@/server/nutrition/knowledge";
import { buildRecommendations } from "@/server/nutrition/recommend";
import { getMedications, getNutritionProfile } from "@/server/nutrition/profile";

const Schema = z.object({
  assessmentId: z.string().uuid().optional(),
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

  // Resolve the assessment (explicit id or the user's most recent one).
  let assessmentQuery = supabase
    .from("nutrition_assessments")
    .select("id, suspected_factors")
    .eq("user_id", user.id);
  assessmentQuery = parsed.data.assessmentId
    ? assessmentQuery.eq("id", parsed.data.assessmentId)
    : assessmentQuery.order("created_at", { ascending: false }).limit(1);
  const { data: assessment } = await assessmentQuery.maybeSingle();
  if (!assessment) return apiError("not_found", "Run an assessment first.", 404);

  const factors = (assessment.suspected_factors as SuspectedFactor[]) ?? [];
  const kg = await loadKnowledgeGraph(supabase);
  const profile = await getNutritionProfile(supabase, user.id);
  const meds = await getMedications(supabase, user.id);

  const recommendations = buildRecommendations(kg, factors, profile, { medications: meds });

  let stored = recommendations;
  if (parsed.data.persist !== false && recommendations.length > 0) {
    const { data: inserted, error } = await supabase
      .from("nutrition_recommendations")
      .insert(
        recommendations.map((r) => ({
          user_id: user.id,
          assessment_id: assessment.id,
          nutrient_slug: r.nutrientSlug,
          food_slug: r.foodSlug,
          food_name: r.foodName,
          why: r.why,
          mechanism: r.mechanism,
          evidence_grade: r.evidenceGrade,
          confidence: r.confidence,
          safety_status: r.safetyStatus,
          safer_alternatives: r.saferAlternatives,
          explanation: r.explanation,
        })),
      )
      .select("id, nutrient_slug, food_slug");
    if (error) return apiError("db_error", error.message, 500);
    // Attach ids back + log "shown" history.
    const idByKey = new Map((inserted ?? []).map((row) => [`${row.nutrient_slug}:${row.food_slug}`, row.id as string]));
    stored = recommendations.map((r) => ({ ...r, id: idByKey.get(`${r.nutrientSlug}:${r.foodSlug}`) }));
    await supabase.from("recommendation_history").insert(
      (inserted ?? []).map((row) => ({ user_id: user.id, recommendation_id: row.id, action: "shown" })),
    );
  }

  await supabase.from("ai_interactions").insert({
    user_id: user.id,
    system: "nutrition",
    provider: "deterministic",
    model: "nutrition-recommend-v1",
    prompt_summary: `recommend assessment=${assessment.id}`,
    output_summary: `${recommendations.length} food recommendations`,
    guardrail_flags: [],
  });

  return NextResponse.json({ data: { assessmentId: assessment.id, recommendations: stored } });
}
