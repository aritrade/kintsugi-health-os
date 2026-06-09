"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileText, Upload, FlaskConical } from "lucide-react";

type RecordRow = {
  id: string;
  type: string;
  title: string;
  status: string;
  record_date: string | null;
  created_at: string;
};

const TYPE_LABELS: Record<string, string> = {
  lab_report: "Lab report",
  imaging_report: "Imaging",
  doctor_note: "Doctor note",
  prescription_doc: "Prescription",
  other: "Other",
};

function sanitize(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
}

export function RecordsClient() {
  const [records, setRecords] = useState<RecordRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [type, setType] = useState("lab_report");
  const [recordDate, setRecordDate] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/v1/vault/records");
    const json = await res.json();
    setRecords(json?.data?.records ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function upload() {
    if (!file) {
      setError("Choose a file to upload.");
      return;
    }
    setUploading(true);
    setError(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Session expired. Please sign in again.");
      setUploading(false);
      return;
    }
    const path = `${user.id}/${crypto.randomUUID()}/${sanitize(file.name)}`;
    const up = await supabase.storage.from("medical-records").upload(path, file, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });
    if (up.error) {
      setError(`Upload failed: ${up.error.message}`);
      setUploading(false);
      return;
    }
    const res = await fetch("/api/v1/vault/records", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title || file.name,
        type,
        storagePath: path,
        mimeType: file.type || undefined,
        recordDate: recordDate || null,
      }),
    });
    setUploading(false);
    if (!res.ok) {
      const j = await res.json().catch(() => null);
      setError(j?.error?.message ?? "Could not register the record.");
      return;
    }
    setTitle("");
    setRecordDate("");
    setFile(null);
    const fileEl = document.getElementById("vault-file") as HTMLInputElement | null;
    if (fileEl) fileEl.value = "";
    load();
  }

  return (
    <main className="space-y-5 p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Medical Vault</h1>
        <Link href="/labs">
          <Button size="sm" variant="outline">
            <FlaskConical className="h-4 w-4" /> Lab trends
          </Button>
        </Link>
      </header>

      <Card>
        <CardContent className="space-y-3 py-4">
          <p className="text-sm font-medium">Add a record</p>
          <Input placeholder="Title (e.g. Annual blood work)" value={title} onChange={(e) => setTitle(e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <select
              className="h-11 rounded-md border border-input bg-card px-2 text-sm"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              {Object.entries(TYPE_LABELS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
            <Input type="date" value={recordDate} onChange={(e) => setRecordDate(e.target.value)} />
          </div>
          <input
            id="vault-file"
            type="file"
            accept="application/pdf,image/png,image/jpeg,image/webp"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-2 file:text-sm"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button onClick={upload} disabled={uploading} className="w-full">
            <Upload className="h-4 w-4" /> {uploading ? "Uploading..." : "Upload to encrypted vault"}
          </Button>
          <p className="text-xs text-muted-foreground">
            Stored privately and encrypted at rest. Only you can access your files.
          </p>
        </CardContent>
      </Card>

      <section className="space-y-2">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : records.length === 0 ? (
          <p className="text-sm text-muted-foreground">No records yet.</p>
        ) : (
          records.map((r) => (
            <Link key={r.id} href={`/records/${r.id}`}>
              <Card className="transition-colors hover:bg-muted">
                <CardContent className="flex items-center gap-3 py-3">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{r.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {TYPE_LABELS[r.type] ?? r.type}
                      {r.record_date ? ` · ${r.record_date}` : ""} · {r.status}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </section>
    </main>
  );
}
