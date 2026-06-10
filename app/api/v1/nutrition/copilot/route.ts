import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, authed } from "@/server/http";
import { runCopilot } from "@/server/nutrition/copilot";
import { getMedications, getNutritionProfile } from "@/server/nutrition/profile";

const Schema = z.object({ message: z.string().min(1).max(2000) });

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

  const profile = await getNutritionProfile(supabase, user.id);
  const meds = await getMedications(supabase, user.id);
  const response = await runCopilot(supabase, parsed.data.message, profile, meds);

  await supabase.from("ai_interactions").insert({
    user_id: user.id,
    system: "nutrition",
    provider: "deterministic",
    model: "nutrition-copilot-v1",
    prompt_summary: response.emergency ? "[redacted: emergency-routed]" : `copilot len=${parsed.data.message.length}`,
    output_summary: response.emergency ? "emergency routing" : `${response.recommendations.length} recommendations`,
    guardrail_flags: response.guardrailFlags,
  });

  return NextResponse.json({ data: response });
}
