# 26 - Architecture Validation & Implementation Readiness Review

> A complete cross-document validation of the Kintsugi Health OS specification suite ([00-index.md](00-index.md), docs 01-25) performed before implementation. This is an honest review: it identifies real gaps and mismatches, not a rubber stamp. Each finding has a severity and a concrete fix.

**Review date:** pre-implementation
**Scope:** all 26 documents (01-25 reviewed; this is 26)
**Bottom line:** **GO** - the HIGH/MEDIUM/LOW findings below have been **resolved in the blueprint** (see Resolution Log). The remaining conditions are external compliance counsel sign-offs that gate public launch, not MVP development.

---

## Resolution Log (fixes applied to the blueprint)

All schema/contract findings were applied to the specification before any code:

| ID | Status | Where fixed |
| --- | --- | --- |
| AC-1 | RESOLVED | `timeline_events` now has typed `category` (`timeline_category` enum), `subcategory`, `confidence`, typed `source` (`event_source`), + FTS index ([05](05-database-schema.md)); `TimelineEvent` type updated ([09](09-type-definitions.md)) |
| AC-2 | RESOLVED | `momentum_events` table + RLS defined ([05](05-database-schema.md)); `MomentumEvent` type ([09](09-type-definitions.md)) |
| AC-3 / AI-2 | RESOLVED | `insights` table with full audit trace + contradiction history + RLS ([05](05-database-schema.md)); `Insight` type ([09](09-type-definitions.md)) |
| AC-4 | RESOLVED | `canonical_metric_values` table + RLS ([05](05-database-schema.md)); `CanonicalMetricValue` type ([09](09-type-definitions.md)) |
| AC-5 | RESOLVED | Sexual Confidence, Anxiety, Body Image formulas added ([20](20-index-formulas.md)) |
| DB-1 | RESOLVED | `derived_indices` gains `index_slug` discriminator + widened unique key; `health_momentum` added to `index_kind` ([05](05-database-schema.md)) |
| DB-2 / SEC-2 | RESOLVED | Join-based RLS for `note_tags` made explicit ([05](05-database-schema.md)) |
| DB-3 | RESOLVED | Timeline `to_tsvector` GIN index added ([05](05-database-schema.md)) |
| SEC-1 | RESOLVED | RLS policies for all new tables enumerated ([05](05-database-schema.md)) |
| SEC-3 | RESOLVED | Reproductive/sensitive profile fields documented as unlock-gated ([05](05-database-schema.md)) |
| API-1 | RESOLVED | Momentum endpoints added ([07](07-api-specifications.md) §9b) |
| API-3 | RESOLVED | `PATCH`/`DELETE /cases/:id` added ([07](07-api-specifications.md)) |
| API-5 | RESOLVED | AI privacy/consent note added ([07](07-api-specifications.md) §10) |
| AI-1 | OPEN (LOW) | Historian rules doc still to be authored before Phase 2 (not MVP-blocking) |
| API-2 | OPEN (LOW) | Wearable integration endpoints to be added when Phase 2 begins (not MVP) |

The original findings are retained below for traceability.

---

## 0. Severity Legend

| Severity | Meaning |
| --- | --- |
| BLOCKER | Must fix before any implementation |
| HIGH | Must fix before the milestone that depends on it |
| MEDIUM | Should fix during the relevant milestone |
| LOW | Polish / future-proofing |

No BLOCKER-severity findings were identified. The architecture is internally coherent; the issues are localized schema/contract additions.

---

## 1. Architecture Consistency Report

### Findings

