import { createClient } from "@/lib/supabase/server";
import { EXPERIMENT_TEMPLATES } from "@/server/experiments/templates";
import { mapExperiment } from "@/server/experiments/service";
import { InvestigateClient } from "@/components/investigate/investigate-client";
import type { Insight } from "@/types";

export default async function InvestigatePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { count: checkinCount } = await supabase
    .from("checkins")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user!.id);

  const { data: insightRows } = await supabase
    .from("insights")
    .select("*")
    .eq("user_id", user!.id)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(50);

  const insights: Insight[] = (insightRows ?? []).map((r) => ({
    id: r.id,
    stage: r.stage,
    status: r.status,
    observation: r.observation,
    investigationQuestion: r.investigation_question ?? undefined,
    suggestedNextStep: r.suggested_next_step ?? { type: "observation" },
    sourceMetrics: r.source_metrics ?? [],
    sampleSize: r.sample_size ?? undefined,
    windowStart: r.window_start ?? undefined,
    windowEnd: r.window_end ?? undefined,
    confidenceLevel: r.confidence_level ?? undefined,
    coefficient: r.coefficient != null ? Number(r.coefficient) : undefined,
    isPositive: r.is_positive,
    createdAt: r.created_at,
  }));

  const { data: expRows } = await supabase
    .from("experiments")
    .select("*")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false });

  return (
    <InvestigateClient
      observations={checkinCount ?? 0}
      initialInsights={insights}
      initialExperiments={(expRows ?? []).map(mapExperiment)}
      templates={EXPERIMENT_TEMPLATES}
    />
  );
}
