# 11 - Wireframes (Low-Fidelity)

> Mobile-first ASCII wireframes for the MVP screens in [04-information-architecture.md](04-information-architecture.md). These convey layout and hierarchy, not visual design. Final UI uses shadcn/ui + Tailwind with a calm, non-alarmist aesthetic ([01-prd.md](01-prd.md) philosophy).

Conventions: `[ ]` button, `( )` radio, `[x]` checkbox, `____` input, `~~~` chart, bottom bar is global nav.

---

## S02 - Consent + Privacy Mode

```
+----------------------------------+
|  Your data, your rules           |
|                                  |
|  Kintsugi never diagnoses and    |
|  never sells your data.          |
|                                  |
|  Choose a privacy mode:          |
|  ( ) Standard (recommended)      |
|  ( ) Extra-protected             |
|      (unlock for sensitive data) |
|  ( ) Local-only (device only)    |
|                                  |
|  [x] I understand this is not    |
|      medical advice              |
|                                  |
|            [ Continue ]          |
+----------------------------------+
```

---

## S03 - Onboarding Profile

```
+----------------------------------+
|  Tell us about you               |
|                                  |
|  Biological sex                  |
|  ( ) Male ( ) Female ( ) Other   |
|                                  |
|  Age            ____             |
|  Relationship   ____             |
|  Reproductive goals  ____        |
|                                  |
|  Optional (private):             |
|  Gender identity     ____        |
|  Sexual orientation  ____        |
|                                  |
|        [ Enable my packs ]       |
+----------------------------------+
| We will turn on Sleep + Sexual   |
| Health packs based on this.      |
+----------------------------------+
```

---

## S04 - Dashboard (Home)

```
+----------------------------------+
|  Good morning, Arjun       (cog) |
|  90-day protocol  Day 12 / 90    |
|  [#####.............] Phase 1     |
|                                  |
|  Today                           |
|  [ + Daily check-in (90s) ]      |
|                                  |
|  Your indices                    |
|  +------------+ +-------------+   |
|  | Libido  62 | | Sleep   71  |   |
|  | ~~~/\~~~~~~ | | ~~~~/\~~~~~ |   |
|  +------------+ +-------------+   |
|  +------------+ +-------------+   |
|  | Recovery 58| | Confidence  |   |
|  | ~~~~~~/\~~~ | | 64 ~~~/\~~~ |   |
|  +------------+ +-------------+   |
|                                  |
|  Detective                       |
|  > Dry mouth on 24/30 mornings.  |
|    Investigate sleep quality?    |
|    [ Yes ]   [ Not now ]         |
+----------------------------------+
| Home | Check-in | Invstg | Recs |Profile|
+----------------------------------+
```

---

## S05 - Daily Check-in

```
+----------------------------------+
|  < Check-in   Tue Jun 9          |
|                                  |
|  Sleep                           |
|  Bedtime ____  Wake ____         |
|  Quality  [1..10]  o-----O---    |
|  [ ] Dry mouth [ ] Snoring       |
|  Awakenings  ____                |
|                                  |
|  Physical                        |
|  Energy o---O------  Fatigue ... |
|                                  |
|  Mental                          |
|  Mood o----O-----  Anxiety ...   |
|                                  |
|  Lifestyle                       |
|  [ ] Ran [ ] Lifted  Steps ____  |
|  Water __ml  Alcohol __  Caf __  |
|                                  |
|  Sexual Health (private)  (lock) |
|  Desire o---O----                |
|  [ ] Morning erection            |
|  Quality o-----O--               |
|                                  |
|  + Add symptom                   |
|        [ Save check-in ]         |
+----------------------------------+
```

---

## S06 - Health Timeline

```
+----------------------------------+
|  Timeline            [ + Event ] |
|  [ Search ____________ ]         |
|                                  |
|  Adult                           |
|  | 2026  o Started running       |
|  | 2024  o Low energy episode    |
|  | 2021  o Vitamin D low (lab)   |
|                                  |
|  Teen                            |
|  | ~2010 o Anxiety began         |
|                                  |
|  Puberty                         |
|  | ~age13 o First libido memory  |
|                                  |
|  Childhood                       |
|  | ~age8  o Active / sporty      |
+----------------------------------+
| Home | Check-in | Invstg | Recs |Profile|
+----------------------------------+
```

---

## S08 - Health Memory

```
+----------------------------------+
|  Memory          [ + New note ]  |
|  [ Search ____________ ]         |
|  Tags: [sleep][libido][doctor]   |
|                                  |
|  o Question for urologist        |
|    "Ask about morning..."  #doc  |
|  o Observation - better after... |
|    #libido #exercise             |
|  o Appointment note 12 May       |
|    AI summary available  (*)     |
+----------------------------------+
```

---

## S11 - Vault Upload + OCR Review

