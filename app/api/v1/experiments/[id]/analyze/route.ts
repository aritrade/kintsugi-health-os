import { NextResponse } from "next/server";
import { apiError, authed } from "@/server/http";
import { analyzeExperiment } from "@/server/experiments/service";
import { applyGuardrails } from "@/ai/guardrails";

// POST /api/v1/experiments/:id/analyze - deterministic outcome analysis,
// passed through the guardrail reframer before the conclusion is stored/shown.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await authed();
  if (!user) return apiError("unauthenticated", "Sign in required.", 401);

  try {
    const exp = await analyzeExperiment(supabase, user.id, id);
    if (!exp) return apiError("not_found", "Experiment not found.", 404);

    // Defensive: ensure the stored conclusion carries no diagnostic/causal language.
    const guarded = applyGuardrails({
      system: "experiment_designer",
      observations: exp.conclusion ? [exp.conclusion] : [],
      questions: [],
      hypotheses: [],
      disclaimers: [],
      guardrailFlags: [],
    });
    const safeConclusion = guarded.observations[0] ?? exp.conclusion;

    await supabase.from("ai_interactions").insert({
      user_id: user.id,
      system: "experiment_designer",
      provider: "deterministic",
      model: "engine-v1",
      prompt_summary: `analyze experiment ${id}`,
      output_summary: "experiment outcome analysis",
      guardrail_flags: guarded.guardrailFlags,
    });

    return NextResponse.json({ data: { ...exp, conclusion: safeConclusion } });
  } catch (e) {
    return apiError("db_error", (e as Error).message, 500);
  }
}
