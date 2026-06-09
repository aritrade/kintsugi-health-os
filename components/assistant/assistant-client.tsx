"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BookOpen, ScrollText, Stethoscope } from "lucide-react";

type Tab = "historian" | "research" | "appointment";

export function AssistantClient({
  specialists,
  topics,
}: {
  specialists: { id: string; label: string }[];
  topics: string[];
}) {
  const [tab, setTab] = useState<Tab>("historian");

  return (
    <main className="space-y-6 p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Assistant</h1>
        <p className="text-sm text-muted-foreground">
          Evidence-aware tools. Observational and educational only - never diagnosis or treatment.
        </p>
      </header>

      <div className="flex gap-2">
        <TabButton active={tab === "historian"} onClick={() => setTab("historian")} icon={ScrollText} label="Historian" />
        <TabButton active={tab === "research"} onClick={() => setTab("research")} icon={BookOpen} label="Research" />
        <TabButton active={tab === "appointment"} onClick={() => setTab("appointment")} icon={Stethoscope} label="Appointment" />
      </div>

      {tab === "historian" && <Historian />}
      {tab === "research" && <Research topics={topics} />}
      {tab === "appointment" && <Appointment specialists={specialists} />}
    </main>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof BookOpen;
  label: string;
}) {
  return (
    <Button size="sm" variant={active ? "default" : "outline"} onClick={onClick}>
      <Icon className="h-4 w-4" /> {label}
    </Button>
  );
}

function Historian() {
  const [paragraphs, setParagraphs] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);
  async function run() {
    setBusy(true);
    const res = await fetch("/api/v1/ai/historian", { method: "POST" });
    const j = await res.json();
    setBusy(false);
    if (res.ok) setParagraphs(j.data.paragraphs);
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Health Historian</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p className="text-muted-foreground">A narrative reconstruction built from your own data.</p>
        <Button size="sm" onClick={run} disabled={busy}>
          {busy ? "Writing..." : "Generate narrative"}
        </Button>
        {paragraphs && (
          <div className="space-y-2 border-t pt-3">
            {paragraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface ResearchResult {
  summary: string | null;
  evidenceLevel: string | null;
  citations: { source: string; note: string }[];
  matched: { topic: string } | null;
}

function Research({ topics }: { topics: string[] }) {
  const [q, setQ] = useState("");
  const [result, setResult] = useState<ResearchResult | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(query: string) {
    setBusy(true);
    const res = await fetch(`/api/v1/ai/research?q=${encodeURIComponent(query)}`);
    const j = await res.json();
    setBusy(false);
    if (res.ok) setResult(j.data);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Research Assistant</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex gap-2">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. sleep and libido" />
          <Button size="sm" onClick={() => run(q)} disabled={busy || !q}>
            Ask
          </Button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {topics.map((t) => (
            <button
              key={t}
              onClick={() => {
                setQ(t);
                run(t);
              }}
              className="rounded-full border px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted"
            >
              {t}
            </button>
          ))}
        </div>
        {result && (
          <div className="space-y-2 border-t pt-3">
            {result.summary ? (
              <>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{result.matched?.topic}</span>
                  {result.evidenceLevel && (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{result.evidenceLevel} evidence</span>
                  )}
                </div>
                <p>{result.summary}</p>
                {result.citations.length > 0 && (
                  <ul className="list-disc space-y-0.5 pl-5 text-xs text-muted-foreground">
                    {result.citations.map((c, i) => (
                      <li key={i}>
                        <span className="font-medium">{c.source}</span> - {c.note}
                      </li>
                    ))}
                  </ul>
                )}
              </>
            ) : (
              <p className="text-muted-foreground">No close match. Try one of the topics above.</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface Prep {
  specialist: string;
  focusIndices: { label: string; value: number; date: string }[];
  focusLabs: { name: string; value: number; unit: string | null; status: string; date: string }[];
  questions: string[];
  openQuestions: string[];
}

function Appointment({ specialists }: { specialists: { id: string; label: string }[] }) {
  const [prep, setPrep] = useState<Prep | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function run(specialist: string) {
    setBusy(specialist);
    const res = await fetch("/api/v1/ai/appointment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ specialist }),
    });
    const j = await res.json();
    setBusy(null);
    if (res.ok) setPrep(j.data);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Appointment Preparation</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p className="text-muted-foreground">Pick a specialist to assemble focused data and questions.</p>
        <div className="flex flex-wrap gap-1.5">
          {specialists.map((s) => (
            <Button key={s.id} size="sm" variant="outline" onClick={() => run(s.id)} disabled={busy === s.id}>
              {s.label}
            </Button>
          ))}
        </div>
        {prep && (
          <div className="space-y-3 border-t pt-3">
            <p className="font-medium">Prep for {prep.specialist}</p>
            {prep.focusIndices.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Relevant indices</p>
                <ul className="space-y-0.5 text-muted-foreground">
                  {prep.focusIndices.map((i) => (
                    <li key={i.label}>{i.label}: {i.value} (as of {i.date})</li>
                  ))}
                </ul>
              </div>
            )}
            {prep.focusLabs.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Relevant labs</p>
                <ul className="space-y-0.5 text-muted-foreground">
                  {prep.focusLabs.map((l, i) => (
                    <li key={i}>{l.name}: {l.value}{l.unit ? ` ${l.unit}` : ""} ({l.status})</li>
                  ))}
                </ul>
              </div>
            )}
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Questions to ask</p>
              <ul className="list-disc space-y-0.5 pl-5 text-muted-foreground">
                {prep.questions.map((q, i) => <li key={i}>{q}</li>)}
                {prep.openQuestions.map((q, i) => <li key={`o${i}`}>{q}</li>)}
              </ul>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
