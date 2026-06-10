import { NextResponse } from "next/server";
import { apiError, authed } from "@/server/http";
import { GRADE_LABELS } from "@/server/nutrition/evidence";

// GET /api/v1/nutrition/evidence - the curated evidence catalog + grade legend.
export async function GET() {
  const { supabase, user } = await authed();
  if (!user) return apiError("unauthenticated", "Sign in required.", 401);

  const { data, error } = await supabase
    .from("nutrition_evidence_sources")
    .select("slug, citation, source_type, grade, note, url")
    .order("grade", { ascending: true });
  if (error) return apiError("db_error", error.message, 500);

  return NextResponse.json({ data: { sources: data ?? [], gradeLabels: GRADE_LABELS } });
}
