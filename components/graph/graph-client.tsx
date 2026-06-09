"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { KnowledgeGraph } from "@/server/graph/build";

export function GraphClient({ initial }: { initial: KnowledgeGraph }) {
  const [graph, setGraph] = useState(initial);
  const [busy, setBusy] = useState(false);

  async function rebuild() {
    setBusy(true);
    const res = await fetch("/api/v1/graph", { method: "POST" });
    const j = await res.json();
    setBusy(false);
    if (res.ok) setGraph(j.data);
  }

  const size = 360;
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 50;
  const n = graph.nodes.length;
  const pos = new Map(
    graph.nodes.map((node, i) => {
      const angle = (i / Math.max(1, n)) * Math.PI * 2 - Math.PI / 2;
      return [node.id, { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) }];
    }),
  );

  return (
    <main className="space-y-6 p-6">
      <header className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Knowledge Graph</h1>
          <p className="text-sm text-muted-foreground">How your metrics move together, from detected correlations.</p>
        </div>
        <Button size="sm" onClick={rebuild} disabled={busy}>
          {busy ? "Rebuilding..." : "Rebuild"}
        </Button>
      </header>

      {graph.nodes.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No correlations yet. Run investigations from the Investigate tab; relationships will appear here.
        </p>
      ) : (
        <Card>
          <CardContent className="py-4">
            <svg viewBox={`0 0 ${size} ${size}`} className="mx-auto h-auto w-full max-w-md">
              {graph.edges.map((e, i) => {
                const s = pos.get(e.source);
                const t = pos.get(e.target);
                if (!s || !t) return null;
                return (
                  <line
                    key={i}
                    x1={s.x}
                    y1={s.y}
                    x2={t.x}
                    y2={t.y}
                    stroke={e.relation === "moves_with" ? "#10b981" : "#ef4444"}
                    strokeWidth={1 + e.weight * 4}
                    strokeOpacity={0.5}
                  />
                );
              })}
              {graph.nodes.map((node) => {
                const p = pos.get(node.id);
                if (!p) return null;
                return (
                  <g key={node.id}>
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={6 + node.degree * 2}
                      fill={node.type === "index" ? "#6366f1" : "#94a3b8"}
                    />
                    <text x={p.x} y={p.y - 10 - node.degree * 2} textAnchor="middle" className="fill-foreground text-[9px]">
                      {node.label}
                    </text>
                  </g>
                );
              })}
            </svg>
            <div className="mt-3 flex justify-center gap-4 text-xs text-muted-foreground">
              <span><span className="text-emerald-600">━</span> moves together</span>
              <span><span className="text-red-600">━</span> moves opposite</span>
            </div>
          </CardContent>
        </Card>
      )}
    </main>
  );
}
