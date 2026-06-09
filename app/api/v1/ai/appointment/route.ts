import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, authed } from "@/server/http";
import { buildAppointmentPrep, isSpecialist } from "@/server/ai/appointment";

const Schema = z.object({ specialist: z.string() });

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
  if (!parsed.success || !isSpecialist(parsed.data.specialist)) {
    return apiError("validation_error", "Unknown specialist.", 400);
  }

  const prep = await buildAppointmentPrep(supabase, user.id, parsed.data.specialist);
  await supabase.from("ai_interactions").insert({
    user_id: user.id,
    system: "appointment_prep",
    provider: "deterministic",
    model: "appointment/v1",
    prompt_summary: parsed.data.specialist,
    output_summary: `${prep.focusIndices.length} indices, ${prep.focusLabs.length} labs`,
  });
  return NextResponse.json({ data: prep });
}
