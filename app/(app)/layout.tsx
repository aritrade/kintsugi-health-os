import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BottomNav } from "@/components/bottom-nav";
import { SideNav } from "@/components/side-nav";
import { ThemeToggle } from "@/components/theme-toggle";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Require completed onboarding before entering the app.
  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!profile?.onboarding_completed) redirect("/onboarding");

  return (
    <div className="min-h-screen">
      <SideNav />
      <div className="md:pl-60">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b bg-background/80 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 print:hidden">
          <Link href="/dashboard" className="font-semibold tracking-tight md:hidden">
            Kintsugi
          </Link>
          <span className="hidden text-sm text-muted-foreground md:block">
            Investigation, not diagnosis.
          </span>
          <ThemeToggle />
        </header>
        <div className="mx-auto w-full max-w-3xl pb-24 md:pb-10">{children}</div>
      </div>
      <BottomNav />
    </div>
  );
}
