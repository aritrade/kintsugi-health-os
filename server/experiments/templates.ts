import type { ExperimentTemplate } from "@/types";

// Experiment templates the Detective can suggest and the user can start.
// Hypotheses use possibility language only (docs/19 section 9).
export const EXPERIMENT_TEMPLATES: ExperimentTemplate[] = [
  {
    id: "exercise-vs-libido",
    title: "Exercise & libido",
    question: "Does exercising relate to higher libido for you?",
    hypothesis: "Exercising may be associated with a higher Libido Index.",
    variables: { intervention: "exercise", schedule: "most days" },
    metrics: ["libido", "exercised"],
    durationDays: 14,
    successCriteria: "A noticeable difference in Libido Index between exercise and non-exercise days.",
  },
  {
    id: "caffeine-vs-sleep",
    title: "Caffeine & sleep quality",
    question: "Does cutting afternoon caffeine relate to better sleep quality?",
    hypothesis: "Lower caffeine intake may be associated with higher sleep quality.",
    variables: { intervention: "no caffeine after 2pm" },
    metrics: ["sleep_quality", "caffeine_mg"],
    durationDays: 14,
    successCriteria: "Higher average sleep quality during the low-caffeine period.",
  },
  {
    id: "alcohol-vs-sleep",
    title: "Alcohol & sleep quality",
    question: "Does reducing alcohol relate to better sleep quality?",
    hypothesis: "Lower alcohol intake may be associated with higher sleep quality.",
    variables: { intervention: "no alcohol on weeknights" },
    metrics: ["sleep_quality", "alcohol_units"],
    durationDays: 14,
    successCriteria: "Higher average sleep quality during the low-alcohol period.",
  },
  {
    id: "sleep-vs-energy",
    title: "Sleep & next-day energy",
    question: "Does sleep quality relate to your next-day energy?",
    hypothesis: "Higher sleep quality may be associated with higher daytime energy.",
    variables: { intervention: "consistent bedtime" },
    metrics: ["sleep_quality", "energy"],
    durationDays: 14,
    successCriteria: "Higher average energy during higher-sleep-quality nights.",
  },
];

export function getTemplate(id: string): ExperimentTemplate | undefined {
  return EXPERIMENT_TEMPLATES.find((t) => t.id === id);
}
