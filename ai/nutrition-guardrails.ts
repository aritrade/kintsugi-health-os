// Nutrition-aware guardrail extension. Reuses the core scanner from
// ai/guardrails.ts (diagnosis / prescription / causation / condition rules) and
// layers nutrition-specific blockers on top: no "treat / cure / reverse" claims
// and no supplement-dosing language. Output stays education-framed and
// nutrients-first ("foods that provide X include ...").
//
// Pure, unit-testable functions; no I/O here.

import type { GuardrailFlag } from "@/types";
import { scanStatement } from "@/ai/guardrails";

export const NUTRITION_DISCLAIMER =
  "This is general nutrition information drawn from your own data and a curated knowledge base - not medical advice, a diagnosis, or a dietary prescription. Discuss changes with a healthcare professional or registered dietitian, especially if you have a medical condition or take medication.";

// Treatment / cure / dosing claims are NOT recoverable - the statement is dropped.
const NUTRITION_BLOCK_PATTERNS: RegExp[] = [
  /\b(cure|cures|cured|curing)\b/i,
  /\b(treat|treats|treated|treating)\b/i,
  /\b(reverse|reverses|reversed|reversing)\s+(your\s+)?\w+/i,
  /\b(heal|heals|healed|healing)\b/i,
  /\bfix(es|ed|ing)?\s+(your\s+)?\w+/i,
  /\b(guarantee|guaranteed|guarantees)\b/i,
  /\b(eliminat|prevent)(e|es|ed|ing)\s+(your\s+)?(disease|cancer|diabetes|condition)\b/i,
  /\b\d+\s?(mg|mcg|iu|g)\s+(of\s+)?(supplement|vitamin|mineral)\b/i,
  /\b(take|start|use)\s+(a\s+)?(supplement|pill|capsule|tablet)\b/i,
  /\bmegadose\b/i,
];

// Prescriptive phrasings that can be softened to education-framed language.
const NUTRITION_REFRAMES: { re: RegExp; replace: string }[] = [
  { re: /\byou (should|must|need to) eat\b/gi, replace: "foods to consider include" },
  { re: /\byou (should|must|need to) (take|consume)\b/gi, replace: "options that provide this include" },
  { re: /\bwill (boost|raise|increase|lower|reduce) your\b/gi, replace: "are associated with supporting your" },
  { re: /\bwill (boost|raise|increase|lower|reduce)\b/gi, replace: "are associated with supporting" },
  { re: /\bsupplement with\b/gi, replace: "get more from foods such as" },
];

export interface NutritionScanResult {
  text: string;
  flags: GuardrailFlag[];
  blocked: boolean;
}

// Scans a single nutrition statement: applies the core scanner, then the
// nutrition-specific reframes/blocks. Returns the cleaned text or marks it blocked.
export function scanNutritionStatement(input: string): NutritionScanResult {
  const flags: GuardrailFlag[] = [];

  // Nutrition-specific reframes first (so the core scanner sees softened text).
  let text = input;
  for (const { re, replace } of NUTRITION_REFRAMES) {
    if (re.test(text)) {
      const m = text.match(re);
      if (m) flags.push({ rule: "nutrition_prescriptive", matched: m[0], action: "reframed" });
      text = text.replace(re, replace);
    }
  }

  // Hard blockers for treatment / cure / dosing claims.
  for (const re of NUTRITION_BLOCK_PATTERNS) {
    const m = text.match(re);
    if (m) {
      flags.push({ rule: "nutrition_treatment_claim", matched: m[0], action: "blocked" });
      return { text, flags, blocked: true };
    }
  }

  // Hand off to the shared scanner (diagnosis / prescription / condition / causation).
  const core = scanStatement(text);
  flags.push(...core.flags);
  return { text: core.text, flags, blocked: core.blocked };
}

// Cleans a list of statements: drops unrecoverable ones, accumulates flags.
export function applyNutritionGuardrails(lines: string[]): {
  lines: string[];
  flags: GuardrailFlag[];
} {
  const flags: GuardrailFlag[] = [];
  const out: string[] = [];
  for (const line of lines) {
    const r = scanNutritionStatement(line);
    flags.push(...r.flags);
    if (!r.blocked) out.push(r.text);
  }
  return { lines: out, flags };
}
