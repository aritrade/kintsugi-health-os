import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, authed } from "@/server/http";
import { buildCaseContent } from "@/server/cases/build";

export async function GET() {
  const { supabase, user } = await authed();
  if (!user) return apiError("unauthenticated", "Sign in required.", 401);

  const { data, error } = await supabase
    .from("cases")
    .select("id, title, specialist, created_at, updated_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (error) return apiError("db_error", error.message, 500);
  return NextResponse.json({ data: data ?? [] });
}

const CreateSchema = z.object({
  title: z.string().min(2).max(160),
  specialist: z.string().max(120).nullable().optional(),
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

  const specialist = parsed.data.specialist ?? null;
  const content = await buildCaseContent(supabase, user.id, specialist);
  const { data, error } = await supabase
    .from("cases")
    .insert({ user_id: user.id, title: parsed.data.title, specialist, content })
    .select("id, title, specialist, created_at")
    .single();
  if (error) return apiError("db_error", error.message, 500);

  // Data-backed milestone: first completed case (deduped by type).
  const { data: existing } = await supabase
    .from("momentum_events")
    .select("id")
    .eq("user_id", user.id)
    .eq("type", "first_case")
    .maybeSingle();
  if (!existing) {
    await supabase.from("momentum_events").insert({
      user_id: user.id,
      type: "first_case",
      label: "Completed your first healthcare case report.",
      evidence: { metrics: ["cases"] },
    });
  }

  return NextResponse.json({ data }, { status: 201 });
}
