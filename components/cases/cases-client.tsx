"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileText, Plus } from "lucide-react";

interface CaseRow {
  id: string;
  title: string;
  specialist: string | null;
  created_at: string;
}

export function CasesClient({ initialCases }: { initialCases: CaseRow[] }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [specialist, setSpecialist] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function build() {
    if (title.trim().length < 2) {
      setError("Give your case a title.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), specialist: specialist.trim() || null }),
      });
      const j = await res.json();
      if (res.ok) {
        setTitle("");
        setSpecialist("");
        router.push(`/cases/${j.data.id}`);
      } else {
        setError(j?.error?.message ?? "Could not build case.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="space-y-6 p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Case Builder</h1>
        <p className="text-sm text-muted-foreground">
          Assemble your labs, trends, observations, and questions into a shareable summary for an
          appointment.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">New case</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Title</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Sleep & energy review" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">For specialist (optional)</label>
            <Input
              value={specialist}
              onChange={(e) => setSpecialist(e.target.value)}
              placeholder="e.g. GP, endocrinologist, sleep clinic"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button onClick={build} disabled={busy}>
            <Plus className="h-4 w-4" /> {busy ? "Building..." : "Build case"}
          </Button>
        </CardContent>
      </Card>

      <section className="space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Your cases</h2>
        {initialCases.length === 0 ? (
          <p className="text-sm text-muted-foreground">No cases yet.</p>
        ) : (
          <div className="space-y-2">
            {initialCases.map((c) => (
              <Link key={c.id} href={`/cases/${c.id}`}>
                <Card className="transition-colors hover:bg-muted">
                  <CardContent className="flex items-center gap-3 py-4">
                    <FileText className="h-5 w-5 shrink-0 text-primary" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{c.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {c.specialist ? `${c.specialist} · ` : ""}
                        {new Date(c.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
