"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const CATEGORIES = [
  { id: "idea", label: "Idea" },
  { id: "bug", label: "Bug" },
  { id: "praise", label: "Praise" },
  { id: "other", label: "Other" },
];

export function FeedbackCard() {
  const [category, setCategory] = useState("idea");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function submit() {
    if (message.trim().length < 3) return;
    setBusy(true);
    const res = await fetch("/api/v1/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category, message }),
    });
    setBusy(false);
    if (res.ok) {
      setDone(true);
      setMessage("");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Send feedback</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {done ? (
          <p className="text-muted-foreground">
            Thank you - your feedback was received.{" "}
            <button className="underline" onClick={() => setDone(false)}>
              Send more
            </button>
          </p>
        ) : (
          <>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setCategory(c.id)}
                  className={`rounded-full border px-2.5 py-1 text-xs ${
                    category === c.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
            <textarea
              className="h-24 w-full rounded-md border bg-background p-2 text-sm"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="What's working, what's missing, what would help?"
            />
            <Button size="sm" onClick={submit} disabled={busy || message.trim().length < 3}>
              {busy ? "Sending..." : "Submit"}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
