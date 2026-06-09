import { NextResponse } from "next/server";
import { apiError, authed } from "@/server/http";

export async function GET() {
  const { supabase, user } = await authed();
  if (!user) return apiError("unauthenticated", "Sign in required.", 401);
  const { data, error } = await supabase
    .from("biomarkers")
    .select("id, slug, display_name, unit, default_ref_low, default_ref_high, category")
    .order("display_name");
  if (error) return apiError("db_error", error.message, 500);
  return NextResponse.json({ data: { biomarkers: data ?? [] } });
}
