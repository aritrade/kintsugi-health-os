import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient as createSbClient } from "@supabase/supabase-js";
import { apiError, authed } from "@/server/http";
import { purgeUserStorage, hardDeleteAccount } from "@/server/account/delete";
import { isDemoEmail } from "@/lib/demo";

const DeleteSchema = z.object({
  password: z.string().min(1),
  confirm: z.literal("DELETE"),
});

// DELETE /api/v1/account - irreversible hard delete of all data + storage.
// Confirmed via re-auth (password) per docs/10 section 9.
export async function DELETE(req: Request) {
  const { supabase, user } = await authed();
  if (!user) return apiError("unauthenticated", "Sign in required.", 401);
  if (!user.email) return apiError("invalid_account", "Account has no email to verify.", 400);

  // The shared public demo account cannot be deleted (it is for everyone to explore).
  if (isDemoEmail(user.email)) {
    return apiError("demo_protected", "The demo account cannot be deleted.", 403);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError("bad_request", "Invalid JSON.", 400);
  }
  const parsed = DeleteSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("validation_error", "Password and confirmation are required.", 400);
  }

  // Re-authenticate with a throwaway client so we never touch the live session.
  const verifier = createSbClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const { error: reauthError } = await verifier.auth.signInWithPassword({
    email: user.email,
    password: parsed.data.password,
  });
  if (reauthError) return apiError("reauth_failed", "Password is incorrect.", 403);

  // Audit before deletion (the row itself cascades away, but the action is logged
  // best-effort for parity with the security spec).
  await supabase.from("audit_log").insert({
    user_id: user.id,
    action: "account.delete",
    entity: "account",
    metadata: {},
  });

  const filesRemoved = await purgeUserStorage(supabase, user.id);
  await hardDeleteAccount(supabase);
  await supabase.auth.signOut();

  return NextResponse.json({ data: { deleted: true, filesRemoved } });
}
