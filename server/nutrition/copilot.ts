// P10 - Nutrition Copilot. A deterministic orchestrator (NOT an LLM): it parses
// the user's message for symptoms / labs / goals, runs the assessment ->
// recommend -> meal-plan pipeline, and composes a templated, guardrailed reply.
// Emergency language short-circuits everything (docs/07 §11.5).

import type { SupabaseClient } from "@supabase/supabase-js";
import type { AssessmentInput, CopilotResponse, NutritionProfile } from "@/types/nutrition";
import { detectEmergency } from "@/ai/guardrails";
import { applyNutritionGuardrails, NUTRITION_DISCLAIMER } from "@/ai/nutrition-guardrails";
import { loadKnowledgeGraph, type KnowledgeGraph } from "@/server/nutrition/knowledge";
import { runAssessment } from "@/server/nutrition/assessment";
import { buildRecommendations } from "@/server/nutrition/recommend";
import { buildMealPlan } from "@/server/nutrition/mealplan";

const LAB_PATTERNS: { slug: string; re: RegExp }[] = [
  { slug: "vitamin_d", re: /\b(?:vitamin\s*d|vit\s*d|25[\s-]?oh)\b[^0-9]{0,8}(\d+(?:\.\d+)?)/i },
  { slug: "ferritin", re: /\bferritin\b[^0-9]{0,8}(\d+(?:\.\d+)?)/i },
  { slug: "vitamin_b12", re: /\b(?:b[\s-]?12|cobalamin)\b[^0-9]{0,8}(\d+(?:\.\d+)?)/i },
  { slug: "folate", re: /\bfolate\b[^0-9]{0,8}(\d+(?:\.\d+)?)/i },
  { slug: "calcium", re: /\bcalcium\b[^0-9]{0,8}(\d+(?:\.\d+)?)/i },
  { slug: "magnesium", re: /\bmagnesium\b[^0-9]{0,8}(\d+(?:\.\d+)?)/i },
  { slug: "potassium", re: /\bpotassium\b[^0-9]{0,8}(\d+(?:\.\d+)?)/i },
];

function parseLabs(message: string): Record<string, number> {
  const labs: Record<string, number> = {};
  for (const { slug, re } of LAB_PATTERNS) {
    const m = message.match(re);
    if (m) labs[slug] = Number(m[1]);
  }
  return labs;
}

function parseSymptoms(message: string, kg: KnowledgeGraph): string[] {
  const text = message.toLowerCase();
  const found = new Set<string>();
  const phrases = new Set<string>(kg.symptomLinks.map((s) => s.symptom));
  // Add a few natural-language aliases the catalog doesn't store verbatim.
  const aliases: [string, string][] = [
    ["tired", "fatigue"],
    ["exhausted", "fatigue"],
    ["no energy", "low energy"],
    ["cramp", "muscle cramps"],
    ["weak", "muscle weakness"],
    ["hair fall", "hair loss"],
    ["losing hair", "hair loss"],
    ["down", "low mood"],
    ["depressed", "low mood"],
    ["foggy", "brain fog"],
    ["tingling", "tingling"],
    ["numb", "tingling"],
    ["getting sick", "frequent infections"],
    ["can't sleep", "poor sleep"],
    ["constipated", "constipation"],
    ["reflux", "acid reflux"],
    ["heartburn", "acid reflux"],
    ["breathless", "shortness of breath"],
    ["dizzy", "dizziness"],
  ];
  for (const p of phrases) if (text.includes(p)) found.add(p);
  for (const [alias, canonical] of aliases) if (text.includes(alias)) found.add(canonical);
  return [...found];
}

