import { createClient } from "@/lib/supabase/server";
import { PROVIDERS } from "@/server/integrations/adapters";
import { listConnections, canonicalCountsBySource } from "@/server/integrations/service";
import { IntegrationsClient } from "@/components/integrations/integrations-client";

export default async function IntegrationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [connections, counts] = await Promise.all([
    listConnections(supabase, user!.id),
    canonicalCountsBySource(supabase, user!.id),
  ]);
  const byProvider = new Map(connections.map((c) => [c.provider, c]));

  const providers = PROVIDERS.map((p) => ({
    provider: p.id,
    label: p.label,
    status: byProvider.get(p.id)?.status ?? "not_connected",
    syncedMetrics: counts[p.id] ?? 0,
  }));

  return <IntegrationsClient providers={providers} />;
}
