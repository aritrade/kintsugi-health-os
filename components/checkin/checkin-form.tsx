"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScaleInput } from "@/components/checkin/scale-input";
import { ToggleChip } from "@/components/checkin/toggle-chip";
import { Lock, Unlock } from "lucide-react";
import type { PrivacyMode } from "@/types";
import type { ActivePackMetrics, CheckinCore, PackMetricValue } from "@/types/checkin";

type PackVal = { valueNum?: number | null; valueBool?: boolean | null };

export function CheckinForm({
  date,
  prettyDate,
  privacyMode,
  activePacks,
  initialCore,
  initialPackValues,
}: {
  date: string;
  prettyDate: string;
  privacyMode: PrivacyMode;
  activePacks: ActivePackMetrics[];
  initialCore: CheckinCore;
  initialPackValues: Record<string, PackVal>;
}) {
  const router = useRouter();
  const [core, setCore] = useState<CheckinCore>(initialCore);
  const [packValues, setPackValues] = useState<Record<string, PackVal>>(initialPackValues);
  const [unlocked, setUnlocked] = useState(privacyMode !== "extra_protected");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  function setNum<K extends keyof CheckinCore>(key: K, v: number | null) {
    setCore((c) => ({ ...c, [key]: v }));
  }
  function setBool<K extends keyof CheckinCore>(key: K, v: boolean | null) {
    setCore((c) => ({ ...c, [key]: v }));
  }
  function setPack(metricId: string, val: PackVal) {
    setPackValues((p) => ({ ...p, [metricId]: { ...p[metricId], ...val } }));
  }

  const numField = (key: keyof CheckinCore, label: string, suffix?: string) => (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">{label}</label>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          inputMode="numeric"
          value={(core[key] as number | null | undefined) ?? ""}
          onChange={(e) => setNum(key, e.target.value === "" ? null : Number(e.target.value))}
        />
        {suffix && <span className="text-sm text-muted-foreground">{suffix}</span>}
      </div>
    </div>
  );

  async function save(complete: boolean) {
    setStatus("saving");
    setError(null);

    // In local-only mode, do not transmit highly-sensitive pack metrics.
    const sensitiveMetricIds = new Set(
      activePacks
        .filter((p) => p.containsSensitive)
        .flatMap((p) => p.metrics)
        .filter((m) => m.sensitivity === "highly_sensitive")
        .map((m) => m.metricId),
    );

    const packMetrics: PackMetricValue[] = Object.entries(packValues)
      .filter(([id]) => !(privacyMode === "local_only" && sensitiveMetricIds.has(id)))
      .map(([metricId, v]) => ({ metricId, valueNum: v.valueNum ?? null, valueBool: v.valueBool ?? null }))
      .filter((m) => m.valueNum != null || m.valueBool != null);

    const res = await fetch(`/api/v1/checkins/${date}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...core, isComplete: complete, packMetrics }),
    });

    if (!res.ok) {
      const j = await res.json().catch(() => null);
      setStatus("error");
      setError(j?.error?.message ?? "Could not save.");
      return;
    }
    setStatus("saved");
    if (complete) {
      router.push("/dashboard");
      router.refresh();
    }
  }

  return (
    <main className="space-y-5 p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Daily Check-in</h1>
        <p className="text-sm text-muted-foreground">{prettyDate}</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sleep</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Bedtime</label>
              <Input
                type="time"
                value={core.bedtime ?? ""}
                onChange={(e) => setCore((c) => ({ ...c, bedtime: e.target.value || null }))}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Wake</label>
              <Input
                type="time"
                value={core.wakeTime ?? ""}
                onChange={(e) => setCore((c) => ({ ...c, wakeTime: e.target.value || null }))}
              />
            </div>
          </div>
          <ScaleInput label="Sleep quality" value={core.sleepQuality ?? null} onChange={(v) => setNum("sleepQuality", v)} />
          <div className="grid grid-cols-2 gap-3">
            <ToggleChip label="Dry mouth" value={core.dryMouth ?? null} onChange={(v) => setBool("dryMouth", v)} />
            <ToggleChip label="Snoring" value={core.snoring ?? null} onChange={(v) => setBool("snoring", v)} />
          </div>
          {numField("nightAwakenings", "Night awakenings")}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Physical</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ScaleInput label="Energy" value={core.energy ?? null} onChange={(v) => setNum("energy", v)} />
          <ScaleInput label="Fatigue" value={core.fatigue ?? null} onChange={(v) => setNum("fatigue", v)} />
          <ScaleInput label="Recovery" value={core.recovery ?? null} onChange={(v) => setNum("recovery", v)} />
          <ScaleInput label="Pain" value={core.pain ?? null} onChange={(v) => setNum("pain", v)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Mental</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ScaleInput label="Mood" value={core.mood ?? null} onChange={(v) => setNum("mood", v)} />
          <ScaleInput label="Anxiety" value={core.anxiety ?? null} onChange={(v) => setNum("anxiety", v)} />
          <ScaleInput label="Stress" value={core.stress ?? null} onChange={(v) => setNum("stress", v)} />
          <ScaleInput label="Confidence" value={core.confidence ?? null} onChange={(v) => setNum("confidence", v)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lifestyle</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <ToggleChip label="Ran" value={core.ran ?? null} onChange={(v) => setBool("ran", v)} />
            <ToggleChip label="Lifted" value={core.strengthTrained ?? null} onChange={(v) => setBool("strengthTrained", v)} />
            <ToggleChip label="Walked" value={core.walked ?? null} onChange={(v) => setBool("walked", v)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {numField("steps", "Steps")}
            {numField("waterMl", "Water", "ml")}
            {numField("alcoholUnits", "Alcohol", "units")}
            {numField("caffeineMg", "Caffeine", "mg")}
          </div>
          <ToggleChip label="Nicotine" value={core.nicotine ?? null} onChange={(v) => setBool("nicotine", v)} />
        </CardContent>
      </Card>

      {activePacks.map((pack) => {
        const locked = pack.containsSensitive && !unlocked;
        return (
          <Card key={pack.packSlug}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                {pack.packName}
                {pack.containsSensitive && (
                  <span className="inline-flex items-center gap-1 text-xs font-normal text-muted-foreground">
                    {unlocked ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                    private
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {locked ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    This section contains sensitive data and is hidden in extra-protected mode.
                  </p>
                  <Button variant="outline" size="sm" onClick={() => setUnlocked(true)}>
                    <Unlock className="h-4 w-4" /> Unlock to log
                  </Button>
                </div>
              ) : (
                <>
                  {privacyMode === "local_only" && pack.containsSensitive && (
                    <p className="text-xs text-muted-foreground">
                      Local-only mode: sensitive entries here stay on this device and are not synced.
                    </p>
                  )}
                  {pack.metrics.map((m) => {
                    const v = packValues[m.metricId] ?? {};
                    if (m.kind === "boolean") {
                      return (
                        <ToggleChip
                          key={m.metricId}
                          label={m.label}
                          value={v.valueBool ?? null}
                          onChange={(val) => setPack(m.metricId, { valueBool: val })}
                        />
                      );
                    }
                    if (m.kind === "scale") {
                      return (
                        <ScaleInput
                          key={m.metricId}
                          label={m.label}
                          value={v.valueNum ?? null}
                          min={m.min ?? 1}
                          max={m.max ?? 10}
                          onChange={(val) => setPack(m.metricId, { valueNum: val })}
                        />
                      );
                    }
                    return (
                      <div key={m.metricId} className="space-y-1.5">
                        <label className="text-sm font-medium">{m.label}</label>
                        <Input
                          type="number"
                          inputMode="numeric"
                          value={v.valueNum ?? ""}
                          onChange={(e) =>
                            setPack(m.metricId, { valueNum: e.target.value === "" ? null : Number(e.target.value) })
                          }
                        />
                      </div>
                    );
                  })}
                </>
              )}
            </CardContent>
          </Card>
        );
      })}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-3">
        <Button
          variant="outline"
          className="flex-1"
          disabled={status === "saving"}
          onClick={() => save(false)}
        >
          {status === "saving" ? "Saving..." : status === "saved" ? "Saved" : "Save draft"}
        </Button>
        <Button className="flex-1" disabled={status === "saving"} onClick={() => save(true)}>
          Complete check-in
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Every field is optional - log what you can. You can update today&apos;s check-in anytime.
      </p>
    </main>
  );
}
