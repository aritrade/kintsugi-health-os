"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download, ShieldAlert } from "lucide-react";

export function DataOwnership({ isDemo = false }: { isDemo?: boolean }) {
  const [confirming, setConfirming] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function deleteAccount() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, confirm: confirmText }),
      });
      if (res.ok) {
        window.location.href = "/login";
      } else {
        const j = await res.json().catch(() => null);
        setError(j?.error?.message ?? "Could not delete account.");
      }
    } catch {
      setError("Network error.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Your data</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            You own your data. Export a complete machine-readable copy at any time, including links to
            your uploaded files.
          </p>
          <a href="/api/v1/account/export">
            <Button size="sm" variant="outline">
              <Download className="h-4 w-4" /> Export all my data (JSON)
            </Button>
          </a>
        </CardContent>
      </Card>

      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <ShieldAlert className="h-5 w-5" /> Danger zone
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            Permanently delete your account and all associated data, including files. This cannot be
            undone.
          </p>

          {isDemo ? (
            <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-muted-foreground dark:bg-red-950/30">
              This is the shared demo account, so deletion is disabled. Create your own account to try
              the full data-ownership controls.
            </p>
          ) : !confirming ? (
            <Button size="sm" variant="destructive" onClick={() => setConfirming(true)}>
              Delete my account
            </Button>
          ) : (
            <div className="space-y-3 rounded-md border border-red-200 p-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Confirm your password</label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  autoComplete="current-password"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">
                  Type <span className="font-mono">DELETE</span> to confirm
                </label>
                <Input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="DELETE" />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={deleteAccount}
                  disabled={busy || confirmText !== "DELETE" || password.length === 0}
                >
                  {busy ? "Deleting..." : "Permanently delete"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setConfirming(false);
                    setError(null);
                    setPassword("");
                    setConfirmText("");
                  }}
                  disabled={busy}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
