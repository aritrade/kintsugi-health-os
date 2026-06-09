import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

export default function LandingPage() {
  return (
    <main className="relative mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-8 px-6 text-center">
      <ThemeToggle className="absolute right-4 top-4 bg-card" />
      <div className="space-y-4">
        <p className="text-sm font-medium uppercase tracking-widest text-primary">
          Kintsugi Health OS
        </p>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Become the investigator of your own health.
        </h1>
        <p className="text-lg text-muted-foreground">
          A private place to observe, organize, and understand your health over time - so
          your next conversation with a doctor is your best one.
        </p>
        <p className="text-sm text-muted-foreground">
          Investigation, not diagnosis. We never diagnose, prescribe, or replace your clinician.
        </p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Link href="/signup">
          <Button size="lg">Get started</Button>
        </Link>
        <Link href="/login">
          <Button size="lg" variant="outline">
            Sign in
          </Button>
        </Link>
      </div>
    </main>
  );
}
