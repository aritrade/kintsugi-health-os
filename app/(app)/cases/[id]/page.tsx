import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CaseDetailClient } from "@/components/cases/case-detail-client";
import type { CaseContent } from "@/server/cases/build";

export default async function CaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: row } = await supabase
    .from("cases")
    .select("id, title, content")
    .eq("id", id)
    .eq("user_id", user!.id)
    .maybeSingle();
  if (!row) notFound();

  return <CaseDetailClient id={row.id} title={row.title} content={row.content as CaseContent} />;
}