```
+----------------------------------+
|  < Add record                    |
|  [ Upload PDF / Photo ]          |
|  Status: Extracted               |
|                                  |
|  We found these values -         |
|  please confirm:                 |
|  Test date   ____ (2026-05-01)   |
|  HbA1c     5.4 %    [edit]       |
|  Vitamin D 22 ng/mL [edit]       |
|  TSH       2.1      [edit]       |
|                                  |
|  [ ] Mark as sensitive           |
|  [ Confirm + place on timeline ] |
+----------------------------------+
```

---

## S13 - Lab Detail / Trend

```
+----------------------------------+
|  < Vitamin D                     |
|  Latest 22 ng/mL  (ref 30-100)   |
|  Below reference band            |
|                                  |
|  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~    |
|  | reference band shaded     |    |
|  |        o                  |    |
|  |   o          o      o     |    |
|  +--------------------------+    |
|  2023   2024   2025   2026       |
|                                  |
|  [ Explain this (Research) ]     |
+----------------------------------+
```

---

## S14 - Sexual Health Pack Dashboard

```
+----------------------------------+
|  Sexual Health           (lock)  |
|                                  |
|  Libido Index        62  ~/\~~   |
|  Sexual Confidence   58  ~~/\~   |
|  Erectile Function   70  ~~~/\   |
|  Ejaculatory Control 55  ~\~~~   |
|                                  |
|  Detective note:                 |
|  > Libido highest after          |
|    exercise days. Test it?       |
|  [ Design experiment ]           |
+----------------------------------+
```

---

## S16 - Health Detective

```
+----------------------------------+
|  Health Detective                |
|  Scientist - not a doctor        |
|                                  |
|  What we know                    |
|  - Sleep quality avg 6.1/10      |
|  - Dry mouth 24/30 mornings      |
|                                  |
|  What we don't know              |
|  - Whether sleep affects libido  |
|                                  |
|  Investigate next                |
|  > Sleep quality vs dry mouth    |
|    [ Start experiment ]          |
|  > Exercise vs libido            |
|    [ Start experiment ]          |
|                                  |
|  Ask: [ ____________ ] [Send]    |
|  Not a diagnosis. Talk to a      |
|  clinician about concerns.       |
+----------------------------------+
```

---

## S18 - Experiment Detail / Designer

```
+----------------------------------+
|  < Experiment                    |
|  Question                        |
|  Does earlier bedtime improve    |
|  morning dry mouth?              |
|                                  |
|  Hypothesis                      |
|  Bedtime before 11pm reduces     |
|  dry-mouth mornings.             |
|                                  |
|  Variables  bedtime < 23:00      |
|  Duration   14 days  [edit]      |
|  Metrics    dry_mouth, sleep_q   |
|  Success    < 30% dry-mouth days |
|                                  |
|  Status: Active  Day 5/14        |
|  [#####.........]                |
|  [ Mark complete ] [ Analyze ]   |
+----------------------------------+
```

---

## S21 - Case Builder

```
+----------------------------------+
|  My Health Case                  |
|  For: ( ) Urologist              |
|       ( ) Endocrinologist        |
|       ( ) Sleep specialist       |
|                                  |
|  Includes                        |
|  [x] Summary   [x] Timeline      |
|  [x] Labs      [x] Trends        |
|  [x] Experiments                 |
|  [x] Questions for doctor        |
|                                  |
|  Preview ~~~~~~~~~~~~~~~~~~       |
|                                  |
|  [ Export PDF ][ MD ][ JSON ]    |
+----------------------------------+
```

---

## S23 - Weekly Report

```
+----------------------------------+
|  Weekly Report  Jun 2-8          |
|                                  |
|  Trends                          |
|  Sleep 68 (+4)  Libido 62 (-3)   |
|  Recovery 58 (=)                 |
|                                  |
|  Correlations                    |
|  Sleep <-> Libido  r=0.41 (low n)|
|                                  |
|  Findings                        |
|  - Best libido on exercise days  |
|                                  |
|  Open questions                  |
|  - Does alcohol affect sleep?    |
|                                  |
|  Suggested investigations        |
|  > Alcohol elimination (14d)     |
|  [ Start ]                       |
+----------------------------------+
```

---

## S25 - Privacy + Export/Delete

```
+----------------------------------+
|  Privacy & Data                  |
|  Privacy mode  [ Extra-protected]|
|  Biometric lock        [x]       |
|                                  |
|  Your data                       |
|  [ Export everything ]           |
|  [ Delete my account & data ]    |
|                                  |
|  Sensitive data is hidden until  |
|  you unlock. We never sell data. |
+----------------------------------+
```

---

## Layout Notes

- Global bottom nav (Home / Check-in / Investigate / Records / Profile) on every authenticated screen.
- Sexual-health surfaces always show a lock affordance in extra-protected mode.
- Every AI surface carries the non-diagnostic disclaimer inline.
- Charts are Recharts line/gauge components; reference bands shaded for labs.
