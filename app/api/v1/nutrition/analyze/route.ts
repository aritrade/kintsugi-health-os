import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, authed } from "@/server/http";
import type { AssessmentInput } from "@/types/nutrition";
import { loadKnowledgeGraph } from "@/server/nutrition/knowledge";
import { runAssessment } from "@/server/nutrition/assessment";
import { getMedications, getNutritionProfile } from "@/server/nutrition/profile";

const Schema = z.object({
  symptoms: z.array(z.string()).max(40).optional(),
  conditions: z.array(z.string()).max(20).optional(),
  labs: z.record(z.string(), z.number()).optional(),
  medications: z.array(z.string()).max(40).optional(),
  goals: z.array(z.string()).max(20).optional(),
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

  const kg = await loadKnowledgeGraph(supabase);
  const profile = await getNutritionProfile(supabase, user.id);
  const meds = parsed.data.medications ?? (await getMedications(supabase, user.id));

  // Merge stored labs (latest per biomarker) under any explicitly supplied values.
  const markerSlugs = [...new Set(kg.labMarkers.map((m) => m.biomarkerSlug))];
  const labs: Record<string, number> = {};
  if (markerSlugs.length > 0) {
    const { data: labRows } = await supabase
      .from("lab_results")
      .select("value, result_date, biomarkers(slug)")
      .eq("user_id", user.id)
      .order("result_date", { ascending: true });
    for (const r of (labRows ?? []) as Record<string, unknown>[]) {
      const b = Array.isArray(r.biomarkers) ? r.biomarkers[0] : r.biomarkers;
      const slug = (b as { slug?: string })?.slug;
      if (slug && markerSlugs.includes(slug)) labs[slug] = Number(r.value); // ascending -> latest wins
    }
  }
  Object.assign(labs, parsed.data.labs ?? {});

  const input: AssessmentInput = {
    symptoms: parsed.data.symptoms ?? [],
    conditions: [...new Set([...(parsed.data.conditions ?? []), ...profile.conditions])],
    labs,
    medications: meds,
    goals: [...new Set([...(parsed.data.goals ?? []), ...profile.goals])],
  };

  const result = runAssessment(kg, input);

  let assessmentId: string | undefined;
  if (parsed.data.persist !== false) {
    const { data: inserted, error } = await supabase
      .from("nutrition_assessments")
      .insert({
        user_id: user.id,
        inputs: input,
        suspected_factors: result.suspectedFactors,
        reasoning: result.reasoning,
      })
      .select("id")
      .single();
    if (error) return apiError("db_error", error.message, 500);
    assessmentId = inserted.id as string;
  }

  await supabase.from("ai_interactions").insert({
    user_id: user.id,
    system: "nutrition",
    provider: "deterministic",
    model: "nutrition-assessment-v1",
    prompt_summary: `analyze symptoms=${input.symptoms?.length ?? 0} labs=${Object.keys(labs).length}`,
    output_summary: `${result.suspectedFactors.length} suspected factors`,
    guardrail_flags: [],
  });

  return NextResponse.json({ data: { assessmentId, ...result } });
}
