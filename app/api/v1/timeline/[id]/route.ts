import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { mapTimelineRow } from "@/server/timeline/map";
import { defaultSensitivityFor, isValidClassification } from "@/lib/timeline-taxonomy";
import type { TimelineCategory } from "@/types";

function err(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

const CATEGORIES = [
  "health", "sexual_health", "sleep", "labs", "mental_health",
  "fitness", "body_composition", "lifestyle", "life_events",
] as const;

const PatchSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(4000).nullable().optional(),
  category: z.enum(CATEGORIES).optional(),
  subcategory: z.string().trim().min(1).max(80).optional(),
  lifeStage: z.enum(["childhood", "puberty", "teen", "adult"]).optional(),
  eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  approxPeriod: z.string().trim().max(80).nullable().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
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
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) return err("validation_error", parsed.error.issues[0]?.message ?? "Invalid input.", 422);

  const i = parsed.data;
  const patch: Record<string, unknown> = {};
  if (i.title !== undefined) patch.title = i.title;
  if (i.description !== undefined) patch.description = i.description;
  if (i.lifeStage !== undefined) patch.life_stage = i.lifeStage;
  if (i.eventDate !== undefined) patch.event_date = i.eventDate;
  if (i.approxPeriod !== undefined) patch.approx_period = i.approxPeriod;

  // Reclassification: both category and subcategory must remain a valid pair.
  if (i.category !== undefined || i.subcategory !== undefined) {
    const { data: existing } = await supabase
      .from("timeline_events")
      .select("category, subcategory")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!existing) return err("not_found", "Event not found.", 404);
    const category = (i.category ?? existing.category) as TimelineCategory;
    const subcategory = i.subcategory ?? existing.subcategory;
    if (!isValidClassification(category, subcategory)) {
      return err("invalid_classification", "category/subcategory not in taxonomy.", 422);
    }
    patch.category = category;
    patch.subcategory = subcategory;
    patch.sensitivity = defaultSensitivityFor(category);
  }

  const { data, error } = await supabase
    .from("timeline_events")
    .update(patch)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .maybeSingle();

  if (error) return err("db_error", error.message, 500);
  if (!data) return err("not_found", "Event not found.", 404);
  return NextResponse.json({ data: { event: mapTimelineRow(data) } });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return err("unauthenticated", "Sign in required.", 401);

  const { error } = await supabase
    .from("timeline_events")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return err("db_error", error.message, 500);
  return NextResponse.json({ data: { deleted: true } });
}
