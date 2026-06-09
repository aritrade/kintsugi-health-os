import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { saveCheckin } from "@/server/checkins/service";
import type { BiologicalSex } from "@/types";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const scale = z.number().int().min(1).max(10).nullable().optional();

const CheckinSchema = z.object({
  bedtime: z.string().nullable().optional(),
  wakeTime: z.string().nullable().optional(),
  sleepDurationMin: z.number().int().min(0).max(1440).nullable().optional(),
  sleepQuality: scale,
  dryMouth: z.boolean().nullable().optional(),
  snoring: z.boolean().nullable().optional(),
  nightAwakenings: z.number().int().min(0).max(50).nullable().optional(),
  energy: scale,
  fatigue: scale,
  recovery: scale,
  pain: scale,
  mood: scale,
  anxiety: scale,
  stress: scale,
  confidence: scale,
  ran: z.boolean().nullable().optional(),
  strengthTrained: z.boolean().nullable().optional(),
  walked: z.boolean().nullable().optional(),
  steps: z.number().int().min(0).max(200000).nullable().optional(),
  waterMl: z.number().int().min(0).max(20000).nullable().optional(),
  alcoholUnits: z.number().min(0).max(50).nullable().optional(),
  nicotine: z.boolean().nullable().optional(),
  caffeineMg: z.number().int().min(0).max(2000).nullable().optional(),
  isComplete: z.boolean().optional(),
  packMetrics: z
    .array(
      z.object({
        metricId: z.string().uuid(),
        valueNum: z.number().nullable().optional(),
        valueBool: z.boolean().nullable().optional(),
        valueText: z.string().max(500).nullable().optional(),
      }),
    )
    .optional(),
});

function err(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

async function getContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ date: string }> },
) {
  const { date } = await params;
  if (!DATE_RE.test(date)) return err("bad_request", "Invalid date.", 400);
  const { supabase, user } = await getContext();
  if (!user) return err("unauthenticated", "Sign in required.", 401);

  const { data: checkin } = await supabase
    .from("checkins")
    .select("*")
    .eq("user_id", user.id)
    .eq("checkin_date", date)
    .maybeSingle();

  const { data: packMetrics } = await supabase
    .from("pack_metric_entries")
    .select("metric_id, value_num, value_bool, value_text")
    .eq("user_id", user.id)
    .eq("entry_date", date);

  return NextResponse.json({ data: { checkin: checkin ?? null, packMetrics: packMetrics ?? [] } });
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ date: string }> },
) {
  const { date } = await params;
  if (!DATE_RE.test(date)) return err("bad_request", "Invalid date.", 400);

  const { supabase, user } = await getContext();
  if (!user) return err("unauthenticated", "Sign in required.", 401);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return err("bad_request", "Invalid JSON.", 400);
  }
  const parsed = CheckinSchema.safeParse(body);
  if (!parsed.success) {
    return err("validation_error", parsed.error.issues[0]?.message ?? "Invalid input.", 422);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("biological_sex")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!profile) return err("no_profile", "Complete onboarding first.", 409);

  try {
    const result = await saveCheckin(
      supabase,
      user.id,
      date,
      profile.biological_sex as BiologicalSex,
      parsed.data,
    );
    return NextResponse.json({ data: result });
  } catch (e) {
    return err("db_error", (e as Error).message, 500);
  }
}
