// AI guardrail pipeline. Enforces the "MUST NEVER" rules (docs/01 + docs/07
// section 11 + docs/19). Pure, unit-testable functions; no I/O here.
//
// The Detective acts as a scientist/investigator, never a doctor or coach.

import type { AiResponse, GuardrailFlag } from "@/types";

export const DETECTIVE_SYSTEM_PROMPT = `You are the Health Detective inside a personal health investigation tool.
You act as a scientist, investigator, and researcher - NEVER a doctor, clinician, or coach.

You MAY: observe, describe, count, correlate, explain mechanisms generally, investigate,
organize, hypothesize using possibility language, and design experiments.

You MUST NEVER: diagnose, name a condition the user "has", prescribe, recommend starting,
stopping, or changing any medication or dose, state causation ("causes", "due to"), assign
severity, or replace a physician.

Frame every finding as observations + questions + optional hypotheses with confidence.
Use possibility language only ("may be associated with", "appears related to", "could be
worth investigating"). Quantify observations (n of m, over what window). Never invent data.`;

export const NON_DIAGNOSTIC_DISCLAIMER =
  "This is an observation from your own data, not a diagnosis. Discuss any concerns with a healthcare professional.";

export const ESCALATION_WORDING =
  "This observation may warrant discussion with a healthcare professional.";

// --- Emergency routing (docs/07 section 11.5, docs/19 section 8) ---

