"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Activity, Check, Link2, Upload } from "lucide-react";

interface Provider {
  provider: string;
  label: string;
  status: string;
  syncedMetrics: number;
}

export function IntegrationsClient({ providers }: { providers: Provider[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [syncFor, setSyncFor] = useState<string | null>(null);
  const [payload, setPayload] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  async function connect(provider: string) {
    setBusy(provider);
    await fetch("/api/v1/integrations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider }),
    });
    setBusy(null);
    router.refresh();
  }

  async function disconnect(provider: string) {
    setBusy(provider);
    await fetch(`/api/v1/integrations/${provider}`, { method: "DELETE" });
    setBusy(null);
    router.refresh();
  }

  async function sync(provider: string) {
    setMsg(null);
    let payloads: unknown[];
    try {
      const parsed = JSON.parse(payload);
      payloads = Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      setMsg("Invalid JSON.");
      return;
    }
    setBusy(provider);
    const res = await fetch(`/api/v1/integrations/${provider}/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payloads }),
    });
    const j = await res.json();
    setBusy(null);
    if (res.ok) {
      setMsg(`Synced ${j.data.written} metric(s) across ${j.data.days?.length ?? 0} day(s).`);
      setPayload("");
      setSyncFor(null);
      router.refresh();
    } else {
      setMsg(j?.error?.message ?? "Sync failed.");
    }
  }

  return (
    <main className="space-y-6 p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Integrations</h1>
        <p className="text-sm text-muted-foreground">
          Connect wearables and health apps. Their data maps into a vendor-independent metric layer that
          feeds your indices and the Detective.
        </p>
      </header>

      {msg && <p className="rounded-md bg-muted p-3 text-sm">{msg}</p>}

      <div className="space-y-2">
        {providers.map((p) => {
          const connected = p.status === "connected";
          return (
            <Card key={p.provider}>
              <CardContent className="space-y-3 py-4">
                <div className="flex items-center gap-3">
                  <Activity className="h-5 w-5 text-primary" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{p.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {connected ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600">
                          <Check className="h-3 w-3" /> Connected
                        </span>
                      ) : (
                        "Not connected"
                      )}
                      {p.syncedMetrics > 0 && ` · ${p.syncedMetrics} metrics synced`}
                    </p>
                  </div>
                  {connected ? (
                    <Button size="sm" variant="outline" onClick={() => disconnect(p.provider)} disabled={busy === p.provider}>
                      Disconnect
                    </Button>
                  ) : (
                    <Button size="sm" onClick={() => connect(p.provider)} disabled={busy === p.provider}>
                      <Link2 className="h-4 w-4" /> Connect
                    </Button>
                  )}
                </div>

                {connected && (
                  <div className="border-t pt-3">
                    {syncFor === p.provider ? (
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">
                          Paste a {p.label} daily-summary JSON payload (or an array of days).
                        </p>
                        <textarea
                          className="h-28 w-full rounded-md border bg-background p-2 font-mono text-xs"
                          value={payload}
                          onChange={(e) => setPayload(e.target.value)}
                          placeholder='{"day":"2026-06-09","score":82,"total_sleep_duration":27000}'
                        />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => sync(p.provider)} disabled={busy === p.provider}>
                            <Upload className="h-4 w-4" /> Sync
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setSyncFor(null)}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button size="sm" variant="ghost" onClick={() => { setSyncFor(p.provider); setPayload(""); }}>
                        <Upload className="h-4 w-4" /> Sync data
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground">
        Live OAuth sync requires per-provider API credentials. The adapters and canonical pipeline are
        fully wired; once credentials are configured, scheduled sync will use the same path.
      </p>
    </main>
  );
}
