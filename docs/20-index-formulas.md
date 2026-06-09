# 20 - Index Formulas

> Defines all derived health scores. Implements the `PackIndexDefinition.compute` functions referenced in [09-type-definitions.md](09-type-definitions.md), feeds the `derived_indices` table in [05-database-schema.md](05-database-schema.md), and supplies the numbers the Health Detective reasons over ([19-detective-rules.md](19-detective-rules.md)).

---

## 1. Global Rules

- **Range:** every index is normalized to **0 - 100**.
- **Direction:** **higher is always better** (inverse inputs are flipped, see Section 3).
- **Purity:** each index is a pure function of recent inputs (unit-testable, [17-technical-risks.md](17-technical-risks.md) R-T9).
- **Missing inputs:** if a weighted input is missing for a day, the index is computed over the available weights, re-normalized to sum to 1 (documented per index). If too few inputs exist, the index is withheld (Section 6).

---

## 2. Index Definitions

Each index is a weighted sum of normalized inputs. Inputs are first normalized per Section 3, then combined by weight.

### 2.1 Sleep Score
| Input | Weight | Notes |
| --- | --- | --- |
| Sleep Quality | 40% | 1-10 scale |
| Sleep Duration | 30% | scored vs target (Section 4) |
| Night Awakenings | 20% | inverse count |
| Dry Mouth / Snoring Penalty | 10% | boolean penalty (Section 5) |

```
SleepScore = 0.40*normQuality + 0.30*normDuration + 0.20*normAwakenings + 0.10*normDryMouthSnoring
```

### 2.2 Recovery Score
| Input | Weight | Notes |
| --- | --- | --- |
| Energy | 40% | 1-10 |
| Recovery | 40% | 1-10 |
| Fatigue | 20% | inverse (1-10) |

```
RecoveryScore = 0.40*normEnergy + 0.40*normRecovery + 0.20*normFatigueInverse
```

### 2.3 Confidence Index
| Input | Weight | Notes |
| --- | --- | --- |
| Confidence | 50% | 1-10 |
| Mood | 30% | 1-10 |
| Anxiety | 20% | inverse (1-10) |

```
ConfidenceIndex = 0.50*normConfidence + 0.30*normMood + 0.20*normAnxietyInverse
```

### 2.4 Libido Index
| Input | Weight | Notes |
| --- | --- | --- |
| Sexual Desire | 40% | 1-10 |
| Sexual Thoughts | 20% | 1-10 |
| Attraction | 20% | 1-10 |
| Sexual Satisfaction | 20% | 1-10 |

```
LibidoIndex = 0.40*normDesire + 0.20*normThoughts + 0.20*normAttraction + 0.20*normSatisfaction
```

### 2.5 Erectile Function Index (male users)
| Input | Weight | Notes |
| --- | --- | --- |
| Morning Erection | 25% | boolean |
| Erection Quality | 35% | 1-10 |
| Erection Duration | 20% | scored (Section 4) |
| Sexual Confidence | 20% | 1-10 |

```
ErectileFunctionIndex = 0.25*normMorningErection + 0.35*normQuality + 0.20*normDuration + 0.20*normSexualConfidence
```

### 2.6 Ejaculatory Control Index (male users)
| Input | Weight | Notes |
| --- | --- | --- |
| Latency | 30% | scored (Section 4) |
| Control | 50% | 1-10 |
| Satisfaction | 20% | 1-10 |

```
EjaculatoryControlIndex = 0.30*normLatency + 0.50*normControl + 0.20*normSatisfaction
```

### 2.4b Sexual Confidence Index
| Input | Weight | Notes |
| --- | --- | --- |
| Sexual Confidence (self-reported) | 50% | 1-10 |
| Libido Index | 30% | the 0-100 Libido Index (Section 2.4) |
| Confidence Index | 20% | the 0-100 Confidence Index (Section 2.3) |

```
SexualConfidenceIndex = 0.50*normSexualConfidence + 0.30*LibidoIndex + 0.20*ConfidenceIndex
```
(Index inputs that are already 0-100 are used directly; the 1-10 input is normalized per Section 3.1.)

### 2.8 Anxiety Index
| Input | Weight | Notes |
| --- | --- | --- |
| Anxiety | 60% | inverse (1-10) - lower anxiety scores higher |
| Stress | 40% | inverse (1-10) |

