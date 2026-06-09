import { createClient } from "@/lib/supabase/server";
import { getMarketplace } from "@/server/packs/marketplace";
import { MarketplaceClient } from "@/components/packs/marketplace-client";

export default async function ExplorePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("biological_sex")
    .eq("user_id", user!.id)
    .maybeSingle();
  const biologicalSex = (profile?.biological_sex as "male" | "female" | "intersex") ?? "male";

  const entries = await getMarketplace(supabase, { userId: user!.id, biologicalSex });
  return <MarketplaceClient entries={entries} />;
}
