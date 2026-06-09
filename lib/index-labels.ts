import type { IndexKind } from "@/types";

// Human labels for derived indices shown on dashboards. See docs/20-index-formulas.md.
export const INDEX_LABELS: Record<IndexKind, string> = {
  libido: "Libido Index",
  sexual_confidence: "Sexual Confidence",
  erectile_function: "Erectile Function",
  ejaculatory_control: "Ejaculatory Control",
  sleep_score: "Sleep Score",
  recovery_score: "Recovery Score",
  confidence: "Confidence",
  anxiety: "Anxiety Index",
  body_image: "Body Image",
  health_momentum: "Health Momentum",
  body_composition: "Body Composition",
  thyroid_symptom_load: "Thyroid Symptom Load",
  bp_control: "Blood Pressure Control",
  cycle_regularity: "Cycle Regularity",
  pcos_symptom_load: "PCOS Symptom Load",
  fertility_readiness: "Fertility Readiness",
  menopause_symptom_load: "Menopause Symptom Load",
  energy_stability: "Energy Stability",
  mood_stability: "Mood Stability",
  longevity_score: "Longevity Score",
  custom: "Custom Index",
};
