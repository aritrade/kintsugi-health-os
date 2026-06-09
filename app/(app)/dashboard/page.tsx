import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

  const greetingName = profile?.display_name ?? "there";

  return (
    <main className="space-y-6 p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Good day, {greetingName}.</h1>
        <p className="text-sm text-muted-foreground">
          Your investigation begins with observation. Start with today&apos;s check-in.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>90-day protocol</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Phase 1 - Observe only. Collecting baseline data. Indices appear after 7 check-ins.
        </CardContent>
      </Card>

      <section className="space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Active Investigation Packs
        </h2>
        <div className="grid gap-3">
          {(activations ?? []).map((a, i) => {
            const pack = a.pack_definitions as unknown as { name: string; slug: string } | null;
            return (
              <Card key={pack?.slug ?? i}>
                <CardContent className="py-4 text-sm font-medium">
                  {pack?.name ?? "Pack"}
                </CardContent>
              </Card>
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
