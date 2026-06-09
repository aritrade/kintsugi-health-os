import { NextResponse } from "next/server";
import { apiError, authed } from "@/server/http";
import { getIndexTrend } from "@/server/indices/trends";
import type { IndexKind } from "@/types";

const VALID_KINDS: IndexKind[] = [
  "libido",
  "sexual_confidence",
  "erectile_function",
  "ejaculatory_control",
  "sleep_score",
  "recovery_score",
  "confidence",
  "anxiety",
  "body_image",
  "health_momentum",
  "custom",
];

// GET /api/v1/indices/:kind - daily series + 7-day rolling average for an index,
// withheld until the baseline minimum is met (docs/20-index-formulas.md).
export async function GET(_req: Request, { params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params;
  if (!VALID_KINDS.includes(kind as IndexKind)) {
    return apiError("invalid_index", "Unknown index kind.", 400);
  }
  const { supabase, user } = await authed();
  if (!user) return apiError("unauthenticated", "Sign in required.", 401);

  const trend = await getIndexTrend(supabase, user.id, kind as IndexKind);
  return NextResponse.json({ data: trend });
}
