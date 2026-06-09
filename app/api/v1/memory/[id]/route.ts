import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { NOTE_SELECT, mapNote, resolveTagIds, setNoteTags } from "@/server/memory/service";

function err(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

const PatchSchema = z.object({
  title: z.string().trim().max(200).nullable().optional(),
  body: z.string().trim().min(1).max(20000).optional(),
  noteType: z.string().trim().max(40).optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return err("unauthenticated", "Sign in required.", 401);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return err("bad_request", "Invalid JSON.", 400);
  }
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) return err("validation_error", parsed.error.issues[0]?.message ?? "Invalid input.", 422);

  const i = parsed.data;
  const patch: Record<string, unknown> = {};
  if (i.title !== undefined) patch.title = i.title;
  if (i.body !== undefined) patch.body = i.body;
  if (i.noteType !== undefined) patch.note_type = i.noteType;

  if (Object.keys(patch).length > 0) {
    const { data, error } = await supabase
      .from("memory_notes")
      .update(patch)
      .eq("id", id)
      .eq("user_id", user.id)
      .select("id")
      .maybeSingle();
    if (error) return err("db_error", error.message, 500);
    if (!data) return err("not_found", "Note not found.", 404);
  }

  try {
    if (i.tags !== undefined) {
      const tagIds = await resolveTagIds(supabase, user.id, i.tags);
      await setNoteTags(supabase, id, tagIds);
    }
  } catch (e) {
    return err("db_error", (e as Error).message, 500);
  }

  const { data: full } = await supabase
    .from("memory_notes")
    .select(NOTE_SELECT)
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!full) return err("not_found", "Note not found.", 404);
  return NextResponse.json({ data: { note: mapNote(full) } });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return err("unauthenticated", "Sign in required.", 401);

  const { error } = await supabase
    .from("memory_notes")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return err("db_error", error.message, 500);
  return NextResponse.json({ data: { deleted: true } });
}