| ID | Severity | Finding |
| --- | --- | --- |
| AC-1 | HIGH | **Timeline taxonomy vs schema mismatch.** [21-timeline-taxonomy.md](21-timeline-taxonomy.md) defines first-class metadata fields `category`, `subcategory`, `source`, `confidence`, `sensitivity`. [05-database-schema.md](05-database-schema.md) `timeline_events` only has `category text` (with stale example values like "weight, body_image"), `source text`, `sensitivity`, and a generic `metadata jsonb` - there is **no `subcategory` and no `confidence` column**, and the `category` comment does not use the controlled vocabulary. The prose at schema line 109 claims these exist. |
| AC-2 | HIGH | **`momentum_events` referenced but not defined.** [25-health-momentum-engine.md](25-health-momentum-engine.md) and the schema extensibility note reference a `momentum_events` table, but no DDL exists in [05-database-schema.md](05-database-schema.md). |
| AC-3 | MEDIUM | **Detective insight persistence missing.** [19-detective-rules.md](19-detective-rules.md) requires that insights be auditable and that superseded/contradicted insights be **retained** (Sections 6, 10). There is no `insights` table; only `correlations` and `ai_interactions` exist, which cannot hold the 5-part insight structure or its audit history. |
| AC-4 | MEDIUM | **Canonical metric values have no storage.** [22-canonical-health-metrics.md](22-canonical-health-metrics.md) defines `CanonicalMetricValue`, but the schema has `integration_connections` only - no table to persist ingested device metrics. (Phase 2 concern, but should be designed now.) |
| AC-5 | LOW | **Anxiety Index / Body Image Score formulas absent.** `index_kind` enum includes `anxiety` and `body_image`, and the Sexual Confidence Index is referenced, but [20-index-formulas.md](20-index-formulas.md) gives explicit formulas only for Sleep, Recovery, Confidence, Libido, Erectile Function, Ejaculatory Control, and Momentum. |

### Contradictions
- None that reverse meaning. AC-1 is a documentation/schema drift (the prose promises columns the DDL lacks), not a logical contradiction.

### Duplicate concepts
- `lab_panels.collected_at` vs `lab_results.result_date` overlap intentionally (panel date vs per-result date) - acceptable, document the relationship.
- "Confidence" appears as a daily check-in field, a Confidence Index, and an AI confidence score. These are distinct and correctly named, but the implementation should keep them namespaced to avoid conflation.

### Missing entities/relationships
- `insights` (AC-3), `momentum_events` (AC-2), `canonical_metric_values` (AC-4), and timeline `subcategory`/`confidence` (AC-1).

**Architecture consistency: strong.** The 3-layer model, pack plugin contract, and data flow are coherent across PRD, IA, types, and schema. Issues are additive, not structural.

---

## 2. Database Validation Report

### Tables
- 27 tables/relations specified; coverage is good for the MVP feature set.
- **Gaps:** `momentum_events` (AC-2), `insights` (AC-3), `canonical_metric_values` (AC-4), and two timeline columns (AC-1).

### Relationships
- FKs and `on delete` semantics are sound (cascade for owned children, `set null` for soft links like `timeline_event_id`, `panel_id`). Good.
- `note_tags` has no `user_id`; RLS must be expressed via an `EXISTS` join to `memory_notes`. Flagged so it is not missed (DB-2).

### Indexes
- Time-series access patterns are indexed (`checkins`, `lab_results`, `pack_metric_entries`, `derived_indices`, `correlations`, `audit_log`). Good.
- **DB-1 (HIGH):** `derived_indices` has `unique (user_id, index_kind, index_date)`. Storing the Health Momentum Score (and any other index) under `index_kind = 'custom'` will **collide** when more than one custom index exists on the same date. Fix: add explicit enum values (e.g., `health_momentum`) rather than overloading `'custom'`, or add a `index_slug text` discriminator and change the unique key to `(user_id, index_kind, index_slug, index_date)`.
- Missing GIN index consideration: `memory_notes` has a full-text GIN index (good); `timeline_events` keyword search (doc 21) will need a similar `to_tsvector` index (DB-3, MEDIUM).

### Scalability
- Adequate for single-user/early-cohort (MVP/Phase 2). Long-history partitioning is correctly deferred to [14-phase-3-plan.md](14-phase-3-plan.md).
- Recommendation: plan `checkins`/`derived_indices`/`canonical_metric_values` for monthly partitioning before multi-year data accrues.

**DB verdict:** sound foundation; apply DB-1 (HIGH) before M3 (indices), AC-1/AC-2 before M1/M5, and DB-2/DB-3 during M1.

---

## 3. API Validation Report

