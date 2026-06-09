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
