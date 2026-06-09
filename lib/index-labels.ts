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
  custom: "Custom Index",
};
