import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, authed } from "@/server/http";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await authed();
  if (!user) return apiError("unauthenticated", "Sign in required.", 401);

  const { data, error } = await supabase
    .from("cases")
    .select("id, title, specialist, content, created_at, updated_at")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) return apiError("db_error", error.message, 500);
  if (!data) return apiError("not_found", "Case not found.", 404);
  return NextResponse.json({ data });
}

const PatchSchema = z.object({
  title: z.string().min(2).max(160).optional(),
  specialist: z.string().max(120).nullable().optional(),
});

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
  if (!parsed.success) return apiError("validation_error", "Invalid input.", 400);

  const { data, error } = await supabase
    .from("cases")
    .update(parsed.data)
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id, title, specialist, updated_at")
    .maybeSingle();
  if (error) return apiError("db_error", error.message, 500);
  if (!data) return apiError("not_found", "Case not found.", 404);
  return NextResponse.json({ data });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await authed();
  if (!user) return apiError("unauthenticated", "Sign in required.", 401);

  const { error } = await supabase.from("cases").delete().eq("id", id).eq("user_id", user.id);
  if (error) return apiError("db_error", error.message, 500);
  return NextResponse.json({ data: { deleted: true } });
}
