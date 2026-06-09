import { NextResponse } from "next/server";
import { apiError, authed } from "@/server/http";
import { buildWeeklyReport } from "@/server/reports/weekly";

// GET /api/v1/reports?period=weekly - list generated reports.
export async function GET(req: Request) {
  const { supabase, user } = await authed();
  if (!user) return apiError("unauthenticated", "Sign in required.", 401);

  const url = new URL(req.url);
  const period = url.searchParams.get("period");
  let q = supabase
    .from("reports")
    .select("id, period, period_start, period_end, content, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);
  if (period) q = q.eq("period", period);

  const { data, error } = await q;
  if (error) return apiError("db_error", error.message, 500);
  return NextResponse.json({ data: data ?? [] });
}

// POST /api/v1/reports/generate would normally be its own route; we accept POST
// here to generate a weekly report and persist it.
export async function POST() {
  const { supabase, user } = await authed();
  if (!user) return apiError("unauthenticated", "Sign in required.", 401);

  const content = await buildWeeklyReport(supabase, user.id);
  const { data, error } = await supabase
    .from("reports")
    .insert({
      user_id: user.id,
      period: "weekly",
      period_start: content.periodStart,
      period_end: content.periodEnd,
      content,
    })
    .select("id, period, period_start, period_end, content, created_at")
    .single();
  if (error) return apiError("db_error", error.message, 500);
  return NextResponse.json({ data }, { status: 201 });
}
