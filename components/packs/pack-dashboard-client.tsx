"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { IndexTrendChart } from "@/components/packs/index-trend-chart";
import { useUiStore } from "@/stores/ui-store";
import { Lock, Unlock } from "lucide-react";
import type { PrivacyMode } from "@/types";
import type { IndexTrend } from "@/server/indices/trends";

export interface PackCard {
  indexKind: string;
  title: string;
  trend: IndexTrend;
}

export function PackDashboardClient({
  packName,
  description,
  containsSensitive,
  privacyMode,
  baselineMin,
  cards,
}: {
  packName: string;
  description: string;
  containsSensitive: boolean;
  privacyMode: PrivacyMode;
  baselineMin: number;
  cards: PackCard[];
}) {
  const unlocked = useUiStore((s) => s.sensitiveUnlocked);
  const setUnlocked = useUiStore((s) => s.setSensitiveUnlocked);
  // Sensitive surfaces are gated only in extra-protected mode.
  const gated = containsSensitive && privacyMode === "extra_protected" && !unlocked;

  return (
    <main className="space-y-5 p-6">
      <header className="space-y-1">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          {packName}
          {containsSensitive && (
            <span className="inline-flex items-center gap-1 text-xs font-normal text-muted-foreground">
              {gated ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
              private
            </span>
          )}
        </h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </header>

      {gated ? (
        <Card>
          <CardContent className="space-y-3 py-6">
            <p className="text-sm text-muted-foreground">
              This pack contains sensitive data and is hidden in extra-protected mode.
            </p>
            <Button variant="outline" size="sm" onClick={() => setUnlocked(true)}>
              <Unlock className="h-4 w-4" /> Unlock to view
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {cards.map((card) => (
            <Card key={card.indexKind}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-baseline justify-between text-base">
                  <span>{card.title}</span>
                  {card.trend.latest != null && (
                    <span className="text-2xl font-semibold tabular-nums">{card.trend.latest}</span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {card.trend.hasBaseline ? (
                  <IndexTrendChart series={card.trend.series} />
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Collecting baseline data.</p>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${Math.min(100, (card.trend.observations / baselineMin) * 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {card.trend.observations} / {baselineMin} observations
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Indices describe your own trends over time. They are not diagnostic and unlock after{" "}
        {baselineMin} observations.
      </p>
    </main>
  );
}
