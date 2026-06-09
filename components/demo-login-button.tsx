"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { PlayCircle } from "lucide-react";
import { DEMO_EMAIL, DEMO_PASSWORD } from "@/lib/demo";

export function DemoLoginButton({ className }: { className?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function enterDemo() {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email: DEMO_EMAIL, password: DEMO_PASSWORD });
    if (error) {
      setLoading(false);
      setError("Demo is warming up - please try again in a moment.");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className={className}>
      <Button size="lg" className="w-full" onClick={enterDemo} disabled={loading}>
        <PlayCircle className="h-5 w-5" />
        {loading ? "Entering demo..." : "Explore the live demo"}
      </Button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
