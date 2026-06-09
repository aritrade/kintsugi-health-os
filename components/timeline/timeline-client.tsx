"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Lock, Search } from "lucide-react";
import {
  CATEGORY_LABELS,
  LIFE_STAGES,
  LIFE_STAGE_LABELS,
  TIMELINE_TAXONOMY,
} from "@/lib/timeline-taxonomy";
import type { PrivacyMode, TimelineCategory, TimelineEvent } from "@/types";

export function TimelineClient({ privacyMode }: { privacyMode: PrivacyMode }) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<string>("");
  const [unlocked, setUnlocked] = useState(privacyMode !== "extra_protected");
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (category) params.set("category", category);
    if (unlocked) params.set("unlocked", "1");
    const res = await fetch(`/api/v1/timeline?${params.toString()}`);
    const json = await res.json();
    setEvents(json?.data?.events ?? []);
    setLoading(false);
  }, [q, category, unlocked]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  async function remove(id: string) {
    await fetch(`/api/v1/timeline/${id}`, { method: "DELETE" });
    setEvents((e) => e.filter((ev) => ev.id !== id));
  }

  const grouped = LIFE_STAGES.map((stage) => ({
    stage,
    items: events.filter((e) => e.lifeStage === stage),
  })).filter((g) => g.items.length > 0);

  return (
    <main className="space-y-5 p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Timeline</h1>
        <Button size="sm" onClick={() => setAdding((a) => !a)}>
          <Plus className="h-4 w-4" /> Event
        </Button>
      </header>

      {adding && (
        <AddEventForm
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
          placeholder="Search your history"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <FilterChip label="All" active={category === ""} onClick={() => setCategory("")} />
        {TIMELINE_TAXONOMY.map((c) => (
          <FilterChip
            key={c.category}
            label={c.label}
            active={category === c.category}
            onClick={() => setCategory(c.category)}
          />
        ))}
      </div>

      {privacyMode === "extra_protected" && !unlocked && (
        <button
          onClick={() => setUnlocked(true)}
          className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed py-2 text-sm text-muted-foreground"
        >
          <Lock className="h-4 w-4" /> Sensitive events hidden - tap to unlock
        </button>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : grouped.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No events yet. Add milestones, symptoms, and life events to reconstruct your story.
        </p>
      ) : (
        <div className="space-y-6">
          {grouped.map(({ stage, items }) => (
            <section key={stage} className="space-y-2">
              <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                {LIFE_STAGE_LABELS[stage]}
              </h2>
              <div className="space-y-2">
                {items.map((ev) => (
                  <Card key={ev.id}>
                    <CardContent className="flex items-start justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <p className="font-medium">{ev.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {CATEGORY_LABELS[ev.category]} · {ev.subcategory}
                          {ev.eventDate ? ` · ${ev.eventDate}` : ev.approxPeriod ? ` · ${ev.approxPeriod}` : ""}
                        </p>
                        {ev.description && <p className="mt-1 text-sm text-muted-foreground">{ev.description}</p>}
                      </div>
                      <button
                        onClick={() => remove(ev.id)}
                        className="text-muted-foreground hover:text-red-600"
                        aria-label="Delete event"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
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

function AddEventForm({ onCancel, onCreated }: { onCancel: () => void; onCreated: () => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<TimelineCategory>("health");
  const [subcategory, setSubcategory] = useState(TIMELINE_TAXONOMY[0].subcategories[0]);
  const [lifeStage, setLifeStage] = useState<(typeof LIFE_STAGES)[number]>("adult");
  const [eventDate, setEventDate] = useState("");
  const [approxPeriod, setApproxPeriod] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subcategories = TIMELINE_TAXONOMY.find((c) => c.category === category)!.subcategories;

  async function submit() {
    if (!title.trim()) {
      setError("Give the event a title.");
      return;
    }
    setSaving(true);
    setError(null);
    const res = await fetch("/api/v1/timeline", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description: description || undefined,
        category,
        subcategory,
        lifeStage,
        eventDate: eventDate || null,
        approxPeriod: approxPeriod || null,
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
        <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Input placeholder="Details (optional)" value={description} onChange={(e) => setDescription(e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <select
            className="h-11 rounded-md border border-input bg-card px-2 text-sm"
            value={category}
            onChange={(e) => {
              const c = e.target.value as TimelineCategory;
              setCategory(c);
              setSubcategory(TIMELINE_TAXONOMY.find((x) => x.category === c)!.subcategories[0]);
            }}
          >
            {TIMELINE_TAXONOMY.map((c) => (
              <option key={c.category} value={c.category}>
                {c.label}
              </option>
            ))}
          </select>
          <select
            className="h-11 rounded-md border border-input bg-card px-2 text-sm"
            value={subcategory}
            onChange={(e) => setSubcategory(e.target.value)}
          >
            {subcategories.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <select
            className="h-11 rounded-md border border-input bg-card px-2 text-sm"
            value={lifeStage}
            onChange={(e) => setLifeStage(e.target.value as (typeof LIFE_STAGES)[number])}
          >
            {LIFE_STAGES.map((s) => (
              <option key={s} value={s}>
                {LIFE_STAGE_LABELS[s]}
              </option>
            ))}
          </select>
          <Input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
        </div>
        <Input
          placeholder='Approx period (e.g. "age 13") - if no exact date'
          value={approxPeriod}
          onChange={(e) => setApproxPeriod(e.target.value)}
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onCancel}>
            Cancel
          </Button>
          <Button className="flex-1" onClick={submit} disabled={saving}>
            {saving ? "Saving..." : "Add event"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
