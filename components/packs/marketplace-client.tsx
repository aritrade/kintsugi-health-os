"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BadgeCheck, Lock, Check } from "lucide-react";
import type { MarketplaceEntry } from "@/server/packs/marketplace";

export function MarketplaceClient({ entries }: { entries: MarketplaceEntry[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function toggle(slug: string, enabled: boolean) {
    setBusy(slug);
    await fetch(`/api/v1/packs/${slug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled }),
    });
    setBusy(null);
    router.refresh();
  }

  return (
    <main className="space-y-6 p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Explore Packs</h1>
        <p className="text-sm text-muted-foreground">
          Investigation packs add metrics and indices for a specific domain. Activate what is relevant
          to you; deactivate anytime. All first-party packs pass a safety review.
        </p>
      </header>

      <div className="space-y-2">
        {entries.map((e) => (
          <Card key={e.slug}>
            <CardContent className="flex items-start gap-3 py-4">
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">{e.name}</p>
                  {e.verified && <BadgeCheck className="h-4 w-4 text-primary" aria-label="Verified" />}
                  {e.sensitive && <Lock className="h-3.5 w-3.5 text-muted-foreground" aria-label="Sensitive" />}
                </div>
                <p className="text-sm text-muted-foreground">{e.description}</p>
                <p className="text-xs text-muted-foreground">
                  {e.metricCount} metrics · {e.indexCount} {e.indexCount === 1 ? "index" : "indices"} · v{e.version}
                </p>
              </div>
              {e.enabled ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => toggle(e.slug, false)}
                  disabled={busy === e.slug}
                >
                  <Check className="h-4 w-4" /> Active
                </Button>
              ) : (
                <Button size="sm" onClick={() => toggle(e.slug, true)} disabled={busy === e.slug}>
                  Activate
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
}
