import type { SupabaseClient } from "@supabase/supabase-js";
import type { IndexKind } from "@/types";
import { INDEX_LABELS } from "@/lib/index-labels";
import { calcAge } from "@/lib/utils";

export interface CaseContent {
  generatedAt: string;
  specialist: string | null;
  patient: { displayName: string | null; biologicalSex: string | null; ageYears: number | null };
  summary: { checkinDays30: number };
  labs: {
    name: string;
    value: number;
    unit: string | null;
    refLow: number | null;
    refHigh: number | null;
    date: string;
    status: "low" | "in_range" | "high" | "unknown";
  }[];
  indices: { kind: string; label: string; value: number; date: string }[];
  findings: string[];
  positives: string[];
  openQuestions: string[];
  experiments: { question: string; conclusion: string | null; status: string }[];
  momentumScore: number | null;
  disclaimer: string;
}

const DISCLAIMER =
  "This is a self-tracked summary prepared by the patient for discussion. It is observational and not a diagnosis.";

function labStatus(value: number, low: number | null, high: number | null): CaseContent["labs"][number]["status"] {
  if (low != null && value < low) return "low";
  if (high != null && value > high) return "high";
  if (low != null || high != null) return "in_range";
  return "unknown";
}

export async function buildCaseContent(
  supabase: SupabaseClient,
  userId: string,
  specialist: string | null,
): Promise<CaseContent> {
  const today = new Date();
  const since30 = new Date(today.getTime() - 30 * 86400000).toISOString().slice(0, 10);

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, biological_sex, date_of_birth")
    .eq("user_id", userId)
    .maybeSingle();

  const { count: checkinDays30 } = await supabase
    .from("checkins")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("checkin_date", since30);

  // Latest lab result per biomarker.
  const { data: labRows } = await supabase
    .from("lab_results")
    .select("value, unit, ref_low, ref_high, result_date, biomarkers(display_name), custom_name")
    .eq("user_id", userId)
    .order("result_date", { ascending: false })
    .limit(200);
  const seenLab = new Set<string>();
  const labs: CaseContent["labs"] = [];
  for (const r of labRows ?? []) {
    const bm = r.biomarkers as unknown as { display_name: string } | null;
    const name = bm?.display_name ?? (r.custom_name as string) ?? "Unknown";
    if (seenLab.has(name)) continue;
    seenLab.add(name);
    const value = Number(r.value);
    const low = r.ref_low != null ? Number(r.ref_low) : null;
    const high = r.ref_high != null ? Number(r.ref_high) : null;
    labs.push({
      name,
      value,
      unit: (r.unit as string) ?? null,
      refLow: low,
      refHigh: high,
      date: r.result_date as string,
      status: labStatus(value, low, high),
    });
  }

  // Latest derived index per kind.
  const { data: idxRows } = await supabase
    .from("derived_indices")
    .select("index_kind, value, index_date")
    .eq("user_id", userId)
    .eq("index_slug", "default")
    .order("index_date", { ascending: false })
    .limit(120);
  const seenIdx = new Set<string>();
  const indices: CaseContent["indices"] = [];
  for (const r of idxRows ?? []) {
    const kind = r.index_kind as IndexKind;
    if (seenIdx.has(kind) || kind === "health_momentum") continue;
    seenIdx.add(kind);
    indices.push({ kind, label: INDEX_LABELS[kind] ?? kind, value: Math.round(Number(r.value)), date: r.index_date as string });
  }
  const momentumRow = (idxRows ?? []).find((r) => r.index_kind === "health_momentum");

  // Active insights.
  const { data: insights } = await supabase
    .from("insights")
    .select("observation, investigation_question, is_positive")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(40);
  const findings: string[] = [];
  const positives: string[] = [];
  const openQuestions: string[] = [];
  for (const i of insights ?? []) {
    if (i.is_positive) positives.push(i.observation as string);
    else findings.push(i.observation as string);
    if (i.investigation_question) openQuestions.push(i.investigation_question as string);
  }

  // Completed/active experiments.
  const { data: exps } = await supabase
    .from("experiments")
    .select("question, conclusion, status")
    .eq("user_id", userId)
    .in("status", ["completed", "active"])
    .order("created_at", { ascending: false })
    .limit(20);

  return {
    generatedAt: today.toISOString(),
    specialist,
    patient: {
      displayName: (profile?.display_name as string) ?? null,
      biologicalSex: (profile?.biological_sex as string) ?? null,
      ageYears: profile?.date_of_birth ? calcAge(profile.date_of_birth as string) ?? null : null,
    },
    summary: { checkinDays30: checkinDays30 ?? 0 },
    labs,
    indices,
    findings,
    positives,
    openQuestions: Array.from(new Set(openQuestions)),
    experiments: (exps ?? []).map((e) => ({
      question: e.question as string,
      conclusion: (e.conclusion as string) ?? null,
      status: e.status as string,
    })),
    momentumScore: momentumRow ? Math.round(Number(momentumRow.value)) : null,
    disclaimer: DISCLAIMER,
  };
}

// Clinician-friendly Markdown rendering of a case.
export function caseToMarkdown(title: string, c: CaseContent): string {
  const lines: string[] = [];
  lines.push(`# ${title}`);
  if (c.specialist) lines.push(`_Prepared for: ${c.specialist}_`);
  lines.push(`_Generated: ${c.generatedAt.slice(0, 10)}_`);
  lines.push("");
  lines.push("## Patient");
  lines.push(`- Name: ${c.patient.displayName ?? "—"}`);
  lines.push(`- Biological sex: ${c.patient.biologicalSex ?? "—"}`);
  lines.push(`- Age: ${c.patient.ageYears ?? "—"}`);
  lines.push(`- Check-ins (last 30 days): ${c.summary.checkinDays30}`);
  lines.push("");

  if (c.labs.length) {
    lines.push("## Recent lab results");
    lines.push("| Biomarker | Value | Reference | Status | Date |");
    lines.push("| --- | --- | --- | --- | --- |");
    for (const l of c.labs) {
      const ref = l.refLow != null || l.refHigh != null ? `${l.refLow ?? ""}–${l.refHigh ?? ""}` : "—";
      lines.push(`| ${l.name} | ${l.value}${l.unit ? ` ${l.unit}` : ""} | ${ref} | ${l.status} | ${l.date} |`);
    }
    lines.push("");
  }

  if (c.indices.length) {
    lines.push("## Self-tracked indices (0–100)");
    for (const i of c.indices) lines.push(`- ${i.label}: ${i.value} (as of ${i.date})`);
    lines.push("");
  }

  if (c.findings.length) {
    lines.push("## Observations to discuss");
    for (const f of c.findings) lines.push(`- ${f}`);
    lines.push("");
  }
  if (c.positives.length) {
    lines.push("## Positive trends");
    for (const p of c.positives) lines.push(`- ${p}`);
    lines.push("");
  }
  if (c.openQuestions.length) {
    lines.push("## Open questions");
    for (const q of c.openQuestions) lines.push(`- ${q}`);
    lines.push("");
  }
  if (c.experiments.length) {
    lines.push("## Experiments");
    for (const e of c.experiments) {
      lines.push(`- ${e.question} (${e.status})${e.conclusion ? ` — ${e.conclusion}` : ""}`);
    }
    lines.push("");
  }
  if (c.momentumScore != null) {
    lines.push(`## Health Momentum: ${c.momentumScore}/100`);
    lines.push("");
  }
  lines.push("---");
  lines.push(`> ${c.disclaimer}`);
  return lines.join("\n");
}
