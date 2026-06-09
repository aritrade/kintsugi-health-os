/**
 * Authenticated end-to-end smoke test for M5 (Momentum / Reports / Cases).
 * Creates a throwaway user via anon signup, seeds check-ins under RLS, then runs
 * the real engine code paths and prints results. Run: npx tsx scripts/e2e-m5.ts
 */
import { existsSync, readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { computeMomentum } from "@/server/momentum/engine";
import { buildWeeklyReport } from "@/server/reports/weekly";
import { buildCaseContent, caseToMarkdown } from "@/server/cases/build";

// Loads Supabase URL/anon key from the first available env file. Override with
// E2E_ENV_FILE (e.g. a `vercel env pull` output).
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

async function main() {
  const admin = createClient(url, anon);
  const email = `kintsugi-e2e-${Date.now()}@example.com`;
  const password = `Test!${Math.random().toString(36).slice(2)}Aa1`;

  const { data: signUp, error: suErr } = await admin.auth.signUp({ email, password });
  if (suErr) throw suErr;
  let session = signUp.session;
  if (!session) {
    const { data: si, error: siErr } = await admin.auth.signInWithPassword({ email, password });
    if (siErr) throw new Error(`No session after signup (email confirmation likely ON): ${siErr.message}`);
    session = si.session;
  }
  if (!session) throw new Error("Could not obtain a session.");
  const userId = session.user.id;
  console.log(`[ok] authenticated as ${email} (${userId})`);

  // RLS-scoped client acting as the user.
  const sb = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${session.access_token}` } },
  });

  // Profile (onboarding).
  await sb.from("profiles").upsert({
    user_id: userId,
    biological_sex: "male",
    date_of_birth: "1990-05-01",
    display_name: "E2E Tester",
    onboarding_completed: true,
  });

  // Seed 10 days of check-ins (improving confidence, decreasing anxiety).
  const today = new Date();
  for (let i = 9; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 86400000).toISOString().slice(0, 10);
    await sb.from("checkins").upsert(
      {
        user_id: userId,
        checkin_date: d,
        confidence: Math.min(10, Math.round(4 + (9 - i) * 0.5)),
        anxiety: Math.max(1, Math.round(7 - (9 - i) * 0.5)),
        energy: 6,
        mood: 6,
      },
      { onConflict: "user_id,checkin_date" },
    );
  }
  console.log("[ok] seeded 10 check-ins");

  const momentum = await computeMomentum(sb, userId);
  console.log("[ok] momentum:", JSON.stringify(momentum.components), "score=", momentum.score);

  const report = await buildWeeklyReport(sb, userId);
  console.log(
    "[ok] weekly report:",
    `checkins ${report.checkins.days}/7,`,
    `trends=${report.indexTrends.length},`,
    `findings=${report.findings.length},`,
    `momentumScore=${report.momentum.score}`,
  );

  const caseContent = await buildCaseContent(sb, userId, "GP");
  const md = caseToMarkdown("E2E Sleep & Energy Review", caseContent);
  console.log("[ok] case built. labs=", caseContent.labs.length, "indices=", caseContent.indices.length);
  console.log("----- CASE MARKDOWN (head) -----");
  console.log(md.split("\n").slice(0, 14).join("\n"));
  console.log("--------------------------------");

  // Persist a case + report to confirm RLS inserts work.
  const { error: caseErr } = await sb.from("cases").insert({
    user_id: userId,
    title: "E2E Sleep & Energy Review",
    specialist: "GP",
    content: caseContent,
  });
  if (caseErr) throw new Error(`case insert failed: ${caseErr.message}`);
  const { error: repErr } = await sb.from("reports").insert({
    user_id: userId,
    period: "weekly",
    period_start: report.periodStart,
    period_end: report.periodEnd,
    content: report,
  });
  if (repErr) throw new Error(`report insert failed: ${repErr.message}`);
  console.log("[ok] persisted case + report under RLS");

  // Cleanup (auth user remains; data is RLS-scoped throwaway).
  await sb.from("cases").delete().eq("user_id", userId);
  await sb.from("reports").delete().eq("user_id", userId);
  await sb.from("checkins").delete().eq("user_id", userId);
  await sb.from("derived_indices").delete().eq("user_id", userId);
  await sb.from("momentum_events").delete().eq("user_id", userId);
  console.log("[ok] cleaned up test data");
  console.log("\nALL M5 E2E CHECKS PASSED");
}

main().catch((e) => {
  console.error("E2E FAILED:", e.message ?? e);
  process.exit(1);
});
