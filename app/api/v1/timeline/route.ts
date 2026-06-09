import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { mapTimelineRow } from "@/server/timeline/map";
import { defaultSensitivityFor, isValidClassification } from "@/lib/timeline-taxonomy";
import type { PrivacyMode, TimelineCategory } from "@/types";

function err(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

const CATEGORIES = [
  "health", "sexual_health", "sleep", "labs", "mental_health",
  "fitness", "body_composition", "lifestyle", "life_events",
] as const;

const CreateSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(4000).optional(),
  category: z.enum(CATEGORIES),
  subcategory: z.string().trim().min(1).max(80),
  lifeStage: z.enum(["childhood", "puberty", "teen", "adult"]),
  eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  approxPeriod: z.string().trim().max(80).nullable().optional(),
});

export async function GET(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return err("unauthenticated", "Sign in required.", 401);

  const url = new URL(req.url);
  const category = url.searchParams.get("category");
  const lifeStage = url.searchParams.get("lifeStage");
  const source = url.searchParams.get("source");
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const q = url.searchParams.get("q");
  const unlocked = url.searchParams.get("unlocked") === "1";

  let query = supabase
    .from("timeline_events")
    .select("*")
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .order("event_date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (category) query = query.eq("category", category);
  if (lifeStage) query = query.eq("life_stage", lifeStage);
  if (source) query = query.eq("source", source);
  if (from) query = query.gte("event_date", from);
  if (to) query = query.lte("event_date", to);
  if (q) query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%`);

  const { data, error } = await query;
  if (error) return err("db_error", error.message, 500);

  // Sensitivity gate: hide highly_sensitive in extra-protected mode unless unlocked.
  const { data: profile } = await supabase
    .from("profiles")
    .select("privacy_mode")
    .eq("user_id", user.id)
    .maybeSingle();
  const mode = (profile?.privacy_mode ?? "standard") as PrivacyMode;

  let rows = data ?? [];
  if (mode === "extra_protected" && !unlocked) {
    rows = rows.filter((r) => r.sensitivity !== "highly_sensitive");
  }

  return NextResponse.json({ data: { events: rows.map(mapTimelineRow) } });
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return err("unauthenticated", "Sign in required.", 401);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return err("bad_request", "Invalid JSON.", 400);
  }
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) return err("validation_error", parsed.error.issues[0]?.message ?? "Invalid input.", 422);

  const input = parsed.data;
  if (!isValidClassification(input.category, input.subcategory)) {
    return err("invalid_classification", "category/subcategory not in taxonomy.", 422);
  }

  // User-entered events: confidence 1.0 with exact date, lower if only approximate.
  const confidence = input.eventDate ? 1.0 : input.approxPeriod ? 0.6 : 0.8;

  const { data, error } = await supabase
    .from("timeline_events")
    .insert({
      user_id: user.id,
      title: input.title,
      description: input.description ?? null,
      category: input.category,
      subcategory: input.subcategory,
      life_stage: input.lifeStage,
      event_date: input.eventDate ?? null,
      approx_period: input.approxPeriod ?? null,
      confidence,
      sensitivity: defaultSensitivityFor(input.category as TimelineCategory),
      source: "user",
    })
    .select()
    .single();

  if (error) return err("db_error", error.message, 500);
  return NextResponse.json({ data: { event: mapTimelineRow(data) } }, { status: 201 });
}
