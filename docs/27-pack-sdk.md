# 27 - Pack SDK

> Formalizes the Investigation Pack plugin contract introduced in [09-type-definitions.md](09-type-definitions.md) and realized in `types/packs.ts`. Phase 3 (docs/14 §2.3) opens this toward an ecosystem with a safety review gate.

## 1. Contract

A pack is a `PackDefinition` (`types/packs.ts`):

```ts
interface PackDefinition {
  slug: string;            // unique, kebab-case
  name: string;
  description: string;
  version: string;         // semver
  isEligible: (p: Profile) => boolean; // auto-activate at onboarding? false = opt-in
  metrics: PackMetricDefinition[];     // daily-loggable inputs
  indices: PackIndexDefinition[];      // derived 0-100 scores
  dashboard: { cards: PackDashboardCard[] };
}
```

Index `compute(input)` is a **pure function** of:
- `metricEntries` - the day's pack metric values,
- `core` - the day's core check-in,
- `canonical` - latest canonical (device/lab/manual) values for the day ([22-canonical-health-metrics.md](22-canonical-health-metrics.md)),
- `windowDays`.

It returns `0-100` or `null` (too few inputs). No I/O, no randomness.

## 2. Adding a pack

1. Create `packs/<slug>/definition.ts` exporting a `PackDefinition`.
2. Register it in `packs/registry.ts` (`ALL_PACKS`).
3. Add a new `index_kind` enum value (migration) + label in `lib/index-labels.ts` for any new indices.
4. Seed `pack_definitions` + `pack_metric_definitions` rows (migration).
5. Users activate opt-in packs from **Explore Packs** (`/explore`).

## 3. Safety review gate

Every pack - first-party or community - must pass review before it is marked `verified`:

- **No diagnosis / prescription / condition naming** in any user-facing string. Symptom-load indices must be framed as *load/trend*, never as a condition.
- **Possibility language only** in labels and descriptions.
- Index formulas must be **non-diagnostic** and bounded to `0-100`.
- Sensitive metrics must declare `sensitivity: "sensitive" | "highly_sensitive"` and (where relevant) `sexScope`.
- Indices that only apply to one biological sex must set `sexScope`.

The marketplace surfaces `verified` packs with a badge; unverified packs are not activatable. All free-text that reaches users still passes the runtime guardrail pipeline (`ai/guardrails.ts`).

## 4. Versioning

Bump `version` (semver) on any metric/index change. Activations are by pack id, so re-seeding is idempotent (`on conflict do nothing`).
