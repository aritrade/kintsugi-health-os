"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Search } from "lucide-react";
import type { MemoryNote } from "@/server/memory/service";

export function MemoryClient() {
  const [notes, setNotes] = useState<MemoryNote[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [activeTag, setActiveTag] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (query) params.set("query", query);
    if (activeTag) params.set("tag", activeTag);
    const res = await fetch(`/api/v1/memory?${params.toString()}`);
    const json = await res.json();
    setNotes(json?.data?.notes ?? []);
    setTags(json?.data?.tags ?? []);
    setLoading(false);
  }, [query, activeTag]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  async function remove(id: string) {
    await fetch(`/api/v1/memory/${id}`, { method: "DELETE" });
    setNotes((n) => n.filter((x) => x.id !== id));
  }

  return (
    <main className="space-y-5 p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Memory</h1>
        <Button size="sm" onClick={() => setAdding((a) => !a)}>
          <Plus className="h-4 w-4" /> Note
        </Button>
      </header>

      {adding && (
        <NoteForm
          onCancel={() => setAdding(false)}
          onCreated={() => {
            setAdding(false);
            load();
          }}
        />
      )}

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search notes"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <Chip label="All" active={activeTag === ""} onClick={() => setActiveTag("")} />
          {tags.map((t) => (
            <Chip key={t} label={`#${t}`} active={activeTag === t} onClick={() => setActiveTag(t)} />
          ))}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : notes.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No notes yet. Capture questions for your doctor, observations, and appointment notes here.
        </p>
      ) : (
        <div className="space-y-2">
          {notes.map((n) => (
            <Card key={n.id}>
              <CardContent className="flex items-start justify-between gap-3 py-3">
                <div className="min-w-0">
                  {n.title && <p className="font-medium">{n.title}</p>}
                  <p className="whitespace-pre-wrap text-sm text-muted-foreground">{n.body}</p>
                  {n.tags.length > 0 && (
                    <p className="mt-1 text-xs text-primary">{n.tags.map((t) => `#${t}`).join(" ")}</p>
                  )}
                </div>
                <button
                  onClick={() => remove(n.id)}
                  className="text-muted-foreground hover:text-red-600"
                  aria-label="Delete note"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs transition-colors ${
        active ? "border-primary bg-primary text-primary-foreground" : "border-input hover:bg-muted"
      }`}
    >
      {label}
    </button>
  );
}

function NoteForm({ onCancel, onCreated }: { onCancel: () => void; onCreated: () => void }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tags, setTags] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!body.trim()) {
      setError("Write something first.");
      return;
    }
    setSaving(true);
    setError(null);
    const res = await fetch("/api/v1/memory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title || undefined,
        body,
        tags: tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const j = await res.json().catch(() => null);
      setError(j?.error?.message ?? "Could not save.");
      return;
    }
    onCreated();
  }

  return (
    <Card>
      <CardContent className="space-y-3 py-4">
        <Input placeholder="Title (optional)" value={title} onChange={(e) => setTitle(e.target.value)} />
        <textarea
          className="min-h-24 w-full rounded-md border border-input bg-card px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          placeholder="Your note..."
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <Input
          placeholder="Tags, comma separated (e.g. doctor, sleep)"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onCancel}>
            Cancel
          </Button>
          <Button className="flex-1" onClick={submit} disabled={saving}>
            {saving ? "Saving..." : "Save note"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
