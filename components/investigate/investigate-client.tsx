"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Search, FlaskConical, TrendingUp, CircleHelp, Sparkles } from "lucide-react";
import type { AiResponse, Experiment, ExperimentTemplate, Insight } from "@/types";

const BASELINE_MIN = 7;

const STATUS_LABEL: Record<Experiment["status"], string> = {
  draft: "Draft",
  active: "Active",
  completed: "Completed",
  abandoned: "Abandoned",
};

export function InvestigateClient({
  observations,
  initialInsights,
  initialExperiments,
  templates,
}: {
  observations: number;
  initialInsights: Insight[];
  initialExperiments: Experiment[];
  templates: ExperimentTemplate[];
}) {
  const router = useRouter();
  const [scanning, setScanning] = useState(false);
  const [scan, setScan] = useState<AiResponse | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const hasBaseline = observations >= BASELINE_MIN;

  async function runScan() {
    setScanning(true);
    try {
      const res = await fetch("/api/v1/ai/detective", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context: { windowDays: 30 } }),
      });
      const j = await res.json();
      if (res.ok) {
        setScan(j.data as AiResponse);
        router.refresh();
      }
    } finally {
      setScanning(false);
    }
  }

  async function startExperiment(templateId: string) {
    setBusyId(templateId);
    try {
      const res = await fetch("/api/v1/experiments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId }),
      });
      if (res.ok) router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function transition(id: string, action: "start" | "complete" | "abandon") {
    setBusyId(id);
    try {
      const res = await fetch(`/api/v1/experiments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function analyze(id: string) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/v1/experiments/${id}/analyze`, { method: "POST" });
      if (res.ok) router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="space-y-6 p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Investigate</h1>
        <p className="text-sm text-muted-foreground">
          The Health Detective observes patterns in your own data. It never diagnoses.
        </p>
      </header>

      <Card>
        <CardContent className="flex items-center justify-between gap-4 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-muted p-2.5">
              <Search className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">Run an investigation</p>
              <p className="text-sm text-muted-foreground">
                Scans your last 30 days for patterns and correlations.
              </p>
            </div>
          </div>
          <Button size="sm" onClick={runScan} disabled={scanning || !hasBaseline}>
            {scanning ? "Scanning..." : "Run scan"}
          </Button>
        </CardContent>
      </Card>

      {!hasBaseline && (
        <p className="text-sm text-muted-foreground">
          The Detective needs at least {BASELINE_MIN} check-ins before it can surface patterns. You
          have {observations}.
        </p>
      )}

      {scan && (
        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-primary" /> Latest scan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {scan.emergency ? (
              scan.disclaimers.map((d, i) => (
                <p key={i} className="font-medium text-red-600">
                  {d}
                </p>
              ))
            ) : (
              <>
                {scan.observations.length === 0 && (
                  <p className="text-muted-foreground">
                    No new patterns met the evidence threshold yet. Keep logging.
                  </p>
                )}
                {scan.observations.map((o, i) => (
                  <p key={i}>{o}</p>
                ))}
                {scan.hypotheses.length > 0 && (
                  <div className="space-y-1 border-t pt-3">
                    {scan.hypotheses.map((h, i) => (
                      <p key={i} className="text-muted-foreground">
                        {h.statement}
                      </p>
                    ))}
                  </div>
                )}
                {scan.disclaimers.map((d, i) => (
                  <p key={i} className="border-t pt-3 text-xs text-muted-foreground">
                    {d}
                  </p>
                ))}
              </>
            )}
          </CardContent>
        </Card>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Insights
        </h2>
        {initialInsights.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No insights yet. Run a scan once you have enough check-ins.
          </p>
        ) : (
          <div className="space-y-3">
            {initialInsights.map((ins) => (
              <Card key={ins.id} className={ins.isPositive ? "border-emerald-300/60" : undefined}>
                <CardContent className="space-y-2 py-4">
                  <div className="flex items-start gap-2">
                    {ins.isPositive ? (
                      <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    ) : (
                      <CircleHelp className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                    <p className="text-sm font-medium">{ins.observation}</p>
                  </div>
                  <p className="pl-6 text-xs text-muted-foreground">
                    {ins.sourceMetrics.join(", ")}
                    {ins.sampleSize ? ` · n=${ins.sampleSize}` : ""}
                    {ins.confidenceLevel ? ` · ${ins.confidenceLevel}` : ""}
                    {ins.coefficient != null ? ` · r=${ins.coefficient}` : ""}
                  </p>
                  {ins.investigationQuestion && (
                    <p className="pl-6 text-sm text-muted-foreground">{ins.investigationQuestion}</p>
                  )}
                  {ins.suggestedNextStep?.type === "experiment" && ins.suggestedNextStep.templateId && (
                    <div className="pl-6">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busyId === ins.suggestedNextStep.templateId}
                        onClick={() => startExperiment(ins.suggestedNextStep.templateId!)}
                      >
                        <FlaskConical className="h-4 w-4" /> Start suggested experiment
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Experiments
        </h2>

        {initialExperiments.map((exp) => (
          <Card key={exp.id}>
            <CardContent className="space-y-2 py-4">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-medium">{exp.question}</p>
                <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs">
                  {STATUS_LABEL[exp.status]}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">{exp.hypothesis}</p>
              {exp.conclusion && (
                <p className="rounded-md bg-muted p-2 text-sm">{exp.conclusion}</p>
              )}
              <div className="flex flex-wrap gap-2 pt-1">
                {exp.status === "draft" && (
                  <Button size="sm" disabled={busyId === exp.id} onClick={() => transition(exp.id, "start")}>
                    Start ({exp.durationDays}d)
                  </Button>
                )}
                {exp.status === "active" && (
                  <>
                    <Button size="sm" disabled={busyId === exp.id} onClick={() => transition(exp.id, "complete")}>
                      Complete
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busyId === exp.id}
                      onClick={() => transition(exp.id, "abandon")}
                    >
                      Abandon
                    </Button>
                  </>
                )}
                {(exp.status === "active" || exp.status === "completed") && (
                  <Button size="sm" variant="outline" disabled={busyId === exp.id} onClick={() => analyze(exp.id)}>
                    Analyze
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}

        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Start from a template
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {templates.map((t) => (
              <Card key={t.id}>
                <CardContent className="space-y-2 py-3">
                  <p className="text-sm font-medium">{t.title}</p>
                  <p className="text-xs text-muted-foreground">{t.question}</p>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busyId === t.id}
                    onClick={() => startExperiment(t.id)}
                  >
                    <FlaskConical className="h-4 w-4" /> Add ({t.durationDays}d)
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <p className="text-xs text-muted-foreground">
        Kintsugi observes and organizes your data. It does not diagnose or prescribe. Discuss any
        concerns with a healthcare professional.
      </p>
    </main>
  );
}