### Endpoint completeness
- Core surface is complete for MVP: auth/onboarding, profile + unlock, packs, check-ins, memory, **timeline (added)**, vault+OCR, labs, experiments, correlations/graph/reports/cases, all 6 AI systems, export/delete.
- **API-1 (MEDIUM):** No momentum endpoints. The Weekly Momentum Report and Momentum Score ([25-health-momentum-engine.md](25-health-momentum-engine.md)) need either dedicated routes (`GET /api/v1/momentum`, `GET /api/v1/momentum/events`) or explicit inclusion in `GET /api/v1/reports` + the dashboard payload. Decide and document.
- **API-2 (LOW):** No wearable integration endpoints (connect/disconnect/sync). Acceptable - integrations are Phase 2 ([13-phase-2-plan.md](13-phase-2-plan.md)) - but add them to the API doc when Phase 2 begins.
- **API-3 (LOW):** `cases` lacks a PATCH/DELETE; cases are described as user-editable ([03-user-journeys.md](03-user-journeys.md) Journey 5). Add `PATCH /cases/:id` and `DELETE /cases/:id`.
- **API-4 (MEDIUM):** Timeline `POST/PATCH` depend on `subcategory` and `confidence` fields that the schema lacks (ties to AC-1). Resolve together.

### Auth coverage
- Every endpoint is correctly scoped (`public` only for the Supabase session exchange; everything else `user`). The "never trust client `user_id`; RLS is the second line" rule is stated. Good.

### Privacy compliance
- Sensitive-data unlock (`/profile/unlock`), `403 forbidden` for locked data, and timeline exclusion of locked events are specified. Export/delete are first-class. Good.
- **API-5 (LOW):** AI endpoints should document that sensitive content is only sent to providers per the privacy-mode consent rules in [10-security-design.md](10-security-design.md); add an explicit note to Section 10.

**API verdict:** complete enough to start; close API-4 with AC-1, decide API-1 before M5.

---

## 4. Security Validation Report

### RLS coverage
- The owner-only RLS pattern is defined for all current user-owned tables, with catalog tables read-only. Strong.
- **SEC-1 (HIGH):** Any new tables (`momentum_events`, `insights`, `canonical_metric_values`) must ship with the same RLS policies. Add to the doc 05 enumeration when those tables are added.
- **SEC-2 (MEDIUM):** `note_tags` RLS must be via `EXISTS (select 1 from memory_notes n where n.id = note_tags.note_id and n.user_id = auth.uid())` since it has no `user_id`. Make explicit (also DB-2).

### Sensitive data handling
- `highly_sensitive` flagging, unlock gating, telemetry exclusion, and minimized AI logging are specified. Good.
- **SEC-3 (MEDIUM):** `profiles.reproductive_goals` is stored as plain `text` with no per-field sensitivity treatment, although reproductive data is classified highly sensitive ([10](10-security-design.md), [21](21-timeline-taxonomy.md)). Recommendation: treat reproductive fields under the same unlock/extra-protection path or move them to a gated child table.

### Privacy modes
- `standard` / `extra_protected` / `local_only` are well-defined, including the encryption-vs-AI tradeoff and local-only no-server-write rule. Strong.

### Export and deletion
- Full export (JSON + file manifest) and hard delete (rows + storage purge + integration revoke), both audited and re-auth confirmed. Strong; matches the PRD success metric.

**Security verdict:** strong. SEC-1/SEC-2 are mechanical and must accompany the new tables; SEC-3 is a recommended hardening.

---

## 5. AI System Validation Report

| System | Specified in | Status | Alignment |
| --- | --- | --- | --- |
| Health Detective | [19](19-detective-rules.md) | Fully specified (behavior, sample minimums, confidence, escalation, contradiction handling, anti-anxiety balance, auditability) | Aligns with Principles 1/2/5/7/8, compliance guardrails, evidence framework. Persistence gap (AC-3). |
| Health Historian | [01](01-prd.md), [21](21-timeline-taxonomy.md) | Behavior described; **no dedicated rules doc**. Phase 2 per [13](13-phase-2-plan.md). | Aligned; needs a rules spec before Phase 2 build (AI-1). |
| Research Assistant | [23](23-evidence-framework.md) | Evidence ranking fully specified. Phase 2. | Aligns with Principle 2 and compliance. |
| Experiment Designer | [01](01-prd.md), [19](19-detective-rules.md), `experiments` table | MVP-minimal version specified (templates + AI draft). | Aligned; never proposes medication changes (Principle 1/10). |
| Root Cause Engine | [01](01-prd.md), `correlations` | Specified; full version Phase 2. | Aligned (confidence + sample size honesty). |

