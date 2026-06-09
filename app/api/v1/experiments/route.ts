import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, authed } from "@/server/http";
import { createExperiment, mapExperiment } from "@/server/experiments/service";

export async function GET() {
  const { supabase, user } = await authed();
  if (!user) return apiError("unauthenticated", "Sign in required.", 401);

  const { data, error } = await supabase
    .from("experiments")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (error) return apiError("db_error", error.message, 500);
  return NextResponse.json({ data: (data ?? []).map(mapExperiment) });
}

const CreateSchema = z.object({
  templateId: z.string().max(80).optional(),
  question: z.string().min(3).max(300).optional(),
  hypothesis: z.string().max(500).optional(),
  variables: z.record(z.string(), z.unknown()).optional(),
  metrics: z.array(z.string().max(60)).max(10).optional(),
  durationDays: z.number().int().min(1).max(120).optional(),
  successCriteria: z.string().max(500).optional(),
});

export async function POST(req: Request) {
  const { supabase, user } = await authed();
  if (!user) return apiError("unauthenticated", "Sign in required.", 401);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError("bad_request", "Invalid JSON.", 400);
  }
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) return apiError("validation_error", parsed.error.issues[0]?.message ?? "Invalid input.", 400);
  if (!parsed.data.templateId && !parsed.data.question) {
    return apiError("validation_error", "Provide a templateId or a question.", 400);
  }

  try {
    const exp = await createExperiment(supabase, user.id, parsed.data);
    return NextResponse.json({ data: exp }, { status: 201 });
  } catch (e) {
    return apiError("db_error", (e as Error).message, 500);
  }
}
