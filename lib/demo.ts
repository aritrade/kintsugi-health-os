// Public demo account. These credentials are intentionally shared so any visitor
// can explore the product with realistic pre-seeded data. The account is guarded
// against destructive actions (see app/api/v1/account/route.ts).
export const DEMO_EMAIL = "demo@kintsugi.health";
export const DEMO_PASSWORD = "ShowMe2026!Demo";

export function isDemoEmail(email: string | null | undefined): boolean {
  return (email ?? "").toLowerCase() === DEMO_EMAIL;
}
