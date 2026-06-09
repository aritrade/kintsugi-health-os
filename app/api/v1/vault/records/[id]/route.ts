import { NextResponse } from "next/server";
import { apiError, authed } from "@/server/http";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await authed();
  if (!user) return apiError("unauthenticated", "Sign in required.", 401);

  const { data: record, error } = await supabase
    .from("medical_records")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) return apiError("db_error", error.message, 500);
  if (!record) return apiError("not_found", "Record not found.", 404);

  const { data: extraction } = await supabase
    .from("record_extractions")
    .select("*")
    .eq("record_id", id)
    .order("created_at", { ascending: false })
    .maybeSingle();

  let downloadUrl: string | null = null;
  const signed = await supabase.storage
    .from("medical-records")
    .createSignedUrl(record.storage_path as string, 3600);
  if (signed.data) downloadUrl = signed.data.signedUrl;

  return NextResponse.json({ data: { record, extraction: extraction ?? null, downloadUrl } });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await authed();
  if (!user) return apiError("unauthenticated", "Sign in required.", 401);

  const { data: record } = await supabase
    .from("medical_records")
    .select("storage_path")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!record) return apiError("not_found", "Record not found.", 404);

  // Remove the storage object, then soft-delete the row.
  await supabase.storage.from("medical-records").remove([record.storage_path as string]);
  const { error } = await supabase
    .from("medical_records")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return apiError("db_error", error.message, 500);
  return NextResponse.json({ data: { deleted: true } });
}
