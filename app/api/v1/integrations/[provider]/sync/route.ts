import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, authed } from "@/server/http";
import { getAdapter, isProvider } from "@/server/integrations/adapters";
import { ingestCanonical } from "@/server/canonical/ingest";
import { recomputeIndicesForDate } from "@/server/checkins/service";

// POST /api/v1/integrations/:provider/sync
// Accepts one or more raw provider daily-summary payloads, runs the adapter to
// produce canonical values, and ingests them (quality-aware dedup). Live OAuth
// fetching would call the provider API then hand the payloads to this same path.
const SyncSchema = z.object({ payloads: z.array(z.unknown()).min(1) });

export async function POST(req: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  const { supabase, user } = await authed();
  if (!user) return apiError("unauthenticated", "Sign in required.", 401);
  if (!isProvider(provider)) return apiError("validation_error", "Unknown provider.", 400);

  const adapter = getAdapter(provider);
  if (!adapter) return apiError("validation_error", "No adapter for provider.", 400);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError("bad_request", "Invalid JSON.", 400);
  }
  const parsed = SyncSchema.safeParse(body);
  if (!parsed.success) return apiError("validation_error", "payloads[] required.", 400);

  const canonical = parsed.data.payloads.flatMap((p) => adapter.toCanonical(p));
  if (canonical.length === 0) {
    return NextResponse.json({ data: { written: 0, skipped: 0, recomputed: [] } });
  }
  const result = await ingestCanonical(supabase, user.id, canonical);

  // Recompute indices for each affected day so device data feeds the formulas.
  const { data: profile } = await supabase
    .from("profiles")
    .select("biological_sex")
    .eq("user_id", user.id)
    .maybeSingle();
  const sex = (profile?.biological_sex as "male" | "female" | "intersex") ?? "male";
  const days = [...new Set(canonical.map((c) => c.capturedAt.slice(0, 10)))];
  for (const d of days) {
    try {
      await recomputeIndicesForDate(supabase, user.id, d, sex);
    } catch {
      // best-effort
    }
  }

  await supabase.from("audit_log").insert({
    user_id: user.id,
    action: "integration.sync",
    entity: "integration",
    metadata: { provider, ...result, days: days.length },
  });

  return NextResponse.json({ data: { ...result, days } });
}
