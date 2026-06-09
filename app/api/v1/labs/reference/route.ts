import { NextResponse } from "next/server";
import { apiError, authed } from "@/server/http";
import { isRegion, localizeReferenceRange, type Region } from "@/lib/labs/reference-localization";

// Region-localized lab reference ranges (docs/14 §2.5). Region defaults to the
// user's profile region; can be overridden with ?region=.
export async function GET(req: Request) {
  const { supabase, user } = await authed();
  if (!user) return apiError("unauthenticated", "Sign in required.", 401);

  const url = new URL(req.url);
  const override = url.searchParams.get("region");

  const { data: profile } = await supabase
    .from("profiles")
    .select("region")
    .eq("user_id", user.id)
    .maybeSingle();
  const region: Region = override && isRegion(override) ? override : isRegion(profile?.region ?? "") ? (profile!.region as Region) : "US";

  const { data: biomarkers } = await supabase
    .from("biomarkers")
    .select("slug, display_name, unit, default_ref_low, default_ref_high, category");

  const data = (biomarkers ?? []).map((b) => {
    const r = localizeReferenceRange(
      b.slug as string,
      b.unit as string,
      b.default_ref_low as number | null,
      b.default_ref_high as number | null,
      region,
    );
    return {
      slug: b.slug,
      displayName: b.display_name,
      category: b.category,
      unit: r.unit,
      low: r.low,
      high: r.high,
      converted: r.converted,
    };
  });

  return NextResponse.json({ data: { region, biomarkers: data } });
}
