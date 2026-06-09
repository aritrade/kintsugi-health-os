# 18 - Product Risks

> Product/market/behavioral risk register. Pairs with technical risks in [17-technical-risks.md](17-technical-risks.md). Grounded in the philosophy and personas of [01-prd.md](01-prd.md) and [02-user-personas.md](02-user-personas.md).

Severity = impact x likelihood, rated Low / Med / High.

---

## R-P1 - Over-medicalization / health-anxiety amplification (Severity: High)
**Risk:** Constant tracking and pattern-surfacing makes anxious users (persona P3) *more* anxious - the opposite of the mission to reduce health anxiety.
**Mitigations:**
- Calm-by-default IA: dashboard leads with progress and curiosity, not alarms ([04-information-architecture.md](04-information-architecture.md)).
- Detective frames findings as questions, never verdicts.
- No red "warning" framing for normal variation; honest sample-size/confidence to avoid false alarms.
- Allow users to dial down nudges; never push frequency.
- **Health Momentum Engine + anti-anxiety rule** ([25-health-momentum-engine.md](25-health-momentum-engine.md)): every concern is paired with a genuine positive when available; progress is tracked alongside symptoms.
- Governed by Principle 5 (Curiosity over Fear) in [24-product-principles.md](24-product-principles.md).

## R-P2 - Engagement decay (Severity: High)
**Risk:** Daily check-ins are a high-effort habit; users churn before longitudinal value compounds.
**Mitigations:**
- Sub-90-second check-in; partial saves; offline.
- The 90-day protocol provides a clear arc and payoff ([12-mvp-plan.md](12-mvp-plan.md)).
- Wearable auto-fill reduces effort (Phase 2).
- Weekly reports deliver early, recurring value.

## R-P3 - Trust (privacy + accuracy) (Severity: High)
**Risk:** Users won't log sensitive sexual/reproductive data without deep trust; one privacy misstep is fatal.
**Mitigations:**
- Privacy-first design as a visible product feature; no data sale; export/delete always free ([10-security-design.md](10-security-design.md), [15-monetization-strategy.md](15-monetization-strategy.md)).
- Extra-protected + local-only modes for sensitive data.
- Transparent, evidence-bound AI builds accuracy trust.

## R-P4 - Regulatory drift (feature creep into diagnosis) (Severity: High)
**Risk:** Pressure to be "more helpful" pushes features toward diagnosis/treatment, breaking the compliance posture.
**Mitigations:**
- Hard guardrails enforced in code + tests ([07-api-specifications.md](07-api-specifications.md)).
- Compliance gate on every new feature/pack ([16-compliance-review.md](16-compliance-review.md)).
- Documented intended-use statement; non-negotiable "MUST NEVER" list.

## R-P5 - Single-user (founder) bias (Severity: Med)
**Risk:** Building only for User #1 (male, sexual-health focus) produces a product that doesn't generalize to women's health or other domains.
**Mitigations:**
- Pack architecture validated against expansion personas (P2/P4) from day one ([02-user-personas.md](02-user-personas.md)).
- Sex-scoped metrics + female sexual wellness in the first pack.
- Phase 2/3 explicitly diversify the cohort and packs.

## R-P6 - Adoption / cold-start value (Severity: Med)
**Risk:** The product is most valuable after months of data; early experience can feel empty.
**Mitigations:**
- Timeline reconstruction gives immediate value from past history (not just future logging).
- Vault + lab import provides instant organization value.
- Research Assistant explanations (Phase 2) give value before longitudinal data accrues.

## R-P7 - Misuse / unsafe self-experimentation (Severity: Med)
**Risk:** Users run experiments that are unsafe (e.g., altering medication) under the "experiment" framing.
**Mitigations:**
- Experiment Designer never proposes medication changes; guardrails block it.
- Templates focus on lifestyle variables (sleep, caffeine, alcohol, exercise).
- Clear copy: experiments are about lifestyle observation, not treatment changes; consult clinicians.

## R-P8 - Expectation mismatch ("I wanted a diagnosis") (Severity: Med)
**Risk:** Users expecting a symptom-checker/diagnosis are disappointed by the investigation-not-diagnosis framing.
**Mitigations:**
- Clear positioning at onboarding (anti-persona handling in [02-user-personas.md](02-user-personas.md)).
- Emphasize the payoff: better, more productive doctor visits.
- Showcase the Case Builder output early.

## R-P9 - Content/medical correctness of explanations (Severity: Med)
**Risk:** Research Assistant explanations are subtly wrong, eroding trust or misleading users.
**Mitigations:**
- Evidence-based, cited explanations; conservative scope.
- Never patient-specific diagnosis; general education only.
- Feedback mechanism to flag bad explanations.

## R-P10 - Monetization friction (Severity: Med)
**Risk:** Paywalling the wrong things (e.g., the Sexual Health Pack, the founder's core use case) blocks adoption or feels exploitative.
**Mitigations:**
- Generous free tier builds the habit; never paywall safety/export/delete ([15-monetization-strategy.md](15-monetization-strategy.md)).
- Validate willingness-to-pay with the early cohort before locking features.

---

## Risk Summary

| ID | Risk | Severity | Primary mitigation |
| --- | --- | --- | --- |
| R-P1 | Health-anxiety amplification | High | Calm-by-default + question framing |
| R-P2 | Engagement decay | High | Fast check-in + 90-day arc + reports |
| R-P3 | Trust (privacy/accuracy) | High | Privacy-first + evidence-bound AI |
| R-P4 | Regulatory drift | High | Code guardrails + compliance gate |
| R-P5 | Founder bias | Med | Pack architecture + expansion personas |
| R-P6 | Cold-start value | Med | Timeline + vault import value early |
| R-P7 | Unsafe experimentation | Med | Lifestyle-only experiments + guardrails |
| R-P8 | Expectation mismatch | Med | Clear positioning + Case Builder payoff |
| R-P9 | Explanation correctness | Med | Cited, conservative, flaggable |
| R-P10 | Monetization friction | Med | Generous free tier + validate pricing |

---

## Top Risks to Watch (founder dashboard)

1. **R-P1 / R-P4 / R-T1** - the safety + anxiety triad: if the AI ever feels like a doctor or an alarm, the product fails its mission.
2. **R-P2 / R-P3** - the habit + trust loop: no logging, no data, no value.
3. **R-P5** - generalizability: prove the pack model beyond the founder early.
