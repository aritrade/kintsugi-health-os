import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CaseView } from "@/components/cases/case-view";
import { PrintButton } from "@/components/cases/print-button";
import type { CaseContent } from "@/server/cases/build";

export default async function CasePrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: row } = await supabase
    .from("cases")
    .select("title, content")
    .eq("id", id)
    .eq("user_id", user!.id)
    .maybeSingle();
  if (!row) notFound();

  return (
    <main className="space-y-4 p-6 print:p-0">
      <div className="print:hidden">
        <PrintButton />
      </div>
      <CaseView title={row.title as string} content={row.content as CaseContent} />
    </main>
  );
}
