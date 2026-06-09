import { NextResponse } from "next/server";
import { apiError, authed } from "@/server/http";

// Returns a normalized trend series for a biomarker plus its reference band,
// for the shaded-band chart in docs/11-wireframes.md S13.
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { supabase, user } = await authed();
  if (!user) return apiError("unauthenticated", "Sign in required.", 401);

  const { data: biomarker, error: bErr } = await supabase
    .from("biomarkers")
    .select("id, slug, display_name, unit, default_ref_low, default_ref_high, category")
    .eq("slug", slug)
    .maybeSingle();
  if (bErr) return apiError("db_error", bErr.message, 500);
  if (!biomarker) return apiError("not_found", "Unknown biomarker.", 404);

  const { data: results, error } = await supabase
    .from("lab_results")
    .select("value, unit, ref_low, ref_high, result_date")
    .eq("user_id", user.id)
    .eq("biomarker_id", biomarker.id)
    .order("result_date", { ascending: true });
  if (error) return apiError("db_error", error.message, 500);

  const series = (results ?? []).map((r) => ({
    date: r.result_date as string,
    value: Number(r.value),
    unit: (r.unit as string) ?? biomarker.unit,
  }));

  // Prefer the most recent result's explicit reference range, else the catalog default.
  const latest = (results ?? [])[results!.length - 1];
  const refLow = latest?.ref_low ?? biomarker.default_ref_low;
  const refHigh = latest?.ref_high ?? biomarker.default_ref_high;

  const latestValue = series.length > 0 ? series[series.length - 1].value : null;
  let status: "below" | "within" | "above" | "unknown" = "unknown";
  if (latestValue != null && refLow != null && refHigh != null) {
    status = latestValue < refLow ? "below" : latestValue > refHigh ? "above" : "within";
  }

  return NextResponse.json({
    data: {
      biomarker: {
        slug: biomarker.slug,
        displayName: biomarker.display_name,
        unit: biomarker.unit,
        category: biomarker.category,
      },
      refLow,
      refHigh,
      latestValue,
      status,
      series,
    },
  });
}
