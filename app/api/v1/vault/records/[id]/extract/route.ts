import { NextResponse } from "next/server";
import { apiError, authed } from "@/server/http";
import { extractLabs } from "@/ai/ocr";

// Runs OCR + structured extraction on an uploaded record. Sets status to
// `extracted` and stores results for the user to confirm. Never marks reviewed.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await authed();
  if (!user) return apiError("unauthenticated", "Sign in required.", 401);

  const { data: record } = await supabase
    .from("medical_records")
    .select("id, storage_path, mime_type")
    .eq("id", id)
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!record) return apiError("not_found", "Record not found.", 404);

  await supabase.from("medical_records").update({ status: "processing" }).eq("id", id).eq("user_id", user.id);

  const signed = await supabase.storage
    .from("medical-records")
    .createSignedUrl(record.storage_path as string, 600);
  if (!signed.data) {
    await supabase.from("medical_records").update({ status: "failed" }).eq("id", id);
    return apiError("storage_error", "Could not read the uploaded file.", 500);
  }

  const ocr = await extractLabs(signed.data.signedUrl, (record.mime_type as string) ?? undefined);

  if (!ocr.available) {
    // Graceful fallback: leave the record ready for manual entry/confirmation.
    await supabase.from("medical_records").update({ status: "uploaded" }).eq("id", id);
    return NextResponse.json({
      data: { available: false, reason: ocr.reason, results: [] },
    });
  }

  await supabase.from("record_extractions").insert({
    record_id: id,
    user_id: user.id,
    raw_text: ocr.rawText ?? null,
    structured: { results: ocr.results },
    confidence: ocr.results.length > 0 ? 0.8 : 0.3,
    reviewed: false,
  });
  await supabase.from("medical_records").update({ status: "extracted" }).eq("id", id).eq("user_id", user.id);

  return NextResponse.json({ data: { available: true, results: ocr.results } });
}
