import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, authed } from "@/server/http";
import { transitionExperiment } from "@/server/experiments/service";

const PatchSchema = z.object({ action: z.enum(["start", "complete", "abandon"]) });

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await authed();
  if (!user) return apiError("unauthenticated", "Sign in required.", 401);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError("bad_request", "Invalid JSON.", 400);
  }
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) return apiError("validation_error", "action must be start, complete, or abandon.", 400);

  try {
    const exp = await transitionExperiment(supabase, user.id, id, parsed.data.action);
    if (!exp) return apiError("not_found", "Experiment not found.", 404);
    return NextResponse.json({ data: exp });
  } catch (e) {
    return apiError("db_error", (e as Error).message, 500);
  }
}
