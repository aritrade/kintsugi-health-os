import { NextResponse } from "next/server";
import { apiError, authed } from "@/server/http";
import { isProvider } from "@/server/integrations/adapters";
import { disconnectProvider } from "@/server/integrations/service";

export async function DELETE(_req: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  const { supabase, user } = await authed();
  if (!user) return apiError("unauthenticated", "Sign in required.", 401);
  if (!isProvider(provider)) return apiError("validation_error", "Unknown provider.", 400);

  await disconnectProvider(supabase, user.id, provider);
  await supabase.from("audit_log").insert({
    user_id: user.id,
    action: "integration.disconnect",
    entity: "integration",
    metadata: { provider },
  });
  return NextResponse.json({ data: { disconnected: true } });
}
