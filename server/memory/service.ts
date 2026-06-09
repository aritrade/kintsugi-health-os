import type { SupabaseClient } from "@supabase/supabase-js";

export interface MemoryNote {
  id: string;
  title: string | null;
  body: string;
  noteType: string;
  sensitivity: string;
  aiSummary: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export function mapNote(r: Record<string, unknown>): MemoryNote {
  const noteTags = (r.note_tags as Array<{ tags: { name: string } | null }> | undefined) ?? [];
  return {
    id: r.id as string,
    title: (r.title as string) ?? null,
    body: r.body as string,
    noteType: (r.note_type as string) ?? "note",
    sensitivity: r.sensitivity as string,
    aiSummary: (r.ai_summary as string) ?? null,
    tags: noteTags.map((nt) => nt.tags?.name).filter(Boolean) as string[],
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  };
}

// Upserts tags by name for a user and returns their ids.
export async function resolveTagIds(
  supabase: SupabaseClient,
  userId: string,
  names: string[],
): Promise<string[]> {
  const clean = Array.from(new Set(names.map((n) => n.trim().toLowerCase()).filter(Boolean)));
  if (clean.length === 0) return [];
  const { error: upErr } = await supabase
    .from("tags")
    .upsert(clean.map((name) => ({ user_id: userId, name })), { onConflict: "user_id,name" });
  if (upErr) throw upErr;
  const { data, error } = await supabase
    .from("tags")
    .select("id, name")
    .eq("user_id", userId)
    .in("name", clean);
  if (error) throw error;
  return (data ?? []).map((t) => t.id as string);
}

// Replaces a note's tag links with the given tag ids.
export async function setNoteTags(
  supabase: SupabaseClient,
  noteId: string,
  tagIds: string[],
): Promise<void> {
  await supabase.from("note_tags").delete().eq("note_id", noteId);
  if (tagIds.length > 0) {
    const { error } = await supabase
      .from("note_tags")
      .insert(tagIds.map((tagId) => ({ note_id: noteId, tag_id: tagId })));
    if (error) throw error;
  }
}

export const NOTE_SELECT = "*, note_tags(tags(name))";
