import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, authed } from "@/server/http";
import type { SuspectedFactor } from "@/types/nutrition";
import { computeOutcomes } from "@/server/nutrition/outcomes";

const Schema = z.object({
  assessmentId: z.string().uuid().optional(),
  windowDays: z.number().int().min(14).max(180).optional(),
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

  let q = supabase.from("nutrition_assessments").select("id, suspected_factors").eq("user_id", user.id);
  q = parsed.data.assessmentId ? q.eq("id", parsed.data.assessmentId) : q.order("created_at", { ascending: false }).limit(1);
  const { data: assessment } = await q.maybeSingle();
  if (!assessment) return apiError("not_found", "Run an assessment first.", 404);

  const factors = (assessment.suspected_factors as SuspectedFactor[]) ?? [];
  const result = await computeOutcomes(supabase, user.id, factors, parsed.data.windowDays ?? 56);

  if (parsed.data.persist !== false && result.deltas.length > 0) {
    await supabase.from("nutrition_outcomes").insert(
      result.deltas.map((d) => ({
        user_id: user.id,
        assessment_id: assessment.id,
        metric: d.metric,
        baseline: d.baseline,
        follow_up: d.followUp,
        window_start: result.windowStart,
        window_end: result.windowEnd,
      })),
    );
  }

  // Data-backed momentum: first time a tracked nutrition signal improves (deduped).
  if (result.deltas.some((d) => d.improved === true)) {
    const { data: existing } = await supabase
      .from("momentum_events")
      .select("id")
      .eq("user_id", user.id)
      .eq("type", "nutrition_outcome")
      .maybeSingle();
    if (!existing) {
      await supabase.from("momentum_events").insert({
        user_id: user.id,
        type: "nutrition_outcome",
        label: "A tracked signal improved after your nutrition focus.",
        evidence: { metrics: result.deltas.filter((d) => d.improved).map((d) => d.metric) },
      });
    }
  }

  await supabase.from("ai_interactions").insert({
    user_id: user.id,
    system: "nutrition",
    provider: "deterministic",
    model: "nutrition-outcomes-v1",
    prompt_summary: `track assessment=${assessment.id}`,
    output_summary: `${result.deltas.length} outcome deltas`,
    guardrail_flags: [],
  });

  return NextResponse.json({ data: result });
}
