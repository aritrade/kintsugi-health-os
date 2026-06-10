// P1 - Assessment Engine. Fully deterministic: combines lab-threshold crossings,
// symptom->nutrient weights, and condition/goal->nutrient mappings into suspected
// nutrient factors with a confidence score and a transparent reasoning chain.
// No LLM in this path.

import type { AssessmentInput, AssessmentResult, ReasoningStep, SuspectedFactor } from "@/types/nutrition";
import { applyNutritionGuardrails, NUTRITION_DISCLAIMER } from "@/ai/nutrition-guardrails";
import type { KnowledgeGraph } from "@/server/nutrition/knowledge";

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
// Noisy-OR: combine independent-ish probabilities so each adds diminishing lift.
const noisyOr = (probs: number[]) => clamp01(1 - probs.reduce((acc, p) => acc * (1 - clamp01(p)), 1));

// Map free-text symptoms onto the catalog's canonical symptom names.
const SYMPTOM_ALIASES: Record<string, string> = {
  tired: "fatigue",
  tiredness: "fatigue",
  exhausted: "fatigue",
  exhaustion: "fatigue",
  "low energy": "low energy",
  cramp: "muscle cramps",
  cramps: "muscle cramps",
  "muscle cramp": "muscle cramps",
  "leg cramps": "muscle cramps",
  weak: "muscle weakness",
  weakness: "muscle weakness",
  "hair fall": "hair loss",
  "hair thinning": "hair loss",
  "thinning hair": "hair loss",
  sad: "low mood",
  depressed: "low mood",
  depression: "low mood",
  "low mood": "low mood",
  "brain fog": "brain fog",
  foggy: "brain fog",
  "poor concentration": "brain fog",
  "pins and needles": "tingling",
  numbness: "tingling",
  "getting sick": "frequent infections",
  "sick often": "frequent infections",
  "frequent colds": "frequent infections",
  "trouble sleeping": "poor sleep",
  insomnia: "poor sleep",
  constipated: "constipation",
  heartburn: "acid reflux",
  reflux: "acid reflux",
  breathless: "shortness of breath",
  dizzy: "dizziness",
  lightheaded: "dizziness",
};

function normalizeSymptom(raw: string): string {
  const s = raw.trim().toLowerCase();
  return SYMPTOM_ALIASES[s] ?? s;
}

// Map a goal phrase onto catalog condition slugs.
function goalToConditions(goal: string): string[] {
  const g = goal.trim().toLowerCase();
  const out: string[] = [];
  if (/bone|osteo|skeleton/.test(g)) out.push("bone_health");
  if (/energy|fatigue|tired|stamina/.test(g)) out.push("fatigue");
  if (/mood|depress|mental/.test(g)) out.push("low_mood");
  if (/immun|cold|sick/.test(g)) out.push("immunity");
  if (/muscle|strength|lean/.test(g)) out.push("muscle_health");
  if (/blood pressure|hypertension|\bbp\b/.test(g)) out.push("hypertension");
  if (/anemia|anaemia|iron|hemoglobin|haemoglobin/.test(g)) out.push("anemia");
  if (/gut|digest|bowel|regular/.test(g)) out.push("gut_health");
  return out;
}

interface Contribution {
  prob: number;
  step: ReasoningStep;
  labConfirmed: boolean;
}

export function runAssessment(kg: KnowledgeGraph, input: AssessmentInput): AssessmentResult {
  const symptoms = (input.symptoms ?? []).map(normalizeSymptom);
  const conditions = (input.conditions ?? []).map((c) => c.trim().toLowerCase());
  const goals = input.goals ?? [];
  const labs = input.labs ?? {};

  // condition slugs come from explicit conditions + mapped goals.
  const conditionSlugs = new Set<string>(conditions);
  for (const goal of goals) for (const c of goalToConditions(goal)) conditionSlugs.add(c);

  const byNutrient = new Map<string, Contribution[]>();
  const add = (nutrientSlug: string, c: Contribution) => {
    const list = byNutrient.get(nutrientSlug) ?? [];
    list.push(c);
    byNutrient.set(nutrientSlug, list);
  };

  // 1) Lab thresholds - strongest signal.
  for (const marker of kg.labMarkers) {
    const value = labs[marker.biomarkerSlug];
    if (value === undefined || value === null || Number.isNaN(value)) continue;
    if (value < marker.lowThreshold) {
      const deficit = clamp01((marker.lowThreshold - value) / marker.lowThreshold);
      const prob = clamp01(0.6 + 0.35 * deficit);
      add(marker.nutrientSlug, {
        prob,
        labConfirmed: true,
        step: {
          source: "lab",
          detail: `Your ${marker.nutrientName} marker (${marker.biomarkerSlug.replace(/_/g, " ")}) reads ${value}${
            marker.unit ? ` ${marker.unit}` : ""
          }, below the reference point of ${marker.lowThreshold}${marker.unit ? ` ${marker.unit}` : ""}.`,
          contribution: prob,
        },
      });
    }
  }

  // 2) Symptoms.
  for (const link of kg.symptomLinks) {
    if (!symptoms.includes(link.symptom)) continue;
    add(link.nutrientSlug, {
      prob: link.weight,
      labConfirmed: false,
      step: {
        source: "symptom",
        detail: `You reported "${link.symptom}", which is commonly associated with low ${link.nutrientName}.`,
        contribution: link.weight,
      },
    });
  }

  // 3) Conditions + goals.
  for (const link of kg.conditionLinks) {
    if (link.relationship !== "supports") continue;
    if (!conditionSlugs.has(link.conditionSlug)) continue;
    const prob = 0.4;
    add(link.nutrientSlug, {
      prob,
      labConfirmed: false,
      step: {
        source: conditions.includes(link.conditionSlug) ? "condition" : "goal",
        detail: `${link.conditionSlug.replace(/_/g, " ")} draws on ${link.nutrientName}.`,
        contribution: prob,
      },
    });
  }

  const factors: SuspectedFactor[] = [];
  for (const [nutrientSlug, contributions] of byNutrient) {
    const nutrient = kg.nutrients.get(nutrientSlug);
    if (!nutrient) continue;
    const confidence = noisyOr(contributions.map((c) => c.prob));
    const labConfirmed = contributions.some((c) => c.labConfirmed);
    factors.push({
      nutrientSlug,
      nutrientName: nutrient.name,
      factor: labConfirmed ? `${nutrient.name} insufficiency` : `Possible low ${nutrient.name}`,
      confidence: Math.round(confidence * 100) / 100,
      reasoning: contributions.map((c) => c.step).sort((a, b) => b.contribution - a.contribution),
      labConfirmed,
    });
  }
  factors.sort((a, b) => b.confidence - a.confidence);

  // Plain-language summary lines (guardrailed).
  const rawLines: string[] = [];
  for (const f of factors.slice(0, 6)) {
    const top = f.reasoning[0];
    const pct = Math.round(f.confidence * 100);
    rawLines.push(`${f.factor} (confidence ${pct}%): ${top ? top.detail : ""}`.trim());
  }
  if (factors.length === 0) {
    rawLines.push(
      "Based on what you shared, no specific nutrient gaps stood out. Logging more symptoms, goals, or recent labs can sharpen this.",
    );
  }
  const { lines } = applyNutritionGuardrails(rawLines);

  return {
    suspectedFactors: factors,
    reasoning: lines,
    disclaimers: [NUTRITION_DISCLAIMER],
  };
}
