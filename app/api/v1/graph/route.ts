import { NextResponse } from "next/server";
import { apiError, authed } from "@/server/http";
import { getGraph, rebuildGraph } from "@/server/graph/build";

export async function GET() {
  const { supabase, user } = await authed();
  if (!user) return apiError("unauthenticated", "Sign in required.", 401);
  return NextResponse.json({ data: await getGraph(supabase, user.id) });
}

export async function POST() {
  const { supabase, user } = await authed();
  if (!user) return apiError("unauthenticated", "Sign in required.", 401);
  return NextResponse.json({ data: await rebuildGraph(supabase, user.id) });
}
