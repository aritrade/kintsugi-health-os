# 09 - Type Definitions

> Canonical TypeScript types aligned 1:1 with [05-database-schema.md](05-database-schema.md). Includes the Investigation Pack plugin contract that makes new packs drop-in. Consumed across the code structure in [08-folder-structure.md](08-folder-structure.md).

These live in `types/` and are imported by both client and server. Database row types are generated from Supabase, but the domain/UI types below are hand-authored and authoritative.

---

## 1. Enums and Primitives

```ts
export type UUID = string;
export type ISODate = string;       // 'YYYY-MM-DD'
export type ISODateTime = string;   // RFC3339

export type BiologicalSex = 'male' | 'female' | 'intersex' | 'prefer_not_to_say';
export type PrivacyMode = 'standard' | 'extra_protected' | 'local_only';
export type Sensitivity = 'normal' | 'sensitive' | 'highly_sensitive';
export type LifeStage = 'childhood' | 'puberty' | 'teen' | 'adult';
export type RecordType = 'lab_report' | 'imaging_report' | 'doctor_note' | 'prescription_doc' | 'other';
export type RecordStatus = 'uploaded' | 'processing' | 'extracted' | 'reviewed' | 'failed';
export type ExperimentStatus = 'draft' | 'active' | 'completed' | 'abandoned';
export type ReportPeriod = 'weekly' | 'monthly' | 'quarterly' | 'annual';
export type AiSystem = 'detective' | 'historian' | 'research' | 'appointment_prep' | 'experiment_designer' | 'root_cause';
export type MetricKind = 'scale' | 'boolean' | 'duration' | 'count' | 'numeric' | 'text';
export type IndexKind =
  | 'libido' | 'sexual_confidence' | 'erectile_function' | 'ejaculatory_control'
  | 'sleep_score' | 'recovery_score' | 'confidence' | 'anxiety' | 'body_image'
  | 'health_momentum' | 'custom';

export type TimelineCategory =
  | 'health' | 'sexual_health' | 'sleep' | 'labs' | 'mental_health'
  | 'fitness' | 'body_composition' | 'lifestyle' | 'life_events';
export type EventSource = 'user' | 'ocr' | 'ai_historian' | 'appointment';
export type MetricQuality = 'A' | 'B' | 'C' | 'D';
```

---

## 2. Identity and Onboarding

```ts
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
  relationshipStatus?: string;
  reproductiveGoals?: string;
  privacyMode: PrivacyMode;
}
```

---

## 3. Timeline, Check-ins, Memory

```ts
export interface TimelineEvent {
  id: UUID;
  userId: UUID;
  lifeStage: LifeStage;
  title: string;
  description?: string;
  category: TimelineCategory;        // controlled vocabulary (doc 21)
  subcategory: string;               // validated against the category's registry (doc 21)
  eventDate?: ISODate;
  approxPeriod?: string;
  confidence: number;                // 0..1 placement/classification confidence (doc 21)
  sensitivity: Sensitivity;
  source: EventSource;
  metadata: Record<string, unknown>;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface Checkin {
  id: UUID;
  userId: UUID;
  checkinDate: ISODate;
  sleep: {
    bedtime?: string;
    wakeTime?: string;
    durationMin?: number;
    quality?: number;        // 1..10
    dryMouth?: boolean;
    snoring?: boolean;
    nightAwakenings?: number;
  };
  physical: { energy?: number; fatigue?: number; recovery?: number; pain?: number };
  mental: { mood?: number; anxiety?: number; stress?: number; confidence?: number };
  lifestyle: {
    ran?: boolean; strengthTrained?: boolean; walked?: boolean; steps?: number;
    waterMl?: number; alcoholUnits?: number; nicotine?: boolean; caffeineMg?: number;
  };
  symptoms: CheckinSymptom[];
  packMetrics: PackMetricEntry[];
  isComplete: boolean;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface CheckinSymptom {
  id: UUID;
  symptomName: string;
  severity?: number;
  notes?: string;
}

export interface MemoryNote {
  id: UUID;
  userId: UUID;
  title?: string;
  body: string;
  noteType: 'note' | 'symptom' | 'question' | 'observation' | 'idea' | 'appointment' | 'report';
  sensitivity: Sensitivity;
  aiSummary?: string;
  tags: string[];
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}
```

---

## 4. Vault, Labs, Indices

```ts
export interface MedicalRecord {
  id: UUID;
  userId: UUID;
  type: RecordType;
  title: string;
  storagePath: string;
  mimeType?: string;
  recordDate?: ISODate;
  status: RecordStatus;
  sensitivity: Sensitivity;
  timelineEventId?: UUID;
  createdAt: ISODateTime;
}

export interface RecordExtraction {
  id: UUID;
  recordId: UUID;
  rawText?: string;
  structured: Record<string, unknown>;
  confidence?: number;
  reviewed: boolean;
}

export interface Biomarker {
  id: UUID;
  slug: string;
  displayName: string;
  unit?: string;
  defaultRefLow?: number;
  defaultRefHigh?: number;
  category?: string;
}

export interface LabResult {
  id: UUID;
  userId: UUID;
  panelId?: UUID;
  biomarkerId?: UUID;
  customName?: string;
  value: number;
  unit?: string;
  refLow?: number;
  refHigh?: number;
  resultDate: ISODate;
  sensitivity: Sensitivity;
}

export interface DerivedIndex {
  id: UUID;
  userId: UUID;
  indexKind: IndexKind;
  indexDate: ISODate;
  value: number;             // normalized 0..100
  inputs: Record<string, number>;
}
```

