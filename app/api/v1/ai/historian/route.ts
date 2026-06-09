import { NextResponse } from "next/server";
import { apiError, authed } from "@/server/http";
import { buildHistorianNarrative } from "@/server/ai/historian";

export async function POST() {
  const { supabase, user } = await authed();
  if (!user) return apiError("unauthenticated", "Sign in required.", 401);

  const narrative = await buildHistorianNarrative(supabase, user.id);
  await supabase.from("ai_interactions").insert({
    user_id: user.id,
    system: "historian",
    provider: "deterministic",
    model: "historian/v1",
    prompt_summary: "narrative reconstruction",
    output_summary: `${narrative.paragraphs.length} paragraphs`,
  });
  return NextResponse.json({ data: narrative });
}
