/**
 * M6 verification: RLS cross-user isolation + export/delete round-trip.
 * Run: npx tsx scripts/verify-m6.ts
 */
import { existsSync, readFileSync } from "node:fs";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { buildExport } from "@/server/account/export";
import { hardDeleteAccount } from "@/server/account/delete";

function loadEnv() {
  const candidates = [process.env.E2E_ENV_FILE, ".env.local", "/tmp/kintsugi.env"].filter(Boolean) as string[];
  for (const path of candidates) {
    if (!existsSync(path)) continue;
    for (const line of readFileSync(path, "utf8").split("\n")) {
      const m = line.match(/^([A-Za-z0-9_]+)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
    }
  }
}
loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

let failures = 0;
function check(name: string, ok: boolean, detail = "") {
  console.log(`${ok ? "[PASS]" : "[FAIL]"} ${name}${detail ? ` - ${detail}` : ""}`);
  if (!ok) failures++;
}

async function makeUser(): Promise<{ client: SupabaseClient; id: string; email: string; password: string }> {
  const admin = createClient(url, anon);
  const email = `kintsugi-m6-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.com`;
  const password = `Test!${Math.random().toString(36).slice(2)}Aa1`;
  const { data: su, error } = await admin.auth.signUp({ email, password });
  if (error) throw error;
  let session = su.session;
  if (!session) {
    const { data: si, error: e2 } = await admin.auth.signInWithPassword({ email, password });
    if (e2) throw new Error(`No session: ${e2.message}`);
    session = si.session;
  }
  const client = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${session!.access_token}` } },
  });
  await client.from("profiles").upsert({
    user_id: session!.user.id,
    biological_sex: "male",
    onboarding_completed: true,
  });
  return { client, id: session!.user.id, email, password };
}

async function main() {
  const a = await makeUser();
  const b = await makeUser();
  console.log(`[ok] user A=${a.id} user B=${b.id}`);

  const today = new Date().toISOString().slice(0, 10);
  const { data: ci, error: ciErr } = await a.client
    .from("checkins")
    .upsert({ user_id: a.id, checkin_date: today, energy: 7, mood: 6 }, { onConflict: "user_id,checkin_date" })
    .select("id")
    .single();
  if (ciErr) throw new Error(`A checkin insert failed: ${ciErr.message}`);
  const aCheckinId = ci.id as string;

  // 1. RLS read isolation: B cannot see A's check-ins.
  const { data: bSeesA } = await b.client.from("checkins").select("id").eq("id", aCheckinId);
  check("RLS: B cannot read A's check-in", (bSeesA ?? []).length === 0, `saw ${(bSeesA ?? []).length}`);

  // 2. RLS write isolation: B cannot delete A's row.
  await b.client.from("checkins").delete().eq("id", aCheckinId);
  const { data: stillThere } = await a.client.from("checkins").select("id").eq("id", aCheckinId);
  check("RLS: B cannot delete A's check-in", (stillThere ?? []).length === 1);

  // 3. RLS write isolation: B cannot insert a row owned by A.
  const { error: spoof } = await b.client
    .from("checkins")
    .insert({ user_id: a.id, checkin_date: "2020-01-01", energy: 1 });
  check("RLS: B cannot insert a row as A", !!spoof, spoof ? "blocked" : "NOT blocked");

  // 4. Export round-trip: A's export contains A's check-in and metadata.
  const bundle = await buildExport(a.client, a.id);
  const exportedCheckins = (bundle.tables["checkins"] as Array<{ id: string }>) ?? [];
  check("Export: contains A's check-in", exportedCheckins.some((r) => r.id === aCheckinId));
  check("Export: has format metadata", bundle._meta.format === "kintsugi-export/v1");
  check("Export: labels sensitive tables", bundle._meta.sensitiveTables.includes("checkins"));

  // 5. Delete round-trip: A's hard delete removes all rows + revokes auth.
  await hardDeleteAccount(a.client);
  const { data: afterDelete } = await a.client.from("checkins").select("id");
  check("Delete: A's rows are gone", (afterDelete ?? []).length === 0, `remaining ${(afterDelete ?? []).length}`);
  const reauth = createClient(url, anon);
  const { error: loginErr } = await reauth.auth.signInWithPassword({ email: a.email, password: a.password });
  check("Delete: A can no longer authenticate", !!loginErr, loginErr ? "auth revoked" : "STILL LOGS IN");

  // Cleanup B's throwaway data.
  await b.client.from("checkins").delete().eq("user_id", b.id);
  await b.client.from("profiles").delete().eq("user_id", b.id);

  console.log(`\n${failures === 0 ? "ALL M6 CHECKS PASSED" : `${failures} CHECK(S) FAILED`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("M6 VERIFY ERROR:", e.message ?? e);
  process.exit(1);
});