function parseGoals(message: string): string[] {
  const text = message.toLowerCase();
  const goals: string[] = [];
  if (/bone|osteo/.test(text)) goals.push("improve bone health");
  if (/energy|tired|fatigue|stamina/.test(text)) goals.push("more energy");
  if (/mood|depress/.test(text)) goals.push("support mood");
  if (/immun|cold|sick/.test(text)) goals.push("support immunity");
  if (/muscle|strength/.test(text)) goals.push("build muscle");
  if (/blood pressure|hypertension/.test(text)) goals.push("blood pressure");
  if (/anemia|anaemia|iron/.test(text)) goals.push("address low iron");
  if (/gut|digest|bowel/.test(text)) goals.push("gut health");
  return goals;
}

function emergencyReply(): CopilotResponse {
  return {
    system: "nutrition",
    emergency: true,
    paragraphs: [],
    suspectedFactors: [],
    recommendations: [],
    mealPlan: null,
    questions: [],
    disclaimers: [
      "It sounds like this could be urgent. If you are experiencing a medical emergency, call your local emergency number or go to the nearest emergency department now.",
      "Nutrition guidance is not appropriate for an emergency. Please seek immediate help.",
    ],
    guardrailFlags: [{ rule: "emergency", matched: "emergency_language", action: "blocked" }],
  };
}

export async function runCopilot(
  sb: SupabaseClient,
  message: string,
  profile: NutritionProfile,
  medications: string[],
): Promise<CopilotResponse> {
  if (detectEmergency(message)) return emergencyReply();

  const kg = await loadKnowledgeGraph(sb);

  const input: AssessmentInput = {
    symptoms: parseSymptoms(message, kg),
    labs: parseLabs(message),
    goals: [...parseGoals(message), ...profile.goals],
    conditions: profile.conditions,
    medications,
  };

  const assessment = runAssessment(kg, input);
  const recommendations = buildRecommendations(kg, assessment.suspectedFactors, profile, { medications });
  const targetNutrients = assessment.suspectedFactors.slice(0, 4).map((f) => f.nutrientSlug);
  const mealPlan = targetNutrients.length > 0 ? buildMealPlan(kg, targetNutrients, profile) : null;

  // Compose a templated, education-framed narrative.
  const raw: string[] = [];
  if (assessment.suspectedFactors.length === 0) {
    raw.push(
      "Thanks for sharing. From what you described, no specific nutrient stood out. If you tell me about symptoms, goals, or recent lab values, I can be more specific.",
    );
  } else {
    const top = assessment.suspectedFactors.slice(0, 3);
    raw.push(
      `Based on what you shared, the patterns that stand out point toward ${top
        .map((f) => f.nutrientName)
        .join(", ")}.`,
    );
    for (const f of top) {
      const reason = f.reasoning[0]?.detail ?? "";
      raw.push(`${f.factor} (confidence ${Math.round(f.confidence * 100)}%): ${reason}`);
    }
  }
  if (recommendations.length > 0) {
    const byNutrient = new Map<string, string[]>();
    for (const r of recommendations) {
      const list = byNutrient.get(r.nutrientName) ?? [];
      if (list.length < 3) list.push(r.foodName);
      byNutrient.set(r.nutrientName, list);
    }
    for (const [nutrient, items] of byNutrient) {
      raw.push(`Foods that provide ${nutrient} include ${items.join(", ")}.`);
    }
    if (recommendations.some((r) => r.safetyStatus === "flagged")) {
      raw.push("A few suggestions carry safety notes based on your medications or conditions - check the warnings before acting.");
    }
  }
  if (mealPlan) {
    raw.push("I also put together a sample day of meals built around these nutrients - open the Meal Plan tab to see it.");
  }

  const questions = [
    "Have you had recent bloodwork that might include these nutrients?",
    "Are there foods here you'd rather avoid, or any I should know about?",
  ];

  const { lines, flags } = applyNutritionGuardrails(raw);

  return {
    system: "nutrition",
    paragraphs: lines,
    suspectedFactors: assessment.suspectedFactors,
    recommendations,
    mealPlan,
    questions,
    disclaimers: [NUTRITION_DISCLAIMER],
    guardrailFlags: flags,
  };
}
