import { createClient } from "@/lib/supabase/server";
import { ReportsClient } from "@/components/reports/reports-client";

export default async function ReportsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { count } = await supabase
    .from("checkins")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user!.id);

  const { data: reports } = await supabase
    .from("reports")
    .select("id, period, period_start, period_end, content, created_at")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false })
    .limit(20);

  return <ReportsClient observations={count ?? 0} initialReports={(reports ?? []) as never} />;
}
