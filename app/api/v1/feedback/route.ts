import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, authed } from "@/server/http";

const Schema = z.object({
  category: z.enum(["bug", "idea", "praise", "other"]),
  message: z.string().min(3).max(2000),
});

export async function POST(req: Request) {
  const { supabase, user } = await authed();
  if (!user) return apiError("unauthenticated", "Sign in required.", 401);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError("bad_request", "Invalid JSON.", 400);
  }
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return apiError("validation_error", "category and message required.", 400);

  const { error } = await supabase.from("feedback").insert({
    user_id: user.id,
    category: parsed.data.category,
    message: parsed.data.message,
  });
  if (error) return apiError("server_error", "Could not save feedback.", 500);

  return NextResponse.json({ data: { received: true } }, { status: 201 });
}
