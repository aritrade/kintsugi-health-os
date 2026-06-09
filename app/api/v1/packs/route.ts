import { NextResponse } from "next/server";
import { apiError, authed } from "@/server/http";
import { getMarketplace } from "@/server/packs/marketplace";

export async function GET() {
  const { supabase, user } = await authed();
  if (!user) return apiError("unauthenticated", "Sign in required.", 401);

  const { data: profile } = await supabase
    .from("profiles")
    .select("biological_sex")
    .eq("user_id", user.id)
    .maybeSingle();
  const biologicalSex = (profile?.biological_sex as "male" | "female" | "intersex") ?? "male";

  const entries = await getMarketplace(supabase, { userId: user.id, biologicalSex });
  return NextResponse.json({ data: entries });
}
