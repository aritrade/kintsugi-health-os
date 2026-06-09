import { scanStatement, NON_DIAGNOSTIC_DISCLAIMER } from "@/ai/guardrails";

// Research Assistant (docs/13 §2.3): evidence-based explanations with citations.
// Deterministic, curated knowledge base graded with the evidence framework
// (docs/23). Possibility language only - never diagnostic or prescriptive.

export type EvidenceLevel = "Strong" | "Moderate" | "Emerging" | "Anecdotal";

export interface ResearchEntry {
  topic: string;
  keywords: string[];
  summary: string;
  evidenceLevel: EvidenceLevel;
  citations: { source: string; note: string }[];
}

const KB: ResearchEntry[] = [
  {
    topic: "Sleep and libido",
    keywords: ["sleep", "libido", "desire", "testosterone", "sex drive"],
    summary:
      "Short or fragmented sleep is associated with lower next-day sexual desire in many studies, partly via hormonal and mood pathways. Improving sleep regularity is a common lever people explore.",
    evidenceLevel: "Moderate",
    citations: [
      { source: "J Clin Endocrinol Metab (2011)", note: "Sleep restriction and daytime testosterone in healthy men." },
      { source: "J Sex Med (2015)", note: "Sleep duration and next-day female sexual desire." },
    ],
  },
  {
    topic: "HRV and recovery",
    keywords: ["hrv", "heart rate variability", "recovery", "readiness", "stress"],
    summary:
      "Higher heart rate variability tends to track better autonomic recovery and lower acute stress. HRV is highly individual, so trends over your own baseline are more meaningful than absolute numbers.",
    evidenceLevel: "Strong",
    citations: [{ source: "Front Physiol (2017)", note: "HRV as a marker of autonomic recovery." }],
  },
  {
    topic: "Alcohol and sleep",
    keywords: ["alcohol", "drinking", "sleep", "awakenings"],
    summary:
      "Alcohol can shorten sleep latency but commonly fragments the second half of the night and suppresses REM, which many people experience as less restorative sleep.",
    evidenceLevel: "Strong",
    citations: [{ source: "Alcohol Clin Exp Res (2013)", note: "Meta-analysis of alcohol's effect on sleep." }],
  },
  {
    topic: "Caffeine and sleep",
    keywords: ["caffeine", "coffee", "sleep", "latency"],
    summary:
      "Caffeine has a long half-life; consumed within ~6 hours of bedtime it can reduce total sleep time for sensitive individuals. Timing experiments often help clarify personal sensitivity.",
    evidenceLevel: "Moderate",
    citations: [{ source: "J Clin Sleep Med (2013)", note: "Caffeine at 0, 3, 6 hours before bed." }],
  },
  {
    topic: "Exercise and mood",
    keywords: ["exercise", "running", "mood", "anxiety", "depression", "training"],
    summary:
      "Regular moderate exercise is associated with improved mood and reduced anxiety symptoms for many people, with effect sizes comparable to some other lifestyle interventions.",
    evidenceLevel: "Strong",
    citations: [{ source: "JAMA Psychiatry (2022)", note: "Physical activity and incident depression." }],
  },
  {
    topic: "Vitamin D",
    keywords: ["vitamin d", "deficiency", "fatigue", "mood"],
    summary:
      "Low vitamin D is common and sometimes associated with fatigue and low mood, though causal effects of supplementation are mixed. Lab confirmation before and after any change is sensible.",
    evidenceLevel: "Emerging",
    citations: [{ source: "BMJ (2014)", note: "Vitamin D and health outcomes umbrella review." }],
  },
  {
    topic: "Sodium and blood pressure",
    keywords: ["sodium", "salt", "blood pressure", "hypertension", "bp"],
    summary:
      "For many people, higher dietary sodium is associated with higher blood pressure, and reductions can modestly lower it. Individual salt-sensitivity varies, so self-tracking BP around dietary changes can be informative.",
    evidenceLevel: "Strong",
    citations: [{ source: "Cochrane (2020)", note: "Effect of sodium reduction on blood pressure." }],
  },
  {
    topic: "Waist circumference and metabolic health",
    keywords: ["waist", "body fat", "weight", "metabolic", "composition"],
    summary:
      "Waist circumference is associated with metabolic risk markers, sometimes more closely than weight alone. Trends in your own measurements over time are the most useful signal.",
    evidenceLevel: "Strong",
    citations: [{ source: "Nat Rev Endocrinol (2020)", note: "Waist circumference consensus statement." }],
  },
];

export interface ResearchResult {
  query: string;
  matched: ResearchEntry | null;
  summary: string | null;
  evidenceLevel: EvidenceLevel | null;
  citations: { source: string; note: string }[];
  related: string[];
  disclaimer: string;
}

export function research(query: string): ResearchResult {
  const q = query.toLowerCase();
  const matched =
    KB.find((e) => e.keywords.some((k) => q.includes(k))) ??
    KB.find((e) => e.topic.toLowerCase().split(" ").some((w) => q.includes(w))) ??
    null;

  const summary = matched ? scanStatement(matched.summary).text : null;
  return {
    query,
    matched,
    summary,
    evidenceLevel: matched?.evidenceLevel ?? null,
    citations: matched?.citations ?? [],
    related: KB.map((e) => e.topic),
    disclaimer: NON_DIAGNOSTIC_DISCLAIMER,
  };
}

export function researchTopics(): string[] {
  return KB.map((e) => e.topic);
}
