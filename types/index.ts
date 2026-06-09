// Canonical domain types for Kintsugi Health OS.
// Source of truth: docs/09-type-definitions.md (post-validation).

export type UUID = string;
export type ISODate = string; // 'YYYY-MM-DD'
export type ISODateTime = string; // RFC3339

export type BiologicalSex = "male" | "female" | "intersex" | "prefer_not_to_say";
export type PrivacyMode = "standard" | "extra_protected" | "local_only";
export type Sensitivity = "normal" | "sensitive" | "highly_sensitive";
export type LifeStage = "childhood" | "puberty" | "teen" | "adult";
export type RecordType =
  | "lab_report"
  | "imaging_report"
  | "doctor_note"
  | "prescription_doc"
  | "other";
export type RecordStatus =
  | "uploaded"
  | "processing"
  | "extracted"
  | "reviewed"
  | "failed";
export type ExperimentStatus = "draft" | "active" | "completed" | "abandoned";
export type ReportPeriod = "weekly" | "monthly" | "quarterly" | "annual";
export type AiSystem =
  | "detective"
  | "historian"
  | "research"
  | "appointment_prep"
  | "experiment_designer"
  | "root_cause";
export type MetricKind = "scale" | "boolean" | "duration" | "count" | "numeric" | "text";
export type IndexKind =
  | "libido"
  | "sexual_confidence"
  | "erectile_function"
  | "ejaculatory_control"
  | "sleep_score"
  | "recovery_score"
  | "confidence"
  | "anxiety"
  | "body_image"
  | "health_momentum"
  | "custom";
export type TimelineCategory =
  | "health"
  | "sexual_health"
  | "sleep"
  | "labs"
  | "mental_health"
  | "fitness"
  | "body_composition"
  | "lifestyle"
  | "life_events";
export type EventSource = "user" | "ocr" | "ai_historian" | "appointment";
export type MetricQuality = "A" | "B" | "C" | "D";

export interface Profile {
  id: UUID;
  userId: UUID;
  displayName?: string;
  biologicalSex: BiologicalSex;
  genderIdentity?: string;
  sexualOrientation?: string;
  dateOfBirth?: ISODate;
  ageYears?: number;
  relationshipStatus?: string;
  reproductiveGoals?: string;
  privacyMode: PrivacyMode;
  onboardingCompleted: boolean;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface OnboardingInput {
  biologicalSex: BiologicalSex;
  genderIdentity?: string;
  sexualOrientation?: string;
  dateOfBirth?: ISODate;
  ageYears?: number;
  relationshipStatus?: string;
  reproductiveGoals?: string;
  privacyMode: PrivacyMode;
}

export interface PackSummary {
  slug: string;
  name: string;
  description: string;
  enabled: boolean;
  activatedBy: "system" | "user";
}

export interface TimelineEvent {
  id: UUID;
  userId: UUID;
  lifeStage: LifeStage;
  title: string;
  description?: string;
  category: TimelineCategory;
  subcategory: string;
  eventDate?: ISODate;
  approxPeriod?: string;
  confidence: number;
  sensitivity: Sensitivity;
  source: EventSource;
  metadata: Record<string, unknown>;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface DerivedIndex {
  id: UUID;
  userId: UUID;
  indexKind: IndexKind;
  indexSlug: string;
  indexDate: ISODate;
  value: number; // normalized 0..100
  inputs: Record<string, number>;
}

// --- Health Detective + Experiments (docs/19, docs/07 section 11) ---

export type InsightStage =
  | "observation"
  | "pattern"
  | "correlation"
  | "hypothesis"
  | "question"
  | "experiment";
export type InsightStatus = "active" | "superseded" | "contradicted";
export type ConfidenceLevel = "Low" | "Moderate" | "High" | "Very High";

export interface GuardrailFlag {
  rule: string; // e.g. "diagnosis", "prescription", "causation"
  matched: string; // the offending fragment (for audit)
  action: "reframed" | "blocked";
}

export interface Hypothesis {
  statement: string; // possibility language only (docs/19 section 9)
  confidence: number; // 0..1
  supportingSignals: string[];
}

export interface SuggestedNextStep {
  type: "experiment" | "observation";
  templateId?: string;
  durationDays?: number;
  label?: string;
}

// Canonical 5-part Detective insight (docs/19 section 7).
export interface Insight {
  id: UUID;
  stage: InsightStage;
  status: InsightStatus;
  observation: string;
  investigationQuestion?: string;
  suggestedNextStep: SuggestedNextStep;
  sourceMetrics: string[];
  sampleSize?: number;
  windowStart?: ISODate;
  windowEnd?: ISODate;
  confidenceLevel?: ConfidenceLevel;
  coefficient?: number;
  isPositive: boolean;
  createdAt: ISODateTime;
}

// Unified AI response envelope (docs/07 section 10).
export interface AiResponse {
  system: AiSystem;
  observations: string[];
  questions: string[];
  hypotheses: Hypothesis[];
  disclaimers: string[];
  guardrailFlags: GuardrailFlag[];
  emergency?: boolean;
}

export interface Correlation {
  id: UUID;
  variableA: string;
  variableB: string;
  coefficient: number;
  confidence: ConfidenceLevel;
  sampleSize: number;
  windowStart: ISODate;
  windowEnd: ISODate;
  hypothesis?: string;
}

export interface ExperimentTemplate {
  id: string;
  title: string;
  question: string;
  hypothesis: string; // possibility language
  variables: Record<string, unknown>;
  metrics: string[]; // tracked metric/index slugs
  durationDays: number;
  successCriteria: string;
}

export interface Experiment {
  id: UUID;
  question: string;
  hypothesis: string;
  variables: Record<string, unknown>;
  metrics: string[];
  durationDays: number;
  successCriteria?: string;
  status: ExperimentStatus;
  startedAt?: ISODate;
  endedAt?: ISODate;
  results?: Record<string, unknown>;
  conclusion?: string;
  confidence?: number;
  createdAt: ISODateTime;
}