const EMERGENCY_PATTERNS: RegExp[] = [
  /\bchest pain\b/i,
  /\b(can'?t|cannot|trouble|difficulty) breath(e|ing)\b/i,
  /\bshortness of breath\b/i,
  /\b(heart attack|cardiac arrest)\b/i,
  /\bstroke\b/i,
  /\b(suicid|kill myself|end my life|want to die)\w*/i,
  /\bself[-\s]?harm\b/i,
  /\boverdose\b/i,
  /\b(severe|heavy) bleeding\b/i,
  /\bunconscious\b/i,
  /\bseizure\b/i,
  /\bsudden (numbness|weakness|vision loss)\b/i,
];

export function detectEmergency(text: string | undefined | null): boolean {
  if (!text) return false;
  return EMERGENCY_PATTERNS.some((re) => re.test(text));
}

export function emergencyResponse(): AiResponse {
  return {
    system: "detective",
    emergency: true,
    observations: [],
    questions: [],
    hypotheses: [],
    guardrailFlags: [{ rule: "emergency", matched: "emergency_language", action: "blocked" }],
    disclaimers: [
      "It sounds like this could be urgent. If you are experiencing a medical emergency, call your local emergency number or go to the nearest emergency department now.",
      "If you are in crisis or thinking about harming yourself, contact a crisis line or emergency services immediately. You are not alone.",
    ],
  };
}

// --- Banned-output detection (docs/07 section 11.3, docs/19 sections 1, 9) ---

// Causal phrasing -> softened to association (recoverable reframe).
const CAUSAL_REFRAMES: { re: RegExp; replace: string }[] = [
  { re: /\bis caused by\b/gi, replace: "may be associated with" },
  { re: /\bare caused by\b/gi, replace: "may be associated with" },
  { re: /\bcaused by\b/gi, replace: "may be associated with" },
  { re: /\bcausing\b/gi, replace: "possibly associated with" },
  { re: /\bcauses\b/gi, replace: "may be associated with" },
  { re: /\bis due to\b/gi, replace: "may be related to" },
  { re: /\bdue to\b/gi, replace: "possibly related to" },
  { re: /\bbecause of\b/gi, replace: "possibly related to" },
  { re: /\bresults in\b/gi, replace: "may be associated with" },
  { re: /\bleads to\b/gi, replace: "may be associated with" },
];

// Diagnostic / prescriptive phrasing -> not recoverable, the statement is dropped.
const DIAGNOSIS_PATTERNS: RegExp[] = [
  /\byou (probably |likely |may |might )?have\b/i,
  /\byou'?re (probably |likely )?(suffering|diagnosed)\b/i,
  /\bdiagnos(is|e|ed|ing)\b/i,
  /\bsuffering from\b/i,
  /\byou have (a |an )?\w+ (disease|disorder|syndrome|deficiency|infection|condition)\b/i,
  /\bit'?s (a |an )?\w*\s?(disease|disorder|syndrome|deficiency|infection)\b/i,
  /\b(sleep apnea|depression|diabetes|hypogonadism|hypothyroidism|hyperthyroidism|anemia|cancer|ed|erectile dysfunction)\b is (likely|probable|present)/i,
];

// Named medical conditions must not appear in observations/hypotheses (docs/19
// section 3). Multiword/specific names only - deliberately excludes tracked
// metric labels like "anxiety"/"stress"/"pain" to avoid false positives on our
// own legitimate observations.
const CONDITION_PATTERNS: RegExp[] = [
  /\bsleep apnea\b/i,
  /\banxiety disorder\b/i,
  /\b(major )?depression\b/i,
  /\bdiabetes\b/i,
  /\bhypogonadism\b/i,
  /\bhypo?thyroidism\b/i,
  /\bhyperthyroidism\b/i,
  /\banemia\b/i,
  /\b(prostate |breast )?cancer\b/i,
  /\berectile dysfunction\b/i,
  /\binsomnia\b/i,
  /\bapnoea\b/i,
];

const PRESCRIPTION_PATTERNS: RegExp[] = [
  /\bprescrib(e|ed|ing)\b/i,
  /\b(start|stop|increase|decrease|change|discontinue) (taking |your )?(the )?(medication|meds|dose|dosage|pill)\b/i,
  /\b(take|start) \d+\s?(mg|mcg|ml|units?)\b/i,
  /\byou should (take|start|stop)\b/i,
  /\b\d+\s?mg of\b/i,
  /\b(supplement with|begin a course of)\b/i,
];

export interface ScanResult {
  text: string;
  flags: GuardrailFlag[];
  blocked: boolean; // true => statement must be dropped (unrecoverable)
}

// Scans and (where possible) reframes a single statement.
export function scanStatement(input: string): ScanResult {
  const flags: GuardrailFlag[] = [];
  let text = input;

  for (const re of DIAGNOSIS_PATTERNS) {
    const m = text.match(re);
    if (m) {
      flags.push({ rule: "diagnosis", matched: m[0], action: "blocked" });
      return { text, flags, blocked: true };
    }
  }
  for (const re of PRESCRIPTION_PATTERNS) {
    const m = text.match(re);
    if (m) {
      flags.push({ rule: "prescription", matched: m[0], action: "blocked" });
      return { text, flags, blocked: true };
    }
  }
  for (const re of CONDITION_PATTERNS) {
    const m = text.match(re);
    if (m) {
      flags.push({ rule: "condition", matched: m[0], action: "blocked" });
      return { text, flags, blocked: true };
    }
  }
  for (const { re, replace } of CAUSAL_REFRAMES) {
    if (re.test(text)) {
      const m = text.match(re);
      if (m) flags.push({ rule: "causation", matched: m[0], action: "reframed" });
      text = text.replace(re, replace);
    }
  }
  return { text, flags, blocked: false };
}

// Scans a full AiResponse: reframes causal language, drops unrecoverable
// statements, and accumulates guardrail flags. Returns the cleaned response.
export function applyGuardrails(resp: AiResponse): AiResponse {
  const flags: GuardrailFlag[] = [...resp.guardrailFlags];

  const cleanList = (list: string[]): string[] => {
    const out: string[] = [];
    for (const s of list) {
      const r = scanStatement(s);
      flags.push(...r.flags);
      if (!r.blocked) out.push(r.text);
    }
    return out;
  };

  const observations = cleanList(resp.observations);
  const questions = cleanList(resp.questions);
  const hypotheses = resp.hypotheses
    .map((h) => {
      const r = scanStatement(h.statement);
      flags.push(...r.flags);
      return r.blocked ? null : { ...h, statement: r.text };
    })
    .filter((h): h is NonNullable<typeof h> => h !== null);

  const disclaimers = resp.disclaimers.includes(NON_DIAGNOSTIC_DISCLAIMER)
    ? resp.disclaimers
    : [...resp.disclaimers, NON_DIAGNOSTIC_DISCLAIMER];

  return { ...resp, observations, questions, hypotheses, disclaimers, guardrailFlags: flags };
}
