import { NextResponse } from "next/server";
import { apiError, authed } from "@/server/http";
import { caseToMarkdown, type CaseContent } from "@/server/cases/build";

// GET /api/v1/cases/:id/export?format=md|json - download a case.
// (PDF is produced via the print view at /cases/:id/print -> browser "Save as PDF".)
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await authed();
  if (!user) return apiError("unauthenticated", "Sign in required.", 401);

  const format = new URL(req.url).searchParams.get("format") ?? "json";

  const { data: row } = await supabase
    .from("cases")
    .select("title, content")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!row) return apiError("not_found", "Case not found.", 404);

  const title = row.title as string;
  const content = row.content as CaseContent;
  const safeName = title.replace(/[^a-z0-9]+/gi, "-").toLowerCase().slice(0, 60) || "case";

  if (format === "md") {
    return new NextResponse(caseToMarkdown(title, content), {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${safeName}.md"`,
      },
    });
  }
  if (format === "json") {
    return new NextResponse(JSON.stringify({ title, content }, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${safeName}.json"`,
      },
    });
  }
  return apiError("validation_error", "format must be md or json.", 400);
}
