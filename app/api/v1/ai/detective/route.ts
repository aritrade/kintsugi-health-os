import { NextResponse } from "next/server";
import { apiError, authed } from "@/server/http";
import { runDetectiveScan } from "@/server/detective/engine";
import {
  applyGuardrails,
  detectEmergency,
  emergencyResponse,
} from "@/ai/guardrails";

// POST /api/v1/ai/detective - run a deterministic investigation scan over the
// user's data, pass the output through the guardrail pipeline, log the
// interaction, and return an AiResponse (docs/07 section 11, docs/19).
export async function POST(req: Request) {
  const { supabase, user } = await authed();
  if (!user) return apiError("unauthenticated", "Sign in required.", 401);

  let body: { userPrompt?: string; context?: { windowDays?: number } } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    // empty body is allowed
  }

  // Emergency language short-circuits all investigation framing.
  if (detectEmergency(body.userPrompt)) {
    const resp = emergencyResponse();
    await supabase.from("ai_interactions").insert({
      user_id: user.id,
      system: "detective",
      provider: "deterministic",
      model: "engine-v1",
      prompt_summary: "[redacted: emergency-routed]",
      output_summary: "emergency routing",
      guardrail_flags: resp.guardrailFlags,
    });
    return NextResponse.json({ data: resp });
  }

  const windowDays = Math.min(Math.max(body.context?.windowDays ?? 30, 7), 90);
  const { response } = await runDetectiveScan(supabase, user.id, windowDays);
  const guarded = applyGuardrails(response);

  await supabase.from("ai_interactions").insert({
    user_id: user.id,
    system: "detective",
    provider: "deterministic",
    model: "engine-v1",
    prompt_summary: `scan windowDays=${windowDays}`,
    output_summary: `${guarded.observations.length} observations, ${guarded.hypotheses.length} hypotheses`,
    guardrail_flags: guarded.guardrailFlags,
  });

  return NextResponse.json({ data: guarded });
}
