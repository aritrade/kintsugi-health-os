import type { Sensitivity, TimelineCategory } from "@/types";

// Controlled timeline vocabulary. Source of truth: docs/21-timeline-taxonomy.md section 1.
// Categories/subcategories are validated against this registry (not hard-coded columns),
// so packs can extend it without a schema change.
export interface CategorySpec {
  category: TimelineCategory;
  label: string;
  subcategories: string[];
  defaultSensitivity: Sensitivity;
}

export const TIMELINE_TAXONOMY: CategorySpec[] = [
  { category: "health", label: "Health", subcategories: ["Symptoms", "Diagnoses", "Procedures", "Medications"], defaultSensitivity: "normal" },
  { category: "sexual_health", label: "Sexual Health", subcategories: ["Libido Changes", "Erectile Function", "Fertility", "Relationship Events"], defaultSensitivity: "highly_sensitive" },
  { category: "sleep", label: "Sleep", subcategories: ["Sleep Problems", "Sleep Improvements", "Sleep Studies"], defaultSensitivity: "normal" },
  { category: "labs", label: "Labs", subcategories: ["Blood Work", "Hormones", "Imaging"], defaultSensitivity: "sensitive" },
  { category: "mental_health", label: "Mental Health", subcategories: ["Anxiety", "Depression", "Therapy", "Stress"], defaultSensitivity: "sensitive" },
  { category: "fitness", label: "Fitness", subcategories: ["Running", "Strength Training", "Recovery Milestones"], defaultSensitivity: "normal" },
  { category: "body_composition", label: "Body Composition", subcategories: ["Weight Changes", "Waist Changes", "Body Fat"], defaultSensitivity: "normal" },
  { category: "lifestyle", label: "Lifestyle", subcategories: ["Smoking", "Alcohol", "Diet Changes"], defaultSensitivity: "normal" },
  { category: "life_events", label: "Life Events", subcategories: ["Relationships", "Marriage", "Career Changes", "Relocation", "Major Stressors"], defaultSensitivity: "normal" },
];

const BY_CATEGORY = new Map(TIMELINE_TAXONOMY.map((c) => [c.category, c]));

export const CATEGORY_LABELS: Record<TimelineCategory, string> = Object.fromEntries(
  TIMELINE_TAXONOMY.map((c) => [c.category, c.label]),
) as Record<TimelineCategory, string>;

export function isValidClassification(category: string, subcategory: string): boolean {
  const spec = BY_CATEGORY.get(category as TimelineCategory);
  return !!spec && spec.subcategories.includes(subcategory);
}

export function defaultSensitivityFor(category: TimelineCategory): Sensitivity {
  return BY_CATEGORY.get(category)?.defaultSensitivity ?? "normal";
}

export const LIFE_STAGES = ["adult", "teen", "puberty", "childhood"] as const;
export const LIFE_STAGE_LABELS: Record<(typeof LIFE_STAGES)[number], string> = {
  adult: "Adult",
  teen: "Teen",
  puberty: "Puberty",
  childhood: "Childhood",
};
