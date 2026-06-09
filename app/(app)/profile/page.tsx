import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SignOutButton } from "@/components/sign-out-button";

const PRIVACY_LABELS: Record<string, string> = {
  standard: "Standard",
  extra_protected: "Extra protected (unlock for sensitive data)",
  local_only: "Local only (sensitive data never leaves this device)",
};

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, biological_sex, privacy_mode, age_years")
    .eq("user_id", user!.id)
    .maybeSingle();

  return (
    <main className="space-y-6 p-6">
      <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <Row label="Email" value={user?.email ?? "-"} />
          <Row label="Name" value={profile?.display_name ?? "-"} />
          <Row label="Age" value={profile?.age_years ? String(profile.age_years) : "-"} />
          <Row label="Privacy mode" value={PRIVACY_LABELS[profile?.privacy_mode ?? "standard"]} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your data</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>You own your data. Full export and deletion arrive in milestone M5.</p>
          <SignOutButton />
        </CardContent>
      </Card>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
