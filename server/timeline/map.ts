import type { TimelineEvent } from "@/types";

// Maps a timeline_events DB row to the canonical TimelineEvent type.
export function mapTimelineRow(r: Record<string, unknown>): TimelineEvent {
  return {
    id: r.id as string,
    userId: r.user_id as string,
    lifeStage: r.life_stage as TimelineEvent["lifeStage"],
    title: r.title as string,
    description: (r.description as string) ?? undefined,
    category: r.category as TimelineEvent["category"],
    subcategory: r.subcategory as string,
    eventDate: (r.event_date as string) ?? undefined,
    approxPeriod: (r.approx_period as string) ?? undefined,
    confidence: Number(r.confidence ?? 1),
    sensitivity: r.sensitivity as TimelineEvent["sensitivity"],
    source: r.source as TimelineEvent["source"],
    metadata: (r.metadata as Record<string, unknown>) ?? {},
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  };
}
