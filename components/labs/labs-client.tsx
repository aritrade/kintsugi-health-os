"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LabTrendChart } from "@/components/labs/lab-trend-chart";

type Biomarker = { id: string; slug: string; display_name: string; unit: string | null };
type TrendPoint = { date: string; value: number };
type Trend = {
  biomarker: { slug: string; displayName: string; unit: string | null };
  refLow: number | null;
  refHigh: number | null;
  latestValue: number | null;
  status: "below" | "within" | "above" | "unknown";
  series: TrendPoint[];
};

const STATUS_LABEL: Record<Trend["status"], string> = {
  below: "Below reference band",
  within: "Within reference band",
  above: "Above reference band",
  unknown: "No reference band",
};

export function LabsClient() {
  const [biomarkers, setBiomarkers] = useState<Biomarker[]>([]);
  const [slug, setSlug] = useState<string>("");
  const [trend, setTrend] = useState<Trend | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/v1/labs/biomarkers")
      .then((r) => r.json())
      .then((j) => setBiomarkers(j?.data?.biomarkers ?? []));
  }, []);

  const loadTrend = useCallback(async (s: string) => {
    if (!s) {
      setTrend(null);
      return;
    }
    setLoading(true);
    const res = await fetch(`/api/v1/labs/trends/${s}`);
    const json = await res.json();
    setTrend(json?.data ?? null);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadTrend(slug);
  }, [slug, loadTrend]);

  return (
    <main className="space-y-5 p-6">
      <h1 className="text-2xl font-semibold tracking-tight">Lab Trends</h1>

      <select
        className="h-11 w-full rounded-md border border-input bg-card px-2 text-sm"
        value={slug}
        onChange={(e) => setSlug(e.target.value)}
      >
        <option value="">Select a biomarker...</option>
        {biomarkers.map((b) => (
          <option key={b.id} value={b.slug}>
            {b.display_name}
          </option>
        ))}
      </select>

      {loading && <p className="text-sm text-muted-foreground">Loading...</p>}

      {!loading && trend && trend.series.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No results for {trend.biomarker.displayName} yet. Add lab values from a record in the vault.
        </p>
      )}

      {!loading && trend && trend.series.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {trend.biomarker.displayName}
              {trend.biomarker.unit ? ` (${trend.biomarker.unit})` : ""}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-semibold">{trend.latestValue}</span>
              <span
                className={
                  trend.status === "within"
                    ? "text-sm text-primary"
                    : trend.status === "unknown"
                      ? "text-sm text-muted-foreground"
                      : "text-sm text-amber-600"
                }
              >
                {STATUS_LABEL[trend.status]}
              </span>
            </div>
            <LabTrendChart
              series={trend.series}
              refLow={trend.refLow}
              refHigh={trend.refHigh}
              unit={trend.biomarker.unit}
            />
            {trend.refLow != null && trend.refHigh != null && (
              <p className="text-xs text-muted-foreground">
                Reference band: {trend.refLow}–{trend.refHigh} {trend.biomarker.unit}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-muted-foreground">
        Trends are for your own tracking and conversations with a clinician. Kintsugi does not diagnose.
      </p>
    </main>
  );
}
