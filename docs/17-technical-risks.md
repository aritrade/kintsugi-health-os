# 17 - Technical Risks

> Technical risk register. Pairs with product risks in [18-product-risks.md](18-product-risks.md). Mitigations reference the architecture in [07-api-specifications.md](07-api-specifications.md), [08-folder-structure.md](08-folder-structure.md), and [10-security-design.md](10-security-design.md).

Severity = impact x likelihood, rated Low / Med / High.

---

## R-T1 - AI hallucination / unsafe output (Severity: High)
**Risk:** The AI invents facts, or drifts into diagnosis/prescription, violating PRD guardrails and compliance posture.
**Mitigations:**
- Mandatory guardrail pipeline on every AI call (pre-flight + post-process + reframing + block) - [07-api-specifications.md](07-api-specifications.md) Section 11.
- Evidence binding: Detective/Root-Cause may only assert patterns backed by user data with sample size + confidence.
- Automated guardrail test suite; `guardrail_flags` logged for review.
- Disclaimers on every surface; emergency routing.

## R-T2 - OCR / extraction accuracy (Severity: Med)
**Risk:** Lab/report extraction produces wrong values, corrupting trends and downstream correlations.
**Mitigations:**
- OCR is assistive only; **user confirms** every extracted value before it is trusted (`reviewed = true`).
- Confidence scores surfaced; low-confidence fields flagged for review.
- Store raw text alongside structured output for re-extraction.

## R-T3 - Correlation misinterpreted as causation (Severity: High)
**Risk:** Users (or the AI) treat a correlation as a cause/diagnosis.
**Mitigations:**
- Always report coefficient + confidence + sample size; never causal/diagnostic language.
- Frame as hypotheses to test via N-of-1 experiments, not conclusions.
- UI copy and AI framing emphasize "possible relationship, worth investigating."

## R-T4 - Offline/sync conflicts and data loss (Severity: Med)
**Risk:** Offline check-ins conflict or are lost on reconnect.
**Mitigations:**
- IndexedDB write queue + idempotency keys ([07-api-specifications.md](07-api-specifications.md) check-in upsert).
- Field-level last-write-wins with server audit entry.
- Local cache cleared safely on logout/lock; sensitive data never orphaned.

## R-T5 - Encryption vs AI tradeoff (Severity: Med)
**Risk:** Client-side encryption (extra-protected mode) prevents server-side AI from reading data, breaking features.
**Mitigations:**
- Explicit, consent-gated decrypt-and-send-scoped-extract flow for AI in extra-protected mode.
- Local-only mode disables server AI or uses de-identified extracts.
- Clearly communicate the privacy/intelligence tradeoff to the user.

## R-T6 - Sensitive-data leakage (Severity: High)
**Risk:** Sexual/reproductive data exposed via logs, telemetry, AI payloads, or misconfigured RLS.
**Mitigations:**
- RLS on every user-owned table + automated RLS tests ([05-database-schema.md](05-database-schema.md)).
- Sensitive data excluded from telemetry; minimized in `ai_interactions`.
- Unlock gating + local-only option; signed URLs for files.

## R-T7 - Vendor lock-in / provider dependency (Severity: Med)
**Risk:** Over-dependence on Supabase, or on a single AI provider (pricing, outages, policy changes).
**Mitigations:**
- AI behind a provider-abstraction (`ai/providers/router.ts`) so Claude/OpenAI are swappable.
- Standard Postgres (portable); migrations versioned in `supabase/`.
- Full data export keeps the user (and product) portable.

## R-T8 - Wearable integration reliability (Severity: Med, Phase 2)
**Risk:** Third-party APIs (Whoop, Oura, Garmin, etc.) change, rate-limit, or fail; sync gaps corrupt indices.
**Mitigations:**
- Treat wearable data as supplementary; manual check-in always works.
- Per-provider adapters with graceful degradation and backfill.
- Mark synced vs manual data provenance.

## R-T9 - Index/correlation compute correctness (Severity: Med)
**Risk:** Buggy index formulas or correlation math produce misleading insights.
**Mitigations:**
- Index computation as pure, unit-tested functions ([09-type-definitions.md](09-type-definitions.md) `compute`).
- Minimum sample-size thresholds before showing correlations.
- Golden-test fixtures from User #1 data.

## R-T10 - Scaling long histories (Severity: Low now, Med later)
**Risk:** Years of daily check-ins + labs degrade query/report performance.
**Mitigations:**
- Indexed time-series access patterns ([05-database-schema.md](05-database-schema.md) indexes).
- Background jobs for correlation/report generation.
- Partitioning/archival strategy in [14-phase-3-plan.md](14-phase-3-plan.md).

## R-T11 - Prompt injection via uploaded documents (Severity: Med)
**Risk:** Malicious text in an uploaded PDF manipulates AI behavior.
**Mitigations:**
- Treat all extracted text as untrusted input; never as instructions.
- Guardrail post-processing independent of input source.
- Separate extraction from interpretation.

## R-T12 - Cost overrun from AI usage (Severity: Med)
**Risk:** Unbounded AI calls create unsustainable cost.
**Mitigations:**
- Per-user token/request budgets + rate limits ([07-api-specifications.md](07-api-specifications.md)).
- Provider routing for cost/quality; cache deterministic outputs where safe.
- Premium tiers align cost to revenue ([15-monetization-strategy.md](15-monetization-strategy.md)).

---

## Risk Summary

| ID | Risk | Severity | Primary mitigation |
| --- | --- | --- | --- |
| R-T1 | Unsafe AI output | High | Guardrail pipeline + tests |
| R-T2 | OCR accuracy | Med | User confirmation |
| R-T3 | Correlation as causation | High | Confidence + hypothesis framing |
| R-T4 | Offline sync | Med | Idempotency + conflict rules |
| R-T5 | Encryption vs AI | Med | Consent-gated scoped extracts |
| R-T6 | Sensitive leakage | High | RLS + telemetry exclusion |
| R-T7 | Vendor lock-in | Med | Provider abstraction + export |
| R-T8 | Wearable reliability | Med | Manual fallback + provenance |
| R-T9 | Compute correctness | Med | Pure, tested functions |
| R-T10 | Scaling histories | Med | Indexing + jobs + partitioning |
| R-T11 | Prompt injection | Med | Untrusted-input handling |
| R-T12 | AI cost | Med | Budgets + routing + tiers |
