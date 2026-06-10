import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Offline · Kintsugi Health OS",
};

export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-sm font-medium uppercase tracking-widest text-primary">
        Kintsugi Health OS
      </p>
      <h1 className="text-2xl font-semibold tracking-tight">You&rsquo;re offline</h1>
      <p className="text-muted-foreground">
        Kintsugi needs a connection to load your health data securely. Reconnect and try
        again - nothing is lost.
      </p>
      <p className="text-sm text-muted-foreground">
        Your data is never cached on this device while offline, by design.
      </p>
    </main>
  );
}
