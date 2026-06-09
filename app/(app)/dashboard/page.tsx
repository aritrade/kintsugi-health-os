import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { INDEX_LABELS } from "@/lib/index-labels";
import { BASELINE_MIN_OBSERVATIONS } from "@/packs/normalize";
import { ClipboardCheck, Check, Sparkles } from "lucide-react";
import type { IndexKind } from "@/types";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("user_id", user!.id)
    .maybeSingle();

  const { data: activations } = await supabase
    .from("pack_activations")
    .select("is_enabled, pack_definitions(name, slug)")
    .eq("is_enabled", true);

  const today = new Date().toISOString().slice(0, 10);
  const { data: todayCheckin } = await supabase
    .from("checkins")
    .select("is_complete")
    .eq("user_id", user!.id)
    .eq("checkin_date", today)
    .maybeSingle();

  const { count: checkinCount } = await supabase
    .from("checkins")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user!.id);

  const observations = checkinCount ?? 0;
  const hasBaseline = observations >= BASELINE_MIN_OBSERVATIONS;

  // Latest value per index kind (only meaningful once a baseline exists).
  const latestIndices: { kind: IndexKind; value: number }[] = [];
  let momentum: { value: number; components: Record<string, number> } | null = null;
  if (hasBaseline) {
    const { data: indices } = await supabase
      .from("derived_indices")
      .select("index_kind, value, index_date, inputs")
      .eq("user_id", user!.id)
      .order("index_date", { ascending: false })
      .limit(120);
    const seen = new Set<string>();
    for (const row of indices ?? []) {
      if (seen.has(row.index_kind)) continue;
      seen.add(row.index_kind);
      if (row.index_kind === "health_momentum") {
        momentum = { value: Math.round(Number(row.value)), components: (row.inputs as Record<string, number>) ?? {} };
        continue;
      }
      latestIndices.push({ kind: row.index_kind as IndexKind, value: Math.round(Number(row.value)) });
    }
  }
  const MOMENTUM_PARTS: { key: string; label: string }[] = [
    { key: "consistency", label: "Consistency" },
    { key: "physical_progress", label: "Physical" },
    { key: "understanding", label: "Understanding" },
    { key: "confidence", label: "Confidence" },
  ];

  const greetingName = profile?.display_name ?? "there";
  const checkinDone = !!todayCheckin?.is_complete;

  return (
    <main className="space-y-6 p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Good day, {greetingName}.</h1>
        <p className="text-sm text-muted-foreground">
          Your investigation begins with observation.
        </p>
      </header>

      <Card>
        <CardContent className="flex items-center justify-between gap-4 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-muted p-2.5">
              {checkinDone ? (
                <Check className="h-5 w-5 text-primary" />
              ) : (
                <ClipboardCheck className="h-5 w-5 text-primary" />
              )}
            </div>
            <div>
              <p className="font-medium">{checkinDone ? "Today's check-in is done" : "Today's check-in"}</p>
              <p className="text-sm text-muted-foreground">
                {checkinDone ? "Tap to review or edit." : "Takes under 90 seconds."}
              </p>
            </div>
          </div>
          <Link href="/checkin">
            <Button size="sm" variant={checkinDone ? "outline" : "default"}>
              {checkinDone ? "Review" : "Start"}
            </Button>
          </Link>
        </CardContent>
      </Card>

      {momentum && (
        <Card>
          <CardContent className="space-y-3 py-4">
            <div className="flex items-baseline justify-between">
              <p className="flex items-center gap-1.5 text-sm font-medium">
                <Sparkles className="h-4 w-4 text-primary" /> Health Momentum
              </p>
              <p className="text-2xl font-semibold">{momentum.value}</p>
            </div>
            <div className="grid grid-cols-4 gap-2 text-center">
              {MOMENTUM_PARTS.map((p) => (
                <div key={p.key} className="rounded-md bg-muted py-2">
                  <p className="text-sm font-semibold">{momentum!.components[p.key] ?? "—"}</p>
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{p.label}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {hasBaseline && latestIndices.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Your indices
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {latestIndices.map((idx) => (
              <Card key={idx.kind}>
                <CardContent className="py-4">
                  <p className="text-sm text-muted-foreground">{INDEX_LABELS[idx.kind]}</p>
                  <p className="text-2xl font-semibold">{idx.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">90-day protocol - Phase 1</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>Observe only. Collecting baseline data. Your indices unlock after {BASELINE_MIN_OBSERVATIONS} check-ins.</p>
            <div className="space-y-1">
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${Math.min(100, (observations / BASELINE_MIN_OBSERVATIONS) * 100)}%` }}
                />
              </div>
              <p className="text-xs">
                {observations} / {BASELINE_MIN_OBSERVATIONS} check-ins
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <Link href="/timeline">
          <Card className="h-full transition-colors hover:bg-muted">
            <CardContent className="py-4">
              <p className="font-medium">Timeline</p>
              <p className="text-sm text-muted-foreground">Your health history</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/memory">
          <Card className="h-full transition-colors hover:bg-muted">
            <CardContent className="py-4">
              <p className="font-medium">Memory</p>
              <p className="text-sm text-muted-foreground">Notes &amp; questions</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/reports">
          <Card className="h-full transition-colors hover:bg-muted">
            <CardContent className="py-4">
              <p className="font-medium">Reports</p>
              <p className="text-sm text-muted-foreground">Weekly summaries</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/cases">
          <Card className="h-full transition-colors hover:bg-muted">
            <CardContent className="py-4">
              <p className="font-medium">Case Builder</p>
              <p className="text-sm text-muted-foreground">For appointments</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/integrations">
          <Card className="h-full transition-colors hover:bg-muted">
            <CardContent className="py-4">
              <p className="font-medium">Integrations</p>
              <p className="text-sm text-muted-foreground">Wearables &amp; apps</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/explore">
          <Card className="h-full transition-colors hover:bg-muted">
            <CardContent className="py-4">
              <p className="font-medium">Explore Packs</p>
              <p className="text-sm text-muted-foreground">Marketplace</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/assistant">
          <Card className="h-full transition-colors hover:bg-muted">
            <CardContent className="py-4">
              <p className="font-medium">Assistant</p>
              <p className="text-sm text-muted-foreground">Historian &amp; research</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/graph">
          <Card className="h-full transition-colors hover:bg-muted">
            <CardContent className="py-4">
              <p className="font-medium">Knowledge Graph</p>
              <p className="text-sm text-muted-foreground">How metrics connect</p>
            </CardContent>
          </Card>
        </Link>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Active Investigation Packs
        </h2>
        <div className="grid gap-3">
          {(activations ?? []).map((a, i) => {
            const pack = a.pack_definitions as unknown as { name: string; slug: string } | null;
            if (!pack) return null;
            return (
              <Link key={pack.slug ?? i} href={`/packs/${pack.slug}`}>
                <Card className="transition-colors hover:bg-muted">
                  <CardContent className="flex items-center justify-between py-4 text-sm font-medium">
                    {pack.name}
                    <span className="text-xs font-normal text-muted-foreground">View indices &rarr;</span>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
          {(activations ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">No packs enabled yet.</p>
          )}
        </div>
      </section>

      <p className="text-xs text-muted-foreground">
        Kintsugi helps you observe and organize. It does not diagnose. Discuss concerns with a
        healthcare professional.
      </p>
    </main>
  );
}
