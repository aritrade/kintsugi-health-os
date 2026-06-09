import { NextResponse } from "next/server";
import { apiError, authed } from "@/server/http";
import { detectEmergency, emergencyResponse } from "@/ai/guardrails";
import { research, researchTopics } from "@/server/ai/research";

export async function GET(req: Request) {
  const { supabase, user } = await authed();
  if (!user) return apiError("unauthenticated", "Sign in required.", 401);

  const q = new URL(req.url).searchParams.get("q") ?? "";
  if (!q) return NextResponse.json({ data: { topics: researchTopics() } });

  if (detectEmergency(q)) {
    return NextResponse.json({ data: { emergency: true, response: emergencyResponse() } });
  }

  const result = research(q);
  await supabase.from("ai_interactions").insert({
    user_id: user.id,
    system: "research",
    provider: "deterministic",
    model: "research-kb/v1",
    prompt_summary: q.slice(0, 120),
    output_summary: result.matched?.topic ?? "no match",
  });
  return NextResponse.json({ data: result });
}