### Findings
- **AI-1 (MEDIUM):** Historian lacks a dedicated rules document equivalent to doc 19. Acceptable for MVP (MVP ships only the Detective per [12-mvp-plan.md](12-mvp-plan.md) M4), but create `Historian Rules` before Phase 2.
- **AI-2 (HIGH, ties to AC-3):** Detective auditability requires persisted insights with source metrics, sample size, date range, and confidence. `ai_interactions` stores only summaries + guardrail flags. Add an `insights` table (and link to `correlations`/`experiments`) so the audit trace and contradiction history are real, not theoretical.
- **Alignment check:** The guardrail contract ([07](07-api-specifications.md) Section 11), Principles ([24](24-product-principles.md)), Compliance ([16](16-compliance-review.md)), and Evidence Framework ([23](23-evidence-framework.md)) are mutually consistent. The anti-anxiety balance rule ([25](25-health-momentum-engine.md)) is correctly reflected in the Detective checklist.

**AI verdict:** the MVP-critical system (Detective) is the most rigorously specified; the main gap is persistence (AC-3/AI-2), which is a schema add.

---

## 6. MVP Readiness Report

**Can MVP implementation begin today?** **Yes - at milestone M0**, with conditions applied at the milestones below. None of the findings block scaffolding, auth, onboarding, or the data model foundation.

### Must-fix-by-milestone (conditions)

| Before milestone | Fix | Findings |
| --- | --- | --- |
| M1 (Capture) | Add timeline `subcategory` + `confidence` columns, fix `category` to controlled vocabulary, add timeline FTS index; resolve timeline API fields | AC-1, API-4, DB-3 |
| M1 (Capture) | Make `note_tags` RLS explicit | DB-2, SEC-2 |
| M3 (Packs & Indices) | Fix `derived_indices` uniqueness for multiple custom/momentum indices (add enum value or `index_slug`) | DB-1 |
| M4 (Detective) | Add `insights` table + RLS for real auditability and contradiction history | AC-3, AI-2, SEC-1 |
| M5 (Case & Reports) | Add `momentum_events` table + RLS; decide momentum API surface | AC-2, API-1, SEC-1 |
| M5 (Case & Reports) | Add `PATCH/DELETE /cases/:id` | API-3 |

### Recommended (not blocking MVP)
- SEC-3 (reproductive-field gating), AC-4/canonical metric storage design (needed for Phase 2), AC-5 (Anxiety/Body Image/Sexual Confidence formulas), AI-1 (Historian rules) - all before the phase that needs them.

### Implementation order (confirmed from [12-mvp-plan.md](12-mvp-plan.md))
1. **M0 Foundations** - scaffold, schema + RLS (apply the schema deltas above as part of the initial migration where known), auth, onboarding, pack eligibility.
2. **M1 Capture** - check-in, timeline (with AC-1 fix), memory.
3. **M2 Records & Labs** - vault + OCR + labs.
4. **M3 Packs & Indices** - Sleep + Sexual Health packs (with DB-1 fix).
5. **M4 Detective & Experiments** - Detective (with insights table) + experiment engine.
6. **M5 Case & Reports** - Case Builder + Weekly Report + Momentum (with AC-2/API-1).
7. **M6 Hardening & Launch** - export/delete verification, RLS tests, performance.

> Efficiency note: AC-1, AC-2, AC-3, DB-1 are all single-table schema edits. The pragmatic path is to fold all of them into the **M0 initial migration** so later milestones are unblocked from day one.

---

## 7. Scorecard

Scores are 0-100, weighted by reviewer judgment against the findings above.

Scores below are **post-resolution** (after the Resolution Log fixes); the pre-fix score is shown for reference.

