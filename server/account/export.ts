import type { SupabaseClient } from "@supabase/supabase-js";

// Full data export (docs/10 section 9). Machine-readable JSON of all owned rows
// plus a manifest of files with short-lived signed URLs. Sensitive categories are
// clearly labeled so the user understands what they are sharing.

const OWNED_TABLES = [
  "profiles", "pack_activations", "timeline_events", "checkins", "checkin_symptoms",
  "pack_metric_entries", "derived_indices", "memory_notes", "tags", "note_tags",
  "medical_records", "record_extractions", "lab_panels", "lab_results", "experiments",
  "correlations", "graph_nodes", "graph_edges", "reports", "cases", "ai_interactions",
  "insights", "momentum_events", "integration_connections", "canonical_metric_values",
  "audit_log",
] as const;

// Tables that may contain highly sensitive health data (flagged in the export).
const SENSITIVE_TABLES = new Set([
  "checkins", "checkin_symptoms", "pack_metric_entries", "derived_indices",
  "medical_records", "record_extractions", "lab_panels", "lab_results",
  "memory_notes", "insights", "correlations", "cases", "reports",
]);

export interface ExportBundle {
  _meta: {
    format: "kintsugi-export/v1";
    generatedAt: string;
    userId: string;
    sensitiveTables: string[];
    note: string;
  };
  tables: Record<string, unknown[]>;
  files: { recordId: string; title: string; storagePath: string; mimeType: string | null; signedUrl: string | null }[];
}

export async function buildExport(supabase: SupabaseClient, userId: string): Promise<ExportBundle> {
  const tables: Record<string, unknown[]> = {};
  for (const t of OWNED_TABLES) {
    // RLS scopes every query to the owner; results are the user's rows only.
    const { data } = await supabase.from(t).select("*");
    tables[t] = data ?? [];
  }

  // File manifest with signed URLs for medical record objects.
  const files: ExportBundle["files"] = [];
  const records = (tables["medical_records"] ?? []) as Array<Record<string, unknown>>;
  for (const r of records) {
    const path = r.storage_path as string | undefined;
    if (!path) continue;
    let signedUrl: string | null = null;
    const { data: signed } = await supabase.storage
      .from("medical-records")
      .createSignedUrl(path, 60 * 60); // 1 hour
    signedUrl = signed?.signedUrl ?? null;
    files.push({
      recordId: r.id as string,
      title: (r.title as string) ?? "Untitled",
      storagePath: path,
      mimeType: (r.mime_type as string) ?? null,
      signedUrl,
    });
  }

  return {
    _meta: {
      format: "kintsugi-export/v1",
      generatedAt: new Date().toISOString(),
      userId,
      sensitiveTables: [...SENSITIVE_TABLES],
      note:
        "This export contains your complete Kintsugi data. Tables listed in sensitiveTables may include highly sensitive health information. File download links expire in 1 hour.",
    },
    tables,
    files,
  };
}
