import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Shared helpers for route handlers: consistent error envelope + auth context.
export function apiError(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export async function authed() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}
