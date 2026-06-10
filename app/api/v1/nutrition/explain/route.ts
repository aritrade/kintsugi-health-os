import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, authed } from "@/server/http";
import type { SuspectedFactor } from "@/types/nutrition";
import { foodsForNutrient, loadKnowledgeGraph } from "@/server/nutrition/knowledge";
import { bestEvidenceForNutrient, combineConfidence } from "@/server/nutrition/evidence";
import { buildExplanation } from "@/server/nutrition/explain";

const Schema = z.object({
  recommendationId: z.string().uuid().optional(),
  nutrientSlug: z.string().optional(),
  foodSlug: z.string().optional(),
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

  // Stored recommendation -> return its saved Why-explanation.
  if (parsed.data.recommendationId) {
    const { data } = await supabase
      .from("nutrition_recommendations")
      .select("explanation")
      .eq("user_id", user.id)
      .eq("id", parsed.data.recommendationId)
      .maybeSingle();
    if (!data) return apiError("not_found", "Recommendation not found.", 404);
    return NextResponse.json({ data: data.explanation });
  }

  // Otherwise compute a fresh explanation for a nutrient (+ optional food).
  if (!parsed.data.nutrientSlug) {
    return apiError("validation_error", "Provide recommendationId or nutrientSlug.", 400);
  }
  const kg = await loadKnowledgeGraph(supabase);
  const nutrient = kg.nutrients.get(parsed.data.nutrientSlug);
  if (!nutrient) return apiError("not_found", "Unknown nutrient.", 404);

  const sources = foodsForNutrient(kg, nutrient.slug);
  const chosen = parsed.data.foodSlug ? sources.find((s) => s.food.slug === parsed.data.foodSlug) : sources[0];
  if (!chosen) return apiError("not_found", "No food found for this nutrient.", 404);

  const evidence = bestEvidenceForNutrient(kg, nutrient.slug);
  const factor: SuspectedFactor = {
    nutrientSlug: nutrient.slug,
    nutrientName: nutrient.name,
    factor: `Interest in ${nutrient.name}`,
    confidence: 0.5,
    reasoning: [{ source: "goal", detail: `an interest in ${nutrient.name}`, contribution: 0.5 }],
    labConfirmed: false,
  };
  const explanation = buildExplanation({
    factor,
    nutrient,
    foodName: chosen.food.name,
    amount: chosen.amount,
    servingDesc: chosen.servingDesc,
    evidence,
    confidence: combineConfidence(0.5, evidence.grade),
  });
  return NextResponse.json({ data: explanation });
}
