# 02 - User Personas

> Companion to [01-prd.md](01-prd.md). Personas drive [03-user-journeys.md](03-user-journeys.md) and pack prioritization.

Kintsugi serves people who want to **understand themselves**, not get an instant diagnosis. The primary persona is the founder (User #1). Expansion personas validate that the Investigation Pack architecture generalizes without redesign.

---

## Persona Summary

| # | Persona | Primary packs | MVP relevance |
| --- | --- | --- | --- |
| P1 | Arjun - The Founder Investigator | Sexual Health, Sleep | Primary (User #1) |
| P2 | Meera - The Unexplained-Symptoms Seeker | Thyroid, Chronic Fatigue | Phase 2/3 |
| P3 | David - The Anxious Health Tracker | Mental Health, Sleep | MVP-adjacent |
| P4 | Sophie - The Women's Health Investigator | PCOS, Fertility, Menopause | Phase 3 |
| P5 | Ken - The Longevity Optimizer | Body Composition, Labs, Sleep | Phase 2 |

---

## P1 - Arjun, The Founder Investigator (PRIMARY / User #1)

- **Age / context:** 34, male, in a long-term relationship, knowledge worker, time-poor, data-curious.
- **Reproductive goals:** undecided / future children possible.
- **Health situation:** noticing changes in libido, erectile function, sleep quality, recovery after exercise, and confidence. No single doctor sees the whole picture. Has scattered lab PDFs in email.

**Goals**
- Understand what is driving changes in sexual health and energy.
- Stop forgetting context between specialist visits.
- Walk into appointments with a clear, evidence-based summary.

**Pains**
- Symptoms feel embarrassing and hard to articulate in a 10-minute visit.
- Conflicting advice online; high health anxiety.
- Labs and notes are scattered; no longitudinal view.

**Jobs To Be Done**
- "When I notice a change, help me *log it structurally* so I can see patterns later."
- "When I see a doctor, help me *prepare a complete, organized case*."
- "When I have a theory, help me *test it safely* with an experiment."

**Why Kintsugi wins:** investigation framing removes shame and replaces it with curiosity; sexual-health metrics are first-class; case builder produces a urologist/endocrinologist-ready summary.

---

## P2 - Meera, The Unexplained-Symptoms Seeker

- **Age / context:** 41, female, persistent fatigue, weight changes, brain fog; multiple inconclusive doctor visits.
- **Goals:** find patterns across years of symptoms and labs; get taken seriously.
- **Pains:** dismissed as "stress"; loses track of when symptoms started; thyroid labs done at different labs with different ranges.
- **JTBD:** "Reconstruct my timeline and show me what correlates with my fatigue."
- **Why Kintsugi wins:** Health Historian + Root Cause Discovery Engine + lab trend normalization across sources.

---

## P3 - David, The Anxious Health Tracker

- **Age / context:** 29, male, health-anxious, already tracks sleep on a wearable, googles symptoms compulsively.
- **Goals:** reduce anxiety by replacing rumination with structured observation.
- **Pains:** tracking apps amplify anxiety; no calm interpretation layer; fears the worst.
- **JTBD:** "Give me a calm, non-alarmist read on my data and tell me what (if anything) is worth investigating."
- **Why Kintsugi wins:** anxiety-reducing tone is a core product principle; the Detective frames findings as questions, not verdicts. (See over-medicalization risk in [18-product-risks.md](18-product-risks.md).)

---

## P4 - Sophie, The Women's Health Investigator

- **Age / context:** 33, female, suspected PCOS, planning fertility in 1-2 years, tracking cycles.
- **Goals:** understand cycle/symptom/lab relationships; prepare for a fertility specialist.
- **Pains:** women's health is under-served by tracking tools; data scattered across cycle apps and clinics.
- **JTBD:** "Connect my cycle, labs, weight, and symptoms into one investigable picture."
- **Why Kintsugi wins:** proves pack architecture extends to PCOS/Fertility/Menopause (Phase 3) with extra protection for reproductive data (see [10-security-design.md](10-security-design.md)).

---

## P5 - Ken, The Longevity Optimizer

- **Age / context:** 47, male, healthy, optimization-minded, runs experiments on himself, wears Oura + Whoop.
- **Goals:** optimize recovery, body composition, and biomarkers; quantify what works.
- **Pains:** no single place to run rigorous N-of-1 experiments across wearable + lab + lifestyle data.
- **JTBD:** "Design and analyze experiments that prove which interventions move my biomarkers."
- **Why Kintsugi wins:** Experiment Engine + Experiment Designer + wearable integrations + lab intelligence.

---

## Anti-Personas (explicitly not served)

- **The user seeking an instant diagnosis** - Kintsugi never diagnoses; this user will be disappointed by design.
- **The user in an acute emergency** - must be routed to real emergency care immediately.
- **The clinician wanting an EHR** - Kintsugi is patient-owned, not a clinical system of record.

---

## Persona-to-Feature Matrix

| Feature | P1 | P2 | P3 | P4 | P5 |
| --- | --- | --- | --- | --- | --- |
| Health Timeline | High | High | Med | High | Med |
| Daily Check-in | High | Med | High | High | High |
| Health Memory | High | High | High | Med | Med |
| Medical Vault | High | High | Low | High | High |
| Lab Intelligence | Med | High | Low | High | High |
| Sleep Pack | High | Med | High | Med | High |
| Sexual Health Pack | High | Low | Low | Med | Low |
| Health Detective | High | High | High | High | High |
| Experiment Engine | High | Med | Low | Med | High |
| Case Builder | High | High | Med | High | Low |
