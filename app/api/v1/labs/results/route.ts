import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, authed } from "@/server/http";

const ResultSchema = z.object({
  biomarkerId: z.string().uuid().nullable().optional(),
  customName: z.string().trim().max(120).nullable().optional(),
  value: z.number(),
  unit: z.string().trim().max(40).nullable().optional(),
  refLow: z.number().nullable().optional(),
  refHigh: z.number().nullable().optional(),
  resultDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const AddSchema = z.object({
  recordId: z.string().uuid().nullable().optional(),
  panelName: z.string().trim().max(120).nullable().optional(),
  collectedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  markReviewed: z.boolean().optional(),
  results: z.array(ResultSchema).min(1).max(100),
});

export async function GET(req: Request) {
  const { supabase, user } = await authed();
  if (!user) return apiError("unauthenticated", "Sign in required.", 401);
  const url = new URL(req.url);
  const biomarker = url.searchParams.get("biomarker");
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  let q = supabase
    .from("lab_results")
    .select("id, biomarker_id, custom_name, value, unit, ref_low, ref_high, result_date, biomarkers(slug, display_name)")
    .eq("user_id", user.id)
    .order("result_date", { ascending: false });
  if (biomarker) q = q.eq("biomarker_id", biomarker);
  if (from) q = q.gte("result_date", from);
  if (to) q = q.lte("result_date", to);

  const { data, error } = await q;
  if (error) return apiError("db_error", error.message, 500);
  return NextResponse.json({ data: { results: data ?? [] } });
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
  const parsed = AddSchema.safeParse(body);
  if (!parsed.success) return apiError("validation_error", parsed.error.issues[0]?.message ?? "Invalid input.", 422);
  const i = parsed.data;

  // Create a panel when we have a source record or collection date.
  let panelId: string | null = null;
  const collectedAt = i.collectedAt ?? i.results[0]?.resultDate;
  if (i.recordId || i.collectedAt) {
    const { data: panel, error: pErr } = await supabase
      .from("lab_panels")
      .insert({
        user_id: user.id,
        record_id: i.recordId ?? null,
        panel_name: i.panelName ?? null,
        collected_at: collectedAt,
      })
      .select("id")
      .single();
    if (pErr) return apiError("db_error", pErr.message, 500);
    panelId = panel.id;
  }

  const rows = i.results.map((r) => ({
    user_id: user.id,
    panel_id: panelId,
    biomarker_id: r.biomarkerId ?? null,
    custom_name: r.customName ?? null,
    value: r.value,
    unit: r.unit ?? null,
    ref_low: r.refLow ?? null,
    ref_high: r.refHigh ?? null,
    result_date: r.resultDate,
  }));

  const { data, error } = await supabase.from("lab_results").insert(rows).select("id");
  if (error) return apiError("db_error", error.message, 500);

  // If confirming an extraction, mark the record reviewed (now trusted).
  if (i.recordId && i.markReviewed) {
    await supabase.from("medical_records").update({ status: "reviewed" }).eq("id", i.recordId).eq("user_id", user.id);
    await supabase.from("record_extractions").update({ reviewed: true }).eq("record_id", i.recordId).eq("user_id", user.id);
  }

  return NextResponse.json({ data: { inserted: data?.length ?? 0, panelId } }, { status: 201 });
}
