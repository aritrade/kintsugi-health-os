import type { SupabaseClient } from "@supabase/supabase-js";
import { INDEX_LABELS } from "@/lib/index-labels";

// Knowledge Graph (docs/13 §2.5): an interactive graph of metrics/indices whose
// edges are backed by detected correlations.

const VAR_LABELS: Record<string, string> = {
  sleep_quality: "Sleep quality",
  energy: "Energy",
  recovery: "Recovery",
  mood: "Mood",
  confidence: "Confidence",
  fatigue: "Fatigue",
  anxiety: "Anxiety",
  stress: "Stress",
  pain: "Pain",
  steps: "Steps",
  alcohol_units: "Alcohol",
  caffeine_mg: "Caffeine",
  exercised: "Exercise",
};

function labelFor(key: string): string {
  return VAR_LABELS[key] ?? INDEX_LABELS[key as keyof typeof INDEX_LABELS] ?? key;
}
function typeFor(key: string): string {
  return key in INDEX_LABELS && !(key in VAR_LABELS) ? "index" : "metric";
}

export interface GraphNode {
  id: string;
  key: string;
  label: string;
  type: string;
  degree: number;
}
export interface GraphEdge {
  source: string;
  target: string;
  relation: string;
  weight: number;
}
export interface KnowledgeGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

// Rebuilds the persisted graph from the user's correlations (latest per pair).
export async function rebuildGraph(supabase: SupabaseClient, userId: string): Promise<KnowledgeGraph> {
  const { data: correlations } = await supabase
    .from("correlations")
    .select("variable_a, variable_b, coefficient, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(500);

  // Keep the most recent correlation per unordered pair.
  const latest = new Map<string, { a: string; b: string; coef: number }>();
  for (const c of correlations ?? []) {
    const a = c.variable_a as string;
    const b = c.variable_b as string;
    const k = [a, b].sort().join("|");
    if (!latest.has(k)) latest.set(k, { a, b, coef: Number(c.coefficient) });
  }

  // Reset persisted graph for this user, then rebuild.
  await supabase.from("graph_edges").delete().eq("user_id", userId);
  await supabase.from("graph_nodes").delete().eq("user_id", userId);

  const keys = new Set<string>();
  for (const { a, b } of latest.values()) {
    keys.add(a);
    keys.add(b);
  }
  const nodeIdByKey = new Map<string, string>();
  for (const key of keys) {
    const { data: node } = await supabase
      .from("graph_nodes")
      .insert({ user_id: userId, node_type: typeFor(key), label: labelFor(key), metadata: { key } })
      .select("id")
      .single();
    if (node) nodeIdByKey.set(key, node.id as string);
  }

  for (const { a, b, coef } of latest.values()) {
    const sId = nodeIdByKey.get(a);
    const tId = nodeIdByKey.get(b);
    if (!sId || !tId) continue;
    await supabase.from("graph_edges").insert({
      user_id: userId,
      source_id: sId,
      target_id: tId,
      relation: coef >= 0 ? "moves_with" : "moves_against",
      weight: Math.abs(coef),
    });
  }

  return getGraph(supabase, userId);
}

export async function getGraph(supabase: SupabaseClient, userId: string): Promise<KnowledgeGraph> {
  const { data: nodeRows } = await supabase
    .from("graph_nodes")
    .select("id, node_type, label, metadata")
    .eq("user_id", userId);
  const { data: edgeRows } = await supabase
    .from("graph_edges")
    .select("source_id, target_id, relation, weight")
    .eq("user_id", userId);

  const degree = new Map<string, number>();
  for (const e of edgeRows ?? []) {
    degree.set(e.source_id as string, (degree.get(e.source_id as string) ?? 0) + 1);
    degree.set(e.target_id as string, (degree.get(e.target_id as string) ?? 0) + 1);
  }

  const nodes: GraphNode[] = (nodeRows ?? []).map((n) => ({
    id: n.id as string,
    key: ((n.metadata as { key?: string })?.key as string) ?? (n.label as string),
    label: n.label as string,
    type: n.node_type as string,
    degree: degree.get(n.id as string) ?? 0,
  }));
  const edges: GraphEdge[] = (edgeRows ?? []).map((e) => ({
    source: e.source_id as string,
    target: e.target_id as string,
    relation: e.relation as string,
    weight: Number(e.weight ?? 0),
  }));

  return { nodes, edges };
}
