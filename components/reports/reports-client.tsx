"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, TrendingUp, CircleHelp } from "lucide-react";
import type { WeeklyReportContent } from "@/server/reports/weekly";

interface ReportRow {
  id: string;
  period: string;
  period_start: string;
  period_end: string;
  content: WeeklyReportContent;
  created_at: string;
}

export function ReportsClient({
  observations,
  initialReports,
}: {
  observations: number;
  initialReports: ReportRow[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const hasBaseline = observations >= 7;

  async function generate() {
    setBusy(true);
    try {
      const res = await fetch("/api/v1/reports", { method: "POST" });
      if (res.ok) router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="space-y-6 p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
        <p className="text-sm text-muted-foreground">
          Weekly summaries of your trends, discoveries, and progress.
        </p>
      </header>

      <Card>
        <CardContent className="flex items-center justify-between gap-4 py-4">
          <div>
            <p className="font-medium">This week&apos;s report</p>
            <p className="text-sm text-muted-foreground">Trends, findings, open questions, and momentum.</p>
          </div>
          <Button size="sm" onClick={generate} disabled={busy || !hasBaseline}>
            {busy ? "Generating..." : "Generate"}
          </Button>
        </CardContent>
      </Card>

      {!hasBaseline && (
        <p className="text-sm text-muted-foreground">
          Reports unlock after 7 check-ins. You have {observations}.
        </p>
      )}

      {initialReports.length === 0 ? (
        <p className="text-sm text-muted-foreground">No reports yet.</p>
      ) : (
        <div className="space-y-4">
          {initialReports.map((r) => (
            <ReportCard key={r.id} report={r} />
          ))}
        </div>
      )}
    </main>
  );
}

function ReportCard({ report }: { report: ReportRow }) {
  const c = report.content;
  const m = c.momentum;
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">
          Week of {c.periodStart} → {c.periodEnd}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="rounded-md bg-muted p-3">
          <p className="mb-1 flex items-center gap-1.5 font-medium">
            <Sparkles className="h-4 w-4 text-primary" /> Momentum
            {m.score != null && <span className="ml-auto text-lg font-semibold">{m.score}</span>}
          </p>
          <ul className="space-y-0.5 text-muted-foreground">
            {m.mostImproved && <li>Most improved: {m.mostImproved.label} (+{m.mostImproved.change}%)</li>}
            {m.mostConsistent && <li>Most consistent: {m.mostConsistent}</li>}
            {m.mostValuableDiscovery && <li>Discovery: {m.mostValuableDiscovery}</li>}
            {m.suggestedNextInvestigation && <li>Next: {m.suggestedNextInvestigation}</li>}
            {!m.mostImproved && !m.mostValuableDiscovery && <li>Keep logging to surface momentum highlights.</li>}
          </ul>
        </div>

        <p className="text-muted-foreground">
          Check-ins: {c.checkins.days}/7 days ({c.checkins.completionRate}%)
        </p>

        {c.indexTrends.length > 0 && (
          <div>
            <p className="mb-1 font-medium">Index trends</p>
            <ul className="space-y-0.5 text-muted-foreground">
              {c.indexTrends.map((t) => (
                <li key={t.kind}>
                  {t.label}: {t.latest} ({t.change >= 0 ? "+" : ""}{t.change}%)
                </li>
              ))}
            </ul>
          </div>
        )}

        {c.positives.length > 0 && (
          <div>
            <p className="mb-1 flex items-center gap-1.5 font-medium">
              <TrendingUp className="h-4 w-4 text-emerald-600" /> Positive trends
            </p>
            <ul className="list-disc space-y-0.5 pl-5 text-muted-foreground">
              {c.positives.map((p, i) => <li key={i}>{p}</li>)}
            </ul>
          </div>
        )}

        {c.findings.length > 0 && (
          <div>
            <p className="mb-1 font-medium">Findings</p>
            <ul className="list-disc space-y-0.5 pl-5 text-muted-foreground">
              {c.findings.map((f, i) => <li key={i}>{f}</li>)}
            </ul>
          </div>
        )}

        {c.openQuestions.length > 0 && (
          <div>
            <p className="mb-1 flex items-center gap-1.5 font-medium">
              <CircleHelp className="h-4 w-4 text-muted-foreground" /> Open questions
            </p>
            <ul className="list-disc space-y-0.5 pl-5 text-muted-foreground">
              {c.openQuestions.map((q, i) => <li key={i}>{q}</li>)}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
