import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, authed } from "@/server/http";
import { PROVIDERS, isProvider } from "@/server/integrations/adapters";
import { listConnections, connectProvider, canonicalCountsBySource } from "@/server/integrations/service";

export async function GET() {
  const { supabase, user } = await authed();
  if (!user) return apiError("unauthenticated", "Sign in required.", 401);

  const [connections, counts] = await Promise.all([
    listConnections(supabase, user.id),
    canonicalCountsBySource(supabase, user.id),
  ]);
  const byProvider = new Map(connections.map((c) => [c.provider, c]));

  return NextResponse.json({
    data: PROVIDERS.map((p) => ({
      provider: p.id,
      label: p.label,
      status: byProvider.get(p.id)?.status ?? "not_connected",
      connectedAt: byProvider.get(p.id)?.connectedAt ?? null,
      syncedMetrics: counts[p.id] ?? 0,
    })),
  });
}

const ConnectSchema = z.object({ provider: z.string(), scopes: z.array(z.string()).optional() });

export async function POST(req: Request) {
  const { supabase, user } = await authed();
  if (!user) return apiError("unauthenticated", "Sign in required.", 401);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError("bad_request", "Invalid JSON.", 400);
  }
  const parsed = ConnectSchema.safeParse(body);
  if (!parsed.success || !isProvider(parsed.data.provider)) {
    return apiError("validation_error", "Unknown provider.", 400);
  }
  await connectProvider(supabase, user.id, parsed.data.provider, parsed.data.scopes ?? []);
  await supabase.from("audit_log").insert({
    user_id: user.id,
    action: "integration.connect",
    entity: "integration",
    metadata: { provider: parsed.data.provider },
  });
  return NextResponse.json({ data: { connected: true } }, { status: 201 });
}