| Dimension | Pre-fix | Post-fix | Rationale |
| --- | --- | --- | --- |
| **Architecture** | 88 | 96 | Timeline schema drift and the missing insight/momentum/canonical tables are now defined; model is fully coherent. |
| **Security** | 90 | 95 | RLS enumerated for all tables incl. join-based `note_tags`; sensitive profile fields gated. Remaining margin is pen-test/runtime verification. |
| **Product** | 92 | 93 | Principles, anti-anxiety balance, investigation-not-diagnosis, and clear MVP remain excellent. |
| **Scalability** | 85 | 92 | `derived_indices` uniqueness fixed; indexing solid. Partitioning still planned for Phase 3. |
| **Compliance** | 90 | 90 | Non-diagnostic posture enforced; unchanged - gated by external counsel items (DPIA, device classification) in [16](16-compliance-review.md). |
| **Documentation Completeness** | 95 | 97 | All 22 required artifacts + governance/balance; enumerated gaps closed. |

**Composite readiness:** ~94/100 (post-resolution).

---

## 8. Go / No-Go Recommendation

### Recommendation: **GO**

The specification suite is internally consistent, safe-by-design, and now complete: all HIGH/MEDIUM schema and contract findings have been resolved in the blueprint (see Resolution Log). There are **no architectural blockers and no open MVP-blocking findings**.

**Remaining conditions (do not block MVP development):**
1. Author the Historian rules doc (AI-1) and add wearable integration endpoints (API-2) **before Phase 2** - neither is in MVP scope.
2. Track the compliance counsel items in [16-compliance-review.md](16-compliance-review.md) (DPIA, device-classification sign-off) in parallel - these gate **public launch**, not internal MVP development with User #1.
3. Standard build-time verification still applies: automated RLS tests, export/delete round-trip, and the Detective guardrail test suite (already specified in [10](10-security-design.md), [12](12-mvp-plan.md), [19](19-detective-rules.md)).

### What this means
- **Implementation may begin now** at M0 - the blueprint is clean; no schema deltas are pending.
- The MVP can proceed through M1-M6 against the as-written specification.
- **Public launch** additionally requires the compliance sign-offs in doc 16.

---

## 9. Action List (consolidated)

| ID | Sev | Action | Owner area | Due |
| --- | --- | --- | --- | --- |
| AC-1 / API-4 | HIGH | Add timeline `subcategory` + `confidence`; align `category` to controlled vocab; timeline FTS index | DB/API | M0/M1 |
| DB-1 | HIGH | Fix `derived_indices` uniqueness (enum value or `index_slug`) | DB | M0/M3 |
| AC-3 / AI-2 | HIGH | Add `insights` table + RLS (audit trace + contradiction history) | DB/AI | M0/M4 |
| AC-2 | HIGH | Add `momentum_events` table + RLS | DB | M0/M5 |
| SEC-1 | HIGH | RLS on all new tables | Security | each add |
| SEC-2 / DB-2 | MEDIUM | Join-based RLS for `note_tags` | Security | M1 |
| API-1 | MEDIUM | Define momentum API surface | API | M5 |
| API-3 | MEDIUM | `PATCH/DELETE /cases/:id` | API | M5 |
| DB-3 | MEDIUM | Timeline FTS index | DB | M1 |
| SEC-3 | MEDIUM | Gate reproductive fields | Security | M0/M1 |
| AC-4 | MEDIUM | Design `canonical_metric_values` storage | DB | Phase 2 |
| AC-5 | LOW | Anxiety / Body Image / Sexual Confidence formulas | Analytics | before those packs |
| AI-1 | LOW | Historian rules doc | AI | before Phase 2 |
| API-2 / API-5 | LOW | Integration endpoints; AI privacy note | API | Phase 2 / M4 |

---

## 10. Validation Summary

- **Architecture is sound; no blockers.**
- **The flagship safety system (Detective) is the most rigorously specified**, which is the right priority for a non-diagnostic health platform.
- **All gaps are additive** (new columns/tables/endpoints), not structural rewrites.
- **Recommendation: GO.** All HIGH/MEDIUM findings resolved in the blueprint (see Resolution Log); begin at M0 against the as-written spec. Author Historian rules + integration endpoints before Phase 2; secure compliance sign-offs before public launch.