---

## 5. Experiments, Correlations, Graph

```ts
export interface Experiment {
  id: UUID;
  userId: UUID;
  packId?: UUID;
  question: string;
  hypothesis: string;
  variables: Record<string, unknown>;
  metrics: string[];          // index/metric slugs measured as outcome
  durationDays: number;
  successCriteria?: string;
  status: ExperimentStatus;
  startedAt?: ISODate;
  endedAt?: ISODate;
  results?: Record<string, unknown>;
  conclusion?: string;
  confidence?: number;        // 0..1
}

export interface Correlation {
  id: UUID;
  userId: UUID;
  variableA: string;
  variableB: string;
  coefficient: number;        // -1..1
  confidence: number;         // 0..1
  sampleSize: number;
  windowStart: ISODate;
  windowEnd: ISODate;
  hypothesis?: string;
}

export interface GraphNode {
  id: UUID;
  userId: UUID;
  nodeType: string;
  label: string;
  metadata: Record<string, unknown>;
}

export interface GraphEdge {
  id: UUID;
  userId: UUID;
  sourceId: UUID;
  targetId: UUID;
  relation: 'correlates_with' | 'precedes' | 'may_influence';
  weight?: number;
  correlationId?: UUID;
}
```

---

## 6. Reports, Cases, AI

```ts
export interface Report {
  id: UUID;
  userId: UUID;
  period: ReportPeriod;
  periodStart: ISODate;
  periodEnd: ISODate;
  content: {
    trends: unknown[];
    correlations: Correlation[];
    findings: string[];
    openQuestions: string[];
    suggestedInvestigations: string[];
  };
  createdAt: ISODateTime;
}

export interface HealthCase {
  id: UUID;
  userId: UUID;
  title: string;
  specialist?: 'urologist' | 'endocrinologist' | 'cardiologist' | 'sleep_specialist' | 'psychiatrist' | 'therapist' | 'general_physician';
  content: {
    summary: string;
    timeline: TimelineEvent[];
    symptoms: string[];
    labs: LabResult[];
    trends: unknown[];
    questions: string[];
  };
  createdAt: ISODateTime;
}

export interface AiInteraction {
  id: UUID;
  userId: UUID;
  system: AiSystem;
  provider: 'claude' | 'openai';
  model: string;
  guardrailFlags: GuardrailFlag[];
  createdAt: ISODateTime;
}

export type GuardrailFlag =
  | 'diagnosis_attempt_blocked'
  | 'prescription_attempt_blocked'
  | 'medication_change_blocked'
  | 'emergency_routed'
  | 'misinformation_blocked';
```

---

## 7. AI Guardrail Types

The guardrail contract (enforced server-side, see [07-api-specifications.md](07-api-specifications.md)) is typed so every AI response is shaped consistently. Detective insight structure and rules are in [19-detective-rules.md](19-detective-rules.md); Research Assistant claims must carry evidence levels per [23-evidence-framework.md](23-evidence-framework.md).

```ts
export interface AiResponse<T = unknown> {
  system: AiSystem;
  content: T;
  observations: string[];      // what the data shows
  questions: string[];         // what to investigate next
  hypotheses?: Hypothesis[];
  disclaimers: string[];       // always includes the non-diagnostic disclaimer
  guardrailFlags: GuardrailFlag[];
  citations?: Citation[];
}

export interface Hypothesis {
  statement: string;
  supportingSignals: string[];
  confidence: number;          // 0..1
  proposedExperimentId?: UUID;
}

// Persisted Detective insight (maps to the `insights` table; auditability in doc 19).
export type InsightStage = 'observation' | 'pattern' | 'correlation' | 'hypothesis' | 'question' | 'experiment';
export type InsightStatus = 'active' | 'superseded' | 'contradicted';
export type ConfidenceLevel = 'Low' | 'Moderate' | 'High' | 'Very High';

export interface Insight {
  id: UUID;
  userId: UUID;
  stage: InsightStage;
  status: InsightStatus;
  observation: string;
  investigationQuestion?: string;
  suggestedNextStep?: Record<string, unknown>;
  // audit trace (doc 19 section 10)
  sourceMetrics: string[];
  sampleSize?: number;
  windowStart?: ISODate;
  windowEnd?: ISODate;
  confidenceLevel?: ConfidenceLevel;
  coefficient?: number;        // -1..1 when correlation-backed
  correlationId?: UUID;
  experimentId?: UUID;
  supersedesId?: UUID;
  isPositive: boolean;         // supports the anti-anxiety balance rule (doc 25)
  createdAt: ISODateTime;
}

// Vendor-independent measurement (maps to `canonical_metric_values`; doc 22).
export interface CanonicalMetricValue {
  id: UUID;
  userId: UUID;
  metric: string;              // e.g. 'sleepDurationMinutes'
  value: number;
  unit: string;                // canonical unit (doc 22)
  source: string;              // 'whoop' | 'oura' | 'manual' | 'lab' | 'ocr' | ...
  qualityLevel: MetricQuality; // A device | B lab | C user | D ocr
  capturedAt: ISODateTime;
}

export interface MomentumEvent {
  id: UUID;
  userId: UUID;
  type: string;
  label: string;
  evidence: { metrics: string[]; value?: number; dateRange?: [ISODate, ISODate] };
  occurredAt: ISODateTime;
}

export interface Citation {
  source: string;
  title: string;
  url?: string;
}
```

