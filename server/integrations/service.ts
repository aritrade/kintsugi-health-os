import type { SupabaseClient } from "@supabase/supabase-js";

export interface ConnectionRow {
  provider: string;
  status: string;
  scopes: string[] | null;
  connectedAt: string;
}

export async function listConnections(supabase: SupabaseClient, userId: string): Promise<ConnectionRow[]> {
  const { data } = await supabase
    .from("integration_connections")
    .select("provider, status, scopes, connected_at")
    .eq("user_id", userId);
  return (data ?? []).map((r) => ({
    provider: r.provider as string,
    status: r.status as string,
    scopes: (r.scopes as string[]) ?? null,
    connectedAt: r.connected_at as string,
  }));
}

export async function connectProvider(
  supabase: SupabaseClient,
  userId: string,
  provider: string,
  scopes: string[] = [],
): Promise<void> {
  const { data: existing } = await supabase
    .from("integration_connections")
    .select("id")
    .eq("user_id", userId)
    .eq("provider", provider)
    .maybeSingle();
  if (existing) {
    await supabase
      .from("integration_connections")
      .update({ status: "connected", scopes, connected_at: new Date().toISOString() })
      .eq("id", existing.id);
  } else {
    await supabase.from("integration_connections").insert({
      user_id: userId,
      provider,
      status: "connected",
      scopes,
    });
  }
}

export async function disconnectProvider(supabase: SupabaseClient, userId: string, provider: string): Promise<void> {
  await supabase
    .from("integration_connections")
    .update({ status: "disconnected" })
    .eq("user_id", userId)
    .eq("provider", provider);
}

// Count of canonical metric values per source (for UI "synced" indicators).
export async function canonicalCountsBySource(
  supabase: SupabaseClient,
  userId: string,
): Promise<Record<string, number>> {
  const { data } = await supabase
    .from("canonical_metric_values")
    .select("source")
    .eq("user_id", userId)
    .limit(5000);
  const counts: Record<string, number> = {};
  for (const r of data ?? []) counts[r.source as string] = (counts[r.source as string] ?? 0) + 1;
  return counts;
}
