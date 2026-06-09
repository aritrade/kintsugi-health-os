import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { activateEligiblePacks } from "@/server/packs/eligibility";
import { calcAge } from "@/lib/utils";
import type { Profile } from "@/types";

const OnboardingSchema = z.object({
  displayName: z.string().trim().max(80).optional(),
  biologicalSex: z.enum(["male", "female", "intersex", "prefer_not_to_say"]),
  genderIdentity: z.string().trim().max(80).optional(),
  sexualOrientation: z.string().trim().max(80).optional(),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  relationshipStatus: z.string().trim().max(80).optional(),
  reproductiveGoals: z.string().trim().max(500).optional(),
  privacyMode: z.enum(["standard", "extra_protected", "local_only"]),
  consent: z.literal(true),
});

function errorEnvelope(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return errorEnvelope("unauthenticated", "Sign in required.", 401);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorEnvelope("bad_request", "Invalid JSON body.", 400);
  }

  const parsed = OnboardingSchema.safeParse(body);
  if (!parsed.success) {
    return errorEnvelope("validation_error", parsed.error.issues[0]?.message ?? "Invalid input.", 422);
  }

  const input = parsed.data;
  const ageYears = calcAge(input.dateOfBirth);

  const { data: upserted, error: upsertError } = await supabase
    .from("profiles")
    .upsert(
      {
        user_id: user.id,
        display_name: input.displayName ?? null,
        biological_sex: input.biologicalSex,
        gender_identity: input.genderIdentity ?? null,
        sexual_orientation: input.sexualOrientation ?? null,
        date_of_birth: input.dateOfBirth ?? null,
        age_years: ageYears ?? null,
        relationship_status: input.relationshipStatus ?? null,
        reproductive_goals: input.reproductiveGoals ?? null,
        privacy_mode: input.privacyMode,
        onboarding_completed: true,
      },
      { onConflict: "user_id" },
    )
    .select()
    .single();

  if (upsertError) {
    return errorEnvelope("db_error", upsertError.message, 500);
  }

  const profile: Profile = {
    id: upserted.id,
    userId: upserted.user_id,
    displayName: upserted.display_name ?? undefined,
    biologicalSex: upserted.biological_sex,
    genderIdentity: upserted.gender_identity ?? undefined,
    sexualOrientation: upserted.sexual_orientation ?? undefined,
    dateOfBirth: upserted.date_of_birth ?? undefined,
    ageYears: upserted.age_years ?? undefined,
    relationshipStatus: upserted.relationship_status ?? undefined,
    reproductiveGoals: upserted.reproductive_goals ?? undefined,
    privacyMode: upserted.privacy_mode,
    onboardingCompleted: upserted.onboarding_completed,
    createdAt: upserted.created_at,
    updatedAt: upserted.updated_at,
  };

  let activatedPacks: string[] = [];
  try {
    activatedPacks = await activateEligiblePacks(supabase, user.id, profile);
  } catch (e) {
    return errorEnvelope("pack_activation_failed", (e as Error).message, 500);
  }

  return NextResponse.json({ data: { profile, activatedPacks } }, { status: 200 });
}
