import { NextResponse } from "next/server";
import { apiError, authed } from "@/server/http";
import { computeMomentum } from "@/server/momentum/engine";
import { getIndexTrend } from "@/server/indices/trends";
import { BASELINE_MIN_OBSERVATIONS } from "@/packs/normalize";

// GET /api/v1/momentum - current Health Momentum Score + 4 components + 7-day
// trend (docs/07 section 9b, docs/25). Withheld until baseline (docs/20 section 6).
export async function GET() {
  const { supabase, user } = await authed();
  if (!user) return apiError("unauthenticated", "Sign in required.", 401);

  const { count } = await supabase
    .from("checkins")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);
  const observations = count ?? 0;
  const hasBaseline = observations >= BASELINE_MIN_OBSERVATIONS;

  const result = await computeMomentum(supabase, user.id);
  const trend = await getIndexTrend(supabase, user.id, "health_momentum");

  return NextResponse.json({
    data: {
      score: hasBaseline ? result.score : null,
      components: result.components,
      inputs: result.inputs,
      hasBaseline,
      observations,
      baselineMin: BASELINE_MIN_OBSERVATIONS,
      trend: hasBaseline ? trend.series : [],
    },
  });
}
