import { createClient } from "@/lib/supabase/server";
import { TimelineClient } from "@/components/timeline/timeline-client";
import type { PrivacyMode } from "@/types";

export default async function TimelinePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("privacy_mode")
    .eq("user_id", user!.id)
    .maybeSingle();
  const privacyMode = (profile?.privacy_mode ?? "standard") as PrivacyMode;
  return <TimelineClient privacyMode={privacyMode} />;
}
