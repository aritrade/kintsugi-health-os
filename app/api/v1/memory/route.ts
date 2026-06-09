import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { NOTE_SELECT, mapNote, resolveTagIds, setNoteTags } from "@/server/memory/service";

function err(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

const CreateSchema = z.object({
  title: z.string().trim().max(200).optional(),
  body: z.string().trim().min(1).max(20000),
  noteType: z.string().trim().max(40).optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
});

export async function GET(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return err("unauthenticated", "Sign in required.", 401);

  const url = new URL(req.url);
  const query = url.searchParams.get("query");
  const tag = url.searchParams.get("tag");
  const type = url.searchParams.get("type");

  let q = supabase
    .from("memory_notes")
    .select(NOTE_SELECT)
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (query) q = q.or(`title.ilike.%${query}%,body.ilike.%${query}%`);
  if (type) q = q.eq("note_type", type);

  const { data, error } = await q;
  if (error) return err("db_error", error.message, 500);

  let notes = (data ?? []).map(mapNote);
  if (tag) notes = notes.filter((n) => n.tags.includes(tag.toLowerCase()));

  // Collect the user's tag vocabulary for filter chips.
  const { data: allTags } = await supabase
    .from("tags")
    .select("name")
    .eq("user_id", user.id)
    .order("name");

  return NextResponse.json({
    data: { notes, tags: (allTags ?? []).map((t) => t.name as string) },
  });
}

export async function POST(req: Request) {
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
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) return err("validation_error", parsed.error.issues[0]?.message ?? "Invalid input.", 422);

  const input = parsed.data;
  const { data: note, error } = await supabase
    .from("memory_notes")
    .insert({
      user_id: user.id,
      title: input.title ?? null,
      body: input.body,
      note_type: input.noteType ?? "note",
    })
    .select("id")
    .single();
  if (error) return err("db_error", error.message, 500);

  try {
    if (input.tags && input.tags.length > 0) {
      const tagIds = await resolveTagIds(supabase, user.id, input.tags);
      await setNoteTags(supabase, note.id, tagIds);
    }
  } catch (e) {
    return err("db_error", (e as Error).message, 500);
  }

  const { data: full } = await supabase
    .from("memory_notes")
    .select(NOTE_SELECT)
    .eq("id", note.id)
    .single();

  return NextResponse.json({ data: { note: mapNote(full!) } }, { status: 201 });
}
