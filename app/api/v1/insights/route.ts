import { NextResponse } from "next/server";
import { apiError, authed } from "@/server/http";
import type { Insight } from "@/types";

// GET /api/v1/insights?status=active - list persisted Detective insights with
// their full audit fields (docs/19 section 10).
export async function GET(req: Request) {
  const { supabase, user } = await authed();
  if (!user) return apiError("unauthenticated", "Sign in required.", 401);

  const url = new URL(req.url);
  const status = url.searchParams.get("status") ?? "active";

  const { data, error } = await supabase
    .from("insights")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", status)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) return apiError("db_error", error.message, 500);

  const insights: Insight[] = (data ?? []).map((r) => ({
    id: r.id,
    stage: r.stage,
    status: r.status,
    observation: r.observation,
    investigationQuestion: r.investigation_question ?? undefined,
    suggestedNextStep: r.suggested_next_step ?? { type: "observation" },
    sourceMetrics: r.source_metrics ?? [],
    sampleSize: r.sample_size ?? undefined,
    windowStart: r.window_start ?? undefined,
    windowEnd: r.window_end ?? undefined,
    confidenceLevel: r.confidence_level ?? undefined,
    coefficient: r.coefficient != null ? Number(r.coefficient) : undefined,
    isPositive: r.is_positive,
    createdAt: r.created_at,
  }));

  return NextResponse.json({ data: insights });
}