---

## 8. Investigation Pack Plugin Contract

This is the contract that lets new packs (Thyroid, PCOS, Fertility, Menopause...) be added without redesign. A pack is a self-describing module.

```ts
export interface PackDefinition {
  slug: string;                // 'sexual-health', 'sleep'
  name: string;
  description: string;
  version: string;

  /** Determines whether the pack is auto-enabled for a given profile. */
  isEligible(profile: Profile): boolean;

  /** Metrics this pack appends to the daily check-in. */
  metrics: PackMetricDefinition[];

  /** Indices this pack computes from its metrics + core check-ins. */
  indices: PackIndexDefinition[];

  /** Pack-specific dashboard config (cards, charts). */
  dashboard: PackDashboardConfig;

  /** Prompts the Health Detective can run for this pack. */
  investigations: PackInvestigation[];

  /** Experiment templates this pack offers. */
  experimentTemplates: ExperimentTemplate[];

  /** Sections this pack contributes to reports. */
  reportSections: PackReportSection[];
}

export interface PackMetricDefinition {
  slug: string;
  label: string;
  kind: MetricKind;
  min?: number;
  max?: number;
  sexScope?: BiologicalSex;    // undefined = all
  sensitivity: Sensitivity;
}

export interface PackIndexDefinition {
  indexKind: IndexKind;
  label: string;
  /** Pure function: given recent entries, return normalized 0..100.
   *  Formulas, normalization, and trend rules are specified in 20-index-formulas.md. */
  compute(input: IndexComputeInput): number;
}

export interface IndexComputeInput {
  checkins: Checkin[];
  metricEntries: PackMetricEntry[];
  windowDays: number;
}

export interface PackMetricEntry {
  id: UUID;
  metricSlug: string;
  entryDate: ISODate;
  valueNum?: number;
  valueBool?: boolean;
  valueText?: string;
}

export interface PackDashboardConfig {
  cards: Array<{ indexKind: IndexKind; title: string; chart: 'line' | 'bar' | 'gauge' }>;
}

export interface PackInvestigation {
  id: string;
  title: string;
  /** Variables the Root Cause Engine should correlate for this investigation. */
  correlate: [string, string][];
  promptTemplate: string;      // passed through guardrail layer
}

export interface ExperimentTemplate {
  id: string;
  question: string;
  hypothesis: string;
  variables: Record<string, unknown>;
  metrics: string[];
  defaultDurationDays: number;
  successCriteria: string;
}

export interface PackReportSection {
  id: string;
  title: string;
  build(input: { indices: DerivedIndex[]; correlations: Correlation[] }): string;
}
```

### Example - Sexual Health Pack registration (shape only)

```ts
export const sexualHealthPack: PackDefinition = {
  slug: 'sexual-health',
  name: 'Sexual Health Pack',
  description: 'Libido, erectile function, female sexual wellness, ejaculatory control.',
  version: '1.0.0',
  isEligible: () => true,      // available to all; metrics are sex-scoped
  metrics: [
    { slug: 'libido_desire', label: 'Desire', kind: 'scale', min: 1, max: 10, sensitivity: 'highly_sensitive' },
    { slug: 'morning_erection', label: 'Morning erection', kind: 'boolean', sexScope: 'male', sensitivity: 'highly_sensitive' },
    { slug: 'erection_quality', label: 'Erection quality', kind: 'scale', min: 1, max: 10, sexScope: 'male', sensitivity: 'highly_sensitive' },
    { slug: 'arousal', label: 'Arousal', kind: 'scale', min: 1, max: 10, sexScope: 'female', sensitivity: 'highly_sensitive' },
    // ...lubrication, orgasm_satisfaction, intimacy_satisfaction, latency, control...
  ],
  indices: [/* libido, sexual_confidence, erectile_function, ejaculatory_control */] as PackIndexDefinition[],
  dashboard: { cards: [{ indexKind: 'libido', title: 'Libido Index', chart: 'line' }] },
  investigations: [
    { id: 'sleep-vs-libido', title: 'Does sleep affect libido?', correlate: [['sleep_score', 'libido']], promptTemplate: '...' },
  ],
  experimentTemplates: [],
  reportSections: [],
};
```

All pack metrics that are sexual/reproductive are marked `highly_sensitive`, which routes them through the extra-protection path in [10-security-design.md](10-security-design.md).
