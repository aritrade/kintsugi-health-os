import type { SupabaseClient } from "@supabase/supabase-js";
import { NON_DIAGNOSTIC_DISCLAIMER, scanStatement } from "@/ai/guardrails";
import { buildCaseContent, type CaseContent } from "@/server/cases/build";

// Appointment Preparation Assistant (docs/13 §2.3): specialist-tailored prep built
// on the Case snapshot, with focus areas + suggested (non-leading) questions.

export type Specialist =
  | "gp"
  | "urologist"
  | "endocrinologist"
  | "cardiologist"
  | "sleep_specialist"
  | "psychiatrist"
  | "therapist"
  | "gynecologist";

const TEMPLATES: Record<Specialist, { label: string; focusIndices: string[]; focusLabs: string[]; questions: string[] }> = {
  gp: {
    label: "General Practitioner",
    focusIndices: ["sleep_score", "recovery_score", "bp_control", "body_composition"],
    focusLabs: ["HbA1c", "Vitamin D (25-OH)", "Hemoglobin", "TSH"],
    questions: [
      "Which of my tracked trends would you want to investigate first?",
      "Are any of my recent lab values worth rechecking, and on what timeline?",
      "Given my history, what baseline screening makes sense for me now?",
    ],
  },
  urologist: {
    label: "Urologist",
    focusIndices: ["erectile_function", "ejaculatory_control", "libido"],
    focusLabs: ["Total testosterone", "SHBG"],
    questions: [
      "Could my tracked patterns reflect vascular, hormonal, or psychological factors worth exploring?",
      "What evaluations would help clarify the patterns I'm seeing?",
    ],
  },
  endocrinologist: {
    label: "Endocrinologist",
    focusIndices: ["thyroid_symptom_load", "body_composition", "libido"],
    focusLabs: ["TSH", "Free T4", "Total testosterone", "HbA1c"],
    questions: [
      "Do my symptom trends and labs suggest anything worth monitoring more closely?",
      "How often should these hormone panels be repeated for someone like me?",
    ],
  },
  cardiologist: {
    label: "Cardiologist",
    focusIndices: ["bp_control", "recovery_score", "longevity_score"],
    focusLabs: ["LDL cholesterol", "HDL cholesterol", "Triglycerides"],
    questions: [
      "What do my blood pressure trends suggest about next steps?",
      "Which lifestyle levers have the most evidence for my lipid profile?",
    ],
  },
  sleep_specialist: {
    label: "Sleep Specialist",
    focusIndices: ["sleep_score", "recovery_score"],
    focusLabs: [],
    questions: [
      "My dry-mouth/snoring mornings cluster with lower sleep scores - is a sleep study warranted?",
      "What would help distinguish behavioral from physiological sleep issues for me?",
    ],
  },
  psychiatrist: {
    label: "Psychiatrist",
    focusIndices: ["mood_stability", "anxiety", "confidence"],
    focusLabs: ["TSH", "Vitamin D (25-OH)"],
    questions: [
      "Do my mood and anxiety trends suggest anything worth formally evaluating?",
      "How might sleep and exercise patterns be interacting with my mood?",
    ],
  },
  therapist: {
    label: "Therapist",
    focusIndices: ["mood_stability", "anxiety", "sexual_confidence"],
    focusLabs: [],
    questions: [
      "What patterns in my tracking might be useful to explore in sessions?",
      "Are there triggers visible in my data that we could work on?",
    ],
  },
  gynecologist: {
    label: "Gynecologist",
    focusIndices: ["cycle_regularity", "pcos_symptom_load", "menopause_symptom_load", "fertility_readiness"],
    focusLabs: ["TSH"],
    questions: [
      "Do my cycle and symptom patterns suggest anything worth investigating?",
      "What evaluations would help clarify what I'm tracking?",
    ],
  },
};

export interface AppointmentPrep {
  specialist: string;
  generatedAt: string;
  focusIndices: { label: string; value: number; date: string }[];
  focusLabs: { name: string; value: number; unit: string | null; status: string; date: string }[];
  questions: string[];
  openQuestions: string[];
  disclaimer: string;
}

export function specialists(): { id: Specialist; label: string }[] {
  return (Object.keys(TEMPLATES) as Specialist[]).map((id) => ({ id, label: TEMPLATES[id].label }));
}

export async function buildAppointmentPrep(
  supabase: SupabaseClient,
  userId: string,
  specialist: Specialist,
): Promise<AppointmentPrep> {
  const tpl = TEMPLATES[specialist];
  const snapshot: CaseContent = await buildCaseContent(supabase, userId, tpl.label);

  const focusIndices = snapshot.indices
    .filter((i) => tpl.focusIndices.includes(i.kind))
    .map((i) => ({ label: i.label, value: i.value, date: i.date }));

  const focusLabs = snapshot.labs
    .filter((l) => tpl.focusLabs.some((name) => l.name.toLowerCase().includes(name.toLowerCase())))
    .map((l) => ({ name: l.name, value: l.value, unit: l.unit, status: l.status, date: l.date }));

  const questions = tpl.questions.map((q) => scanStatement(q).text);

  return {
    specialist: tpl.label,
    generatedAt: new Date().toISOString(),
    focusIndices,
    focusLabs,
    questions,
    openQuestions: snapshot.openQuestions,
    disclaimer: NON_DIAGNOSTIC_DISCLAIMER,
  };
}

export function isSpecialist(s: string): s is Specialist {
  return s in TEMPLATES;
}
