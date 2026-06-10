import { NextResponse } from "next/server";
import { apiError, authed } from "@/server/http";

// GET /api/v1/nutrition/history - assessments, recommendations, meal plans, and
// outcomes for the Nutrition timeline + history views.
export async function GET() {
  const { supabase, user } = await authed();
  if (!user) return apiError("unauthenticated", "Sign in required.", 401);

  const [assessments, recommendations, mealPlans, outcomes] = await Promise.all([
    supabase
      .from("nutrition_assessments")
      .select("id, inputs, suspected_factors, reasoning, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("nutrition_recommendations")
      .select("id, assessment_id, nutrient_slug, food_name, why, evidence_grade, confidence, safety_status, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(60),
    supabase
      .from("meal_plans")
      .select("id, assessment_id, target_nutrients, plan, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("nutrition_outcomes")
      .select("id, assessment_id, metric, baseline, follow_up, window_start, window_end, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(60),
  ]);

  return NextResponse.json({
    data: {
      assessments: assessments.data ?? [],
      recommendations: recommendations.data ?? [],
      mealPlans: mealPlans.data ?? [],
      outcomes: outcomes.data ?? [],
    },
  });
}
