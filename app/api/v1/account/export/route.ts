import { NextResponse } from "next/server";
import { apiError, authed } from "@/server/http";
import { buildExport } from "@/server/account/export";

// GET /api/v1/account/export - synchronous full export download.
// (The async job variant in docs/07 is collapsed to a direct download for the
// single-user MVP; the data contract is identical.)
export async function GET() {
  const { supabase, user } = await authed();
  if (!user) return apiError("unauthenticated", "Sign in required.", 401);

  const bundle = await buildExport(supabase, user.id);

  await supabase.from("audit_log").insert({
    user_id: user.id,
    action: "account.export",
    entity: "account",
    metadata: { tables: Object.keys(bundle.tables).length, files: bundle.files.length },
  });

  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(JSON.stringify(bundle, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="kintsugi-export-${stamp}.json"`,
    },
  });
}
