import { NextResponse } from "next/server";
import { apiError, authed } from "@/server/http";

// GET /api/v1/momentum/events - data-backed milestones (docs/25 section 3).
export async function GET() {
  const { supabase, user } = await authed();
  if (!user) return apiError("unauthenticated", "Sign in required.", 401);

  const { data, error } = await supabase
    .from("momentum_events")
    .select("id, type, label, evidence, occurred_at")
    .eq("user_id", user.id)
    .order("occurred_at", { ascending: false })
    .limit(100);
  if (error) return apiError("db_error", error.message, 500);

  return NextResponse.json({
    data: (data ?? []).map((r) => ({
      id: r.id,
      type: r.type,
      label: r.label,
      evidence: r.evidence ?? {},
      occurredAt: r.occurred_at,
    })),
  });
}
