"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, ExternalLink, Sparkles } from "lucide-react";

type Biomarker = {
  id: string;
  slug: string;
  display_name: string;
  unit: string | null;
  default_ref_low: number | null;
  default_ref_high: number | null;
};

type LabRow = {
  key: string;
  biomarkerId: string | "";
  customName: string;
  value: string;
  unit: string;
  refLow: string;
  refHigh: string;
  resultDate: string;
};

function emptyRow(date: string): LabRow {
  return { key: crypto.randomUUID(), biomarkerId: "", customName: "", value: "", unit: "", refLow: "", refHigh: "", resultDate: date };
}

export function RecordDetailClient({ recordId }: { recordId: string }) {
  const router = useRouter();
  const [record, setRecord] = useState<Record<string, unknown> | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [biomarkers, setBiomarkers] = useState<Biomarker[]>([]);
  const [rows, setRows] = useState<LabRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [extracting, setExtracting] = useState(false);
  const [extractMsg, setExtractMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const today = new Date().toISOString().slice(0, 10);

  const load = useCallback(async () => {
    setLoading(true);
    const [recRes, bioRes] = await Promise.all([
      fetch(`/api/v1/vault/records/${recordId}`),
      fetch(`/api/v1/labs/biomarkers`),
    ]);
    const recJson = await recRes.json();
    const bioJson = await bioRes.json();
    setRecord(recJson?.data?.record ?? null);
    setDownloadUrl(recJson?.data?.downloadUrl ?? null);
    setBiomarkers(bioJson?.data?.biomarkers ?? []);
    const recDate = (recJson?.data?.record?.record_date as string) ?? today;
    const extracted = recJson?.data?.extraction?.structured?.results as Array<Record<string, unknown>> | undefined;
    if (extracted && extracted.length > 0) {
      setRows(
        extracted.map((r) => ({
          key: crypto.randomUUID(),
          biomarkerId: "",
          customName: String(r.name ?? ""),
          value: r.value != null ? String(r.value) : "",
          unit: String(r.unit ?? ""),
          refLow: r.refLow != null ? String(r.refLow) : "",
          refHigh: r.refHigh != null ? String(r.refHigh) : "",
          resultDate: (r.date as string) || recDate,
        })),
      );
    } else {
      setRows([emptyRow(recDate)]);
    }
    setLoading(false);
  }, [recordId, today]);

  useEffect(() => {
    load();
  }, [load]);

  function setRow(key: string, patch: Partial<LabRow>) {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }
  function onBiomarker(key: string, biomarkerId: string) {
    const b = biomarkers.find((x) => x.id === biomarkerId);
    setRow(key, {
      biomarkerId,
      unit: b?.unit ?? "",
      refLow: b?.default_ref_low != null ? String(b.default_ref_low) : "",
      refHigh: b?.default_ref_high != null ? String(b.default_ref_high) : "",
    });
  }

  async function runExtract() {
    setExtracting(true);
    setExtractMsg(null);
    const res = await fetch(`/api/v1/vault/records/${recordId}/extract`, { method: "POST" });
    const json = await res.json();
    setExtracting(false);
    if (json?.data?.available) {
      setExtractMsg(`Extracted ${json.data.results.length} value(s) - review and confirm below.`);
      load();
    } else {
      setExtractMsg("Automatic extraction is not available for this file yet - enter values manually below.");
    }
  }

  async function save() {
    const results = rows
      .filter((r) => r.value !== "" && (r.biomarkerId || r.customName))
      .map((r) => ({
        biomarkerId: r.biomarkerId || null,
        customName: r.biomarkerId ? null : r.customName || null,
        value: Number(r.value),
        unit: r.unit || null,
        refLow: r.refLow === "" ? null : Number(r.refLow),
        refHigh: r.refHigh === "" ? null : Number(r.refHigh),
        resultDate: r.resultDate,
      }));
    if (results.length === 0) {
      setError("Add at least one value.");
      return;
    }
    setSaving(true);
    setError(null);
    const res = await fetch("/api/v1/labs/results", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recordId, markReviewed: true, results }),
    });
    setSaving(false);
    if (!res.ok) {
      const j = await res.json().catch(() => null);
      setError(j?.error?.message ?? "Could not save.");
      return;
    }
    setSaved(true);
  }

  async function deleteRecord() {
    await fetch(`/api/v1/vault/records/${recordId}`, { method: "DELETE" });
    router.push("/records");
    router.refresh();
  }

  if (loading) return <main className="p-6 text-sm text-muted-foreground">Loading...</main>;
  if (!record) return <main className="p-6 text-sm text-muted-foreground">Record not found.</main>;

  return (
    <main className="space-y-5 p-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{String(record.title)}</h1>
          <p className="text-sm text-muted-foreground">Status: {String(record.status)}</p>
        </div>
        <button onClick={deleteRecord} className="text-muted-foreground hover:text-red-600" aria-label="Delete record">
          <Trash2 className="h-5 w-5" />
        </button>
      </header>

      {downloadUrl && (
        <a href={downloadUrl} target="_blank" rel="noreferrer">
          <Button variant="outline" className="w-full">
            <ExternalLink className="h-4 w-4" /> Open file
          </Button>
        </a>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Confirm lab values</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Extract automatically, then confirm - or enter values by hand. Nothing is trusted until you confirm.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={runExtract} disabled={extracting}>
            <Sparkles className="h-4 w-4" /> {extracting ? "Extracting..." : "Try auto-extract"}
          </Button>
          {extractMsg && <p className="text-xs text-muted-foreground">{extractMsg}</p>}

          <div className="space-y-3">
            {rows.map((r) => (
              <div key={r.key} className="space-y-2 rounded-md border p-3">
                <select
                  className="h-10 w-full rounded-md border border-input bg-card px-2 text-sm"
                  value={r.biomarkerId}
                  onChange={(e) => onBiomarker(r.key, e.target.value)}
                >
                  <option value="">Custom biomarker...</option>
                  {biomarkers.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.display_name}
                    </option>
                  ))}
                </select>
                {!r.biomarkerId && (
                  <Input placeholder="Biomarker name" value={r.customName} onChange={(e) => setRow(r.key, { customName: e.target.value })} />
                )}
                <div className="grid grid-cols-3 gap-2">
                  <Input placeholder="Value" inputMode="decimal" value={r.value} onChange={(e) => setRow(r.key, { value: e.target.value })} />
                  <Input placeholder="Unit" value={r.unit} onChange={(e) => setRow(r.key, { unit: e.target.value })} />
                  <Input type="date" value={r.resultDate} onChange={(e) => setRow(r.key, { resultDate: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="Ref low" inputMode="decimal" value={r.refLow} onChange={(e) => setRow(r.key, { refLow: e.target.value })} />
                  <Input placeholder="Ref high" inputMode="decimal" value={r.refHigh} onChange={(e) => setRow(r.key, { refHigh: e.target.value })} />
                </div>
              </div>
            ))}
          </div>

          <Button variant="ghost" size="sm" onClick={() => setRows((rs) => [...rs, emptyRow(today)])}>
            <Plus className="h-4 w-4" /> Add another value
          </Button>

          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button onClick={save} disabled={saving} className="w-full">
            {saving ? "Saving..." : saved ? "Saved - values confirmed" : "Confirm & save values"}
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
