# 03 - User Journeys

> Companion to [02-user-personas.md](02-user-personas.md). Each journey maps to features in [01-prd.md](01-prd.md) and screens in [11-wireframes.md](11-wireframes.md).

---

## Journey 1 - Onboarding to Pack Activation

A new user establishes identity context, and the system dynamically enables relevant Investigation Packs.

```mermaid
flowchart TD
    Start([User signs up]) --> Auth[Supabase Auth - email or OAuth]
    Auth --> Consent[Consent + privacy mode choice]
    Consent --> Profile[Collect biological sex, age, relationship status, reproductive goals]
    Profile --> Optional[Optional - gender identity, sexual orientation]
    Optional --> Engine{Pack eligibility engine}
    Engine -->|male| MaleMetrics[Enable erectile + ejaculatory metrics in Sexual Health Pack]
    Engine -->|female| FemaleMetrics[Enable female sexual wellness metrics]
    Engine --> SleepPack[Enable Sleep Pack - all users]
    MaleMetrics --> Baseline[Start 90-day protocol - Phase 1 baseline]
    FemaleMetrics --> Baseline
    SleepPack --> Baseline
    Baseline --> Home([Dashboard])
```

**Key rules:** privacy mode (standard / extra-protected / local-only) is chosen up front and affects storage (see [10-security-design.md](10-security-design.md)). Pack activation is driven by onboarding attributes but always user-overridable.

---

## Journey 2 - Daily Check-in Loop

The core habit. Designed to take under 90 seconds, mobile-first.

```mermaid
flowchart LR
    Notify([Daily reminder]) --> Open[Open check-in]
    Open --> Sleep[Sleep block - bedtime, wake, quality, dry mouth, snoring, awakenings]
    Sleep --> Physical[Physical - energy, fatigue, recovery, pain]
    Physical --> Mental[Mental - mood, anxiety, stress, confidence]
    Mental --> Lifestyle[Lifestyle - exercise, steps, water, alcohol, nicotine, caffeine]
    Lifestyle --> Symptoms[Custom symptoms]
    Symptoms --> Pack[Active pack metrics - e.g. libido, morning erection]
    Pack --> Save[(Save check-in)]
    Save --> Indices[Recompute daily indices]
    Indices --> Detective{New pattern detected?}
    Detective -->|yes| Nudge[Detective surfaces an observation]
    Detective -->|no| Done([Done])
    Nudge --> Done
```

**Key rules:** partial check-ins allowed; offline writes queue and sync later (see [10-security-design.md](10-security-design.md)). Indices are recomputed server-side on save.

---

## Journey 3 - Lab Upload to OCR to Timeline Placement

```mermaid
flowchart TD
    Upload[Upload PDF or photo to Vault] --> Store[(Encrypted storage)]
    Store --> OCR[OCR + structured extraction]
    OCR --> Review[User reviews extracted biomarkers]
    Review -->|correct| Confirm[Confirm values + test date]
    Review -->|wrong| Edit[Edit values]
    Edit --> Confirm
    Confirm --> Normalize[Normalize against reference ranges]
    Normalize --> Place[Place on timeline at test date]
    Place --> Trend[Update lab trend charts]
    Trend --> Compare[Historical comparison available]
```

**Key rules:** OCR is assistive, never authoritative - the user confirms before values are trusted. Lab reference ranges are normalized so values from different labs are comparable (matters for P2/P4).

---

## Journey 4 - Pattern to Hypothesis to Experiment (Health Detective)

The flagship investigative loop.

```mermaid
flowchart TD
    Data[(Accumulated check-ins, labs, timeline)] --> Scan[Detective scans for patterns]
    Scan --> Obs["Observation - e.g. dry mouth 24 of 30 mornings"]
    Obs --> Ask[Detective asks - investigate sleep quality?]
    Ask -->|user accepts| Hypo[Form hypothesis - poor sleep drives dry mouth]
    Hypo --> Design[Experiment Designer builds N-of-1 experiment]
    Design --> Run[User runs experiment - variables, duration, metrics]
    Run --> Collect[Daily check-ins feed experiment]
    Collect --> Analyze[AI analyzes outcome vs success criteria]
    Analyze --> Conclude[Conclusion + confidence score]
    Conclude --> Next{Next investigation?}
    Next -->|yes| Scan
    Next -->|no| Log[Save finding to case + knowledge graph]
```

**Guardrail:** the Detective frames everything as observations and questions, never diagnoses. Conclusions report correlation and confidence, not causation or disease (see [07-api-specifications.md](07-api-specifications.md)).

---

## Journey 5 - Case Builder to Doctor Appointment

```mermaid
flowchart LR
    Trigger([Appointment upcoming]) --> Select[Choose specialist type]
    Select --> Assemble[Appointment Prep assembles - summary, timeline, labs, trends, questions]
    Assemble --> Tailor[Tailor to specialist - urologist vs endocrinologist etc]
    Tailor --> Review[User edits + adds concerns]
    Review --> Export[Export Case - PDF / Markdown / JSON]
    Export --> Visit([Use in appointment])
    Visit --> Capture[Capture appointment notes back into Memory]
    Capture --> Timeline[New events placed on timeline]
```

**Key rules:** the case is user-owned and editable; export formats are PDF (for clinicians), Markdown (for notes), JSON (for portability).

---

## Journey 6 - The 90-Day Investigation Protocol Arc

```mermaid
flowchart LR
    subgraph P1 [Phase 1 - Days 1-30]
        Observe[Observe only - build baseline]
    end
    subgraph P2 [Phase 2 - Days 31-60]
        Experiment[Run targeted experiments]
    end
    subgraph P3 [Phase 3 - Days 61-90]
        Analyze[Deep analysis - findings, hypotheses, next steps]
    end
    Observe --> Experiment --> Analyze --> Report[Quarterly report + Case]
```

Weekly reports run throughout (MVP). The protocol is the primary retention arc for User #1 and early adopters.

---

## Cross-Journey Notes

- Every journey writes to the **Health Timeline** and feeds the **Knowledge Graph**.
- Every AI touchpoint passes through the shared **guardrail layer**.
- Every screen is **mobile-first** and works **offline** with later sync.
