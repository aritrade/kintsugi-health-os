import { createClient } from "@/lib/supabase/server";
import { getGraph } from "@/server/graph/build";
import { GraphClient } from "@/components/graph/graph-client";

export default async function GraphPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const graph = await getGraph(supabase, user!.id);
  return <GraphClient initial={graph} />;
}
