"use client";

import { X, FlaskConical, Sparkles } from "lucide-react";
import type { RecommendationExplanation } from "@/types/nutrition";

// "Why am I being told this?" drill-down - the centerpiece of the Nutrition
// Intelligence Engine. Shows the full Evidence -> Reasoning chain for a single
// recommendation.
export function WhyDrawer({
  explanation,
  foodName,
  onClose,
}: {
  explanation: RecommendationExplanation;
  foodName: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border bg-card p-6 shadow-xl sm:rounded-2xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Why am I being told this?</p>
            <h3 className="text-lg font-semibold">{foodName}</h3>
          </div>
          <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-muted" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mb-4 rounded-lg bg-primary/5 p-3 text-sm">{explanation.recommendation}</p>

        <ol className="space-y-3">
          {explanation.reasoning.map((line, i) => (
            <li key={i} className="flex gap-3 text-sm">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                {i + 1}
              </span>
              <span className="text-foreground">{line}</span>
            </li>
          ))}
        </ol>

        <div className="mt-5 flex flex-wrap items-center gap-3 border-t pt-4 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <FlaskConical className="h-3.5 w-3.5" /> Evidence: {explanation.evidenceLabel}
            {explanation.evidenceGrade ? ` (grade ${explanation.evidenceGrade})` : ""}
          </span>
          <span className="inline-flex items-center gap-1">
            <Sparkles className="h-3.5 w-3.5" /> Confidence: {Math.round(explanation.confidence * 100)}%
          </span>
        </div>
      </div>
    </div>
  );
}
