import { NextResponse } from "next/server";
import { apiError, authed } from "@/server/http";
import { buildWeeklyReport } from "@/server/reports/weekly";

// GET /api/v1/momentum/report?period=weekly - the positive-framed momentum
// subset of the weekly report (docs/25 section 4).
export async function GET() {
  const { supabase, user } = await authed();
  if (!user) return apiError("unauthenticated", "Sign in required.", 401);

  const content = await buildWeeklyReport(supabase, user.id);
  return NextResponse.json({
    data: { periodStart: content.periodStart, periodEnd: content.periodEnd, ...content.momentum },
  });
}