```
AnxietyIndex = 0.60*normAnxietyInverse + 0.40*normStressInverse
```
Higher index = lower anxiety (consistent with "higher is better"). Sourced from daily check-in mental fields.

### 2.9 Body Image Score
| Input | Weight | Notes |
| --- | --- | --- |
| Body image (self-reported) | 60% | 1-10 |
| Confidence | 40% | 1-10 |

```
BodyImageScore = 0.60*normBodyImage + 0.40*normConfidence
```
Body image is captured by the Mental Health & Confidence module ([01-prd.md](01-prd.md)).

### 2.7 Health Momentum Score
A cross-cutting 0-100 progress score (Consistency 25% + Physical Progress 25% + Understanding 25% + Confidence 25%). Its full component definitions are specified in [25-health-momentum-engine.md](25-health-momentum-engine.md); it follows all normalization, baseline, and trend rules in this document.

---

## 3. Normalization Rules

All inputs are normalized to 0-100 before weighting.

### 3.1 Scale inputs (1-10)
```
norm = (value - 1) / 9 * 100
```
Example: 7 -> (7-1)/9*100 = 66.7.

### 3.2 Boolean inputs
```
true  -> 100
false -> 0
```

### 3.3 Inverse inputs
For inputs where lower is better (Fatigue, Anxiety, Night Awakenings), flip after normalizing so the index stays "higher is better":
```
normInverse = 100 - normValue
```
- Fatigue / Anxiety (1-10): `100 - ((value-1)/9*100)`.
- Night Awakenings (count): normalized via Section 4, then inverted.

---

## 4. Scoring Non-Scale Numerics (duration / count / latency)

Some inputs are not 1-10 scales. They are mapped to 0-100 via target/band scoring (pure, configurable per pack):

- **Sleep Duration:** scored against a target band (e.g., 7-9h = 100; falls off linearly outside the band; <4h or >11h approaches 0).
- **Night Awakenings:** 0 awakenings = 100; each awakening reduces the score down to a floor (then inverted is already "higher is better" since 0 awakenings -> 100).
- **Erection Duration / Latency:** mapped to 0-100 against pack-defined healthy bands; never presented as diagnostic targets, only as relative self-trend inputs.

Exact band parameters live in each pack's `indices.ts` ([08-folder-structure.md](08-folder-structure.md)) so they are tunable without touching the formula structure.

---

## 5. Penalty Inputs

The Sleep Score "Dry Mouth / Snoring Penalty" (10%) is a composite boolean penalty:
```
penaltyComponent = 100 - (dryMouth?50:0) - (snoring?50:0)   // 100 best, 0 worst
```
So both present -> 0; neither -> 100; one present -> 50.

---

## 6. Minimum Data Requirement

Indices are **hidden until 7 observations** are collected for their inputs.

Until then, display:
> "Collecting baseline data."

This matches the Detective's frequency-pattern minimum ([19-detective-rules.md](19-detective-rules.md) Section 4) and prevents misleading early scores ([18-product-risks.md](18-product-risks.md) R-P1).

---

## 7. Trend Calculation

Displayed index trends use a **7-day rolling average**.
```
trend(day d) = average(dailyIndex over the 7 days ending on d, where available)
```
- The raw daily index is still stored in `derived_indices`; the rolling average is for display and for the Detective's trend detection (which additionally requires 14 observations).

---

## 8. Worked Example - Sleep Score

Given a day: quality 7, duration 7.5h (in target band = 100), awakenings 1 (-> say 80), dry mouth false + snoring false (-> 100).
```
normQuality   = (7-1)/9*100        = 66.7
normDuration  = 100
normAwakenings= 80
normPenalty   = 100
SleepScore = 0.40*66.7 + 0.30*100 + 0.20*80 + 0.10*100
           = 26.7 + 30 + 16 + 10
           = 82.7  -> 83
```

---

## 9. Implementation Notes

- Indices recompute server-side on check-in save ([07-api-specifications.md](07-api-specifications.md) `PUT /checkins/:date`).
- Each computed value is stored with its `inputs` JSON so the Detective's audit trace ([19-detective-rules.md](19-detective-rules.md) Section 10) can show exactly what contributed.
- All formulas are versioned; changing a formula creates a new index version so historical comparisons remain honest.
