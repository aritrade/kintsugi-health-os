import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, authed } from "@/server/http";

const RegisterSchema = z.object({
  title: z.string().trim().min(1).max(200),
  type: z.enum(["lab_report", "imaging_report", "doctor_note", "prescription_doc", "other"]),
  storagePath: z.string().trim().min(1).max(400),
  mimeType: z.string().trim().max(120).optional(),
  recordDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
});

export async function GET() {
  const { supabase, user } = await authed();
  if (!user) return apiError("unauthenticated", "Sign in required.", 401);
  const { data, error } = await supabase
    .from("medical_records")
    .select("id, type, title, mime_type, record_date, status, sensitivity, created_at")
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .order("record_date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });
  if (error) return apiError("db_error", error.message, 500);
  return NextResponse.json({ data: { records: data ?? [] } });
}

export async function POST(req: Request) {
  const { supabase, user } = await authed();
  if (!user) return apiError("unauthenticated", "Sign in required.", 401);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError("bad_request", "Invalid JSON.", 400);
  }
  const parsed = RegisterSchema.safeParse(body);
  if (!parsed.success) return apiError("validation_error", parsed.error.issues[0]?.message ?? "Invalid input.", 422);

  const i = parsed.data;
  // Enforce the per-user folder convention so the row matches the storage RLS path.
  if (!i.storagePath.startsWith(`${user.id}/`)) {
    return apiError("forbidden", "Storage path must be within your folder.", 403);
  }

  const { data, error } = await supabase
    .from("medical_records")
    .insert({
      user_id: user.id,
      type: i.type,
      title: i.title,
      storage_path: i.storagePath,
      mime_type: i.mimeType ?? null,
      record_date: i.recordDate ?? null,
      status: "uploaded",
    })
    .select("id, type, title, status, record_date, created_at")
    .single();
  if (error) return apiError("db_error", error.message, 500);
  return NextResponse.json({ data: { record: data } }, { status: 201 });
}
