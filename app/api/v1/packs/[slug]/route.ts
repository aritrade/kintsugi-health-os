import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, authed } from "@/server/http";
import { setPackEnabled } from "@/server/packs/marketplace";

const PatchSchema = z.object({ enabled: z.boolean() });

export async function PATCH(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { supabase, user } = await authed();
  if (!user) return apiError("unauthenticated", "Sign in required.", 401);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError("bad_request", "Invalid JSON.", 400);
  }
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) return apiError("validation_error", "enabled (boolean) required.", 400);

  const ok = await setPackEnabled(supabase, user.id, slug, parsed.data.enabled);
  if (!ok) return apiError("not_found", "Unknown pack.", 404);

  await supabase.from("audit_log").insert({
    user_id: user.id,
    action: parsed.data.enabled ? "pack.activate" : "pack.deactivate",
    entity: "pack",
    metadata: { slug },
  });
  return NextResponse.json({ data: { slug, enabled: parsed.data.enabled } });
}
