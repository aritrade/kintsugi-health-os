"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, HelpCircle, Leaf, ShieldCheck } from "lucide-react";
import type { EvidenceGrade, FoodRecommendation } from "@/types/nutrition";
import { WhyDrawer } from "@/components/nutrition/why-drawer";

const GRADE_TONE: Record<EvidenceGrade, string> = {
  A: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  B: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300",
  C: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  D: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  E: "bg-muted text-muted-foreground",
};

export function RecommendationCard({ rec }: { rec: FoodRecommendation }) {
  const [showWhy, setShowWhy] = useState(false);
  const flagged = rec.safetyStatus === "flagged";

  return (
    <>
      <Card className={flagged ? "border-amber-300 dark:border-amber-700" : undefined}>
        <CardContent className="space-y-3 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Leaf className="h-4 w-4 shrink-0 text-primary" />
                <p className="truncate font-medium">{rec.foodName}</p>
                {rec.culturalMatch && (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                    Local pick
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-sm text-muted-foreground">{rec.why}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                ~{rec.amount} {rec.unit} of {rec.nutrientName}
                {rec.servingDesc ? ` per ${rec.servingDesc}` : ""}
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              {rec.evidenceGrade && (
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${GRADE_TONE[rec.evidenceGrade]}`}>
                  Evidence {rec.evidenceGrade}
                </span>
              )}
              <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                {flagged ? (
                  <AlertTriangle className="h-3 w-3 text-amber-600" />
                ) : (
                  <ShieldCheck className="h-3 w-3 text-emerald-600" />
                )}
                {Math.round(rec.confidence * 100)}% conf.
              </span>
            </div>
          </div>

          {flagged && rec.safetyNotes.length > 0 && (
            <div className="rounded-lg bg-amber-50 p-2.5 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
              <p className="flex items-center gap-1 font-medium">
                <AlertTriangle className="h-3.5 w-3.5" /> Safety note
              </p>
              {rec.safetyNotes.map((n, i) => (
                <p key={i} className="mt-0.5">
                  {n}
                </p>
              ))}
              {rec.saferAlternatives.length > 0 && (
                <p className="mt-1">
                  Safer options: {rec.saferAlternatives.map((a) => a.foodName).join(", ")}.
                </p>
              )}
            </div>
          )}

          <Button variant="outline" size="sm" onClick={() => setShowWhy(true)}>
            <HelpCircle className="h-4 w-4" /> Why this?
          </Button>
        </CardContent>
      </Card>

      {showWhy && (
        <WhyDrawer explanation={rec.explanation} foodName={rec.foodName} onClose={() => setShowWhy(false)} />
      )}
    </>
  );
}
