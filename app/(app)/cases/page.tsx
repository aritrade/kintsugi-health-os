import { createClient } from "@/lib/supabase/server";
import { CasesClient } from "@/components/cases/cases-client";

export default async function CasesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: cases } = await supabase
    .from("cases")
    .select("id, title, specialist, created_at")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false });

  return <CasesClient initialCases={(cases ?? []) as never} />;
}
