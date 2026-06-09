# Kintsugi Health OS

A privacy-first **Personal Health Operating System** that helps people become the primary investigator of their own health journey — through structured observation, evidence collection, experimentation, timeline reconstruction, pattern discovery, and healthcare preparation.

> **Investigation, not diagnosis.** The platform never diagnoses, prescribes, recommends medication changes, or routes around your physician. Every AI-assisted output passes through a safety guardrail layer and carries a non-diagnostic disclaimer. See [docs/01-prd.md](docs/01-prd.md) and [docs/24-product-principles.md](docs/24-product-principles.md).

---

## Try the live demo

A fully populated, shared demo account is wired into the app so anyone can explore the product end-to-end with realistic, lived-in data (≈12 weeks of correlated check-ins, derived indices, detected correlations, a knowledge graph, experiments, reports, labs, and a doctor-ready case).

- **Live app:** https://kintsugi-health-os.vercel.app
- **One-click:** open `/signup` or `/login` and press **“Explore the live demo.”**
- **Manual login:** `demo@kintsugi.health` / `ShowMe2026!Demo`

The demo account is guarded against deletion so it stays available for everyone. Re-seed it any time with `npm run seed:demo`.

---

## Status

The pre-implementation blueprint is complete and validated ([docs/26-architecture-validation.md](docs/26-architecture-validation.md), verdict: **GO**), and the product is **fully implemented and deployed**:

| Phase | Scope | State |
| --- | --- | --- |
| **M0** | Foundations: scaffold, DB schema + RLS, auth, onboarding, pack eligibility engine | Done |
| **M1** | Capture: Daily Check-in, Health Timeline, Health Memory | Done |
| **M2** | Records & Labs: Medical Vault, Lab Intelligence, vision OCR | Done |
| **M3** | Investigation Packs & derived indices | Done |
| **M4** | Health Detective (deterministic patterns/correlations) & Experiment Engine | Done |
| **M5** | Health Momentum, Reports, Case Builder | Done |
| **M6** | Hardening & data ownership (export + hard delete) | Done |
| **Phase 2** | Canonical metric layer, wearable adapters, AI suite, knowledge graph, expanded reports, more packs | Done |
| **Phase 3** | Pack marketplace + SDK, additional packs, scale/reliability indexes, lab range localization | Done |

---

## What it does

**Capture**
- **Daily Check-in** — a sub-90-second structured log of sleep, energy, mood, anxiety, lifestyle, and active-pack metrics.
- **Health Timeline** — a longitudinal, life-stage-aware reconstruction of health events.
- **Health Memory** — notes and open questions you want to carry into appointments.

**Records & Labs**
- **Medical Vault** — encrypted-at-rest document storage (RLS-scoped) for lab PDFs, imaging, notes, and prescriptions.
- **Lab Intelligence** — biomarker trends with region-aware reference-range localization.
- **Vision OCR** — extract biomarkers from lab images; values are never trusted until you confirm them.

**Investigation Packs** (modular, opt-in domain plugins)
- Sleep · Sexual Health · Weight & Body Composition · Thyroid · Hypertension · PCOS · Fertility · Menopause · Chronic Fatigue · Mental Health · Longevity.
- Each pack contributes metrics + deterministic **derived indices**. Sensitive packs (reproductive/mental health) get extra protection.

**Investigation engine**
- **Health Detective** — a fully deterministic engine that surfaces trends, correlations (Pearson), longitudinal regime changes, and hypotheses — framed as **questions, not verdicts**, with anti-anxiety tone balancing.
- **Experiment Engine** — design and analyze N-of-1 experiments with adaptive durations.
- **Knowledge Graph** — an interactive node-link view of how your metrics and indices connect.

**Make sense of it**
- **Health Momentum** — a 0–100 score from Consistency, Physical Progress, Understanding, and Confidence.
- **Reports** — weekly / monthly / quarterly / annual, with carryover of open questions.
- **Case Builder** — a specialist-tailored, evidence-based summary you can hand to a clinician.
- **AI Assistant suite** — Health Historian (narrative reconstruction), Research Assistant (evidence-graded explanations), and Appointment Prep — all deterministic and guardrailed.

**Integrations**
- A vendor-independent **canonical metric layer** with adapters for Oura, Whoop, Garmin, Fitbit, Ultrahuman, Apple Health, and Google Fit. Quality-aware deduplication (device > lab > user > OCR). Sample-data loader for testing without a device.

**Own your data**
- Full machine-readable **export** (JSON + file links) and irreversible **hard delete** at any time.

---

## Tech stack

- **Next.js 15** (App Router) · **React 19** · **TypeScript**
- **TailwindCSS** + shadcn-style UI primitives · responsive shell (desktop sidebar / mobile bottom nav) · **dark mode** (no-flash, system-aware)
- **Supabase** — PostgreSQL + Auth + Storage, with Row Level Security on all user-owned data
- **Zustand** (state) · **Recharts** (charts) · **Zod** (validation)
- **AI** — the Detective, Historian, Research, and Appointment engines are **deterministic** (no black-box LLM in the analysis path) and run behind a safety **guardrail layer** (`ai/guardrails.ts`). The only vision/LLM dependency is optional lab **OCR** via Gemma 4 (self-hosted Ollama preferred; hosted Gemini fallback).
- **Hosting** — Vercel (app) + Supabase (data) with GitHub auto-deploys on `main`.

---

## Getting started

### Prerequisites
- Node.js 20+
- A Supabase project (free tier is fine)

### Install & run

```bash
npm install
cp .env.example .env.local   # fill in the values below
npm run dev                  # http://localhost:3000
```

### Database

SQL migrations live in `supabase/migrations/`. Apply them in order via the Supabase SQL editor or CLI. The schema and Row Level Security policies are specified in [docs/05-database-schema.md](docs/05-database-schema.md) and [docs/10-security-design.md](docs/10-security-design.md).

```
0001_init.sql               core schema + enums
0002_rls.sql                Row Level Security policies
0003_checkin_idempotency.sql
0004_storage.sql            Storage buckets + policies
0005_account.sql            data export + hard-delete (SECURITY DEFINER)
0006_phase_packs.sql        Phase 2/3 pack + metric definitions
0007_index_kinds.sql        new derived-index enum values
0008_cohort_scale.sql       feedback, region, performance indexes
```

### Seed the demo account (optional)

```bash
npm run seed:demo            # populates demo@kintsugi.health with ~12 weeks of data
```

### Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | Supabase anon key (client) |
| `SUPABASE_SERVICE_ROLE_KEY` | server | Privileged server operations (never exposed to the client) |
| `OLLAMA_BASE_URL` / `OLLAMA_OCR_TOKEN` / `OLLAMA_OCR_MODEL` | optional | Self-hosted Gemma 4 OCR (images stay on your infra — preferred) |
| `GEMINI_API_KEY` / `GEMMA_OCR_MODEL` | optional | Hosted Gemma 4 vision OCR fallback |

OCR is optional: with no provider configured, the UI cleanly falls back to manual lab entry.

---

## Project structure

See [docs/08-folder-structure.md](docs/08-folder-structure.md). High level:

- `app/` — routes + API (App Router); `(auth)`, `(app)`, and `api/v1/*`
- `packs/` — Investigation Packs (plugin modules + index formulas)
- `ai/` — guardrail layer + lab OCR
- `server/` — server-only services (checkins, detective, momentum, reports, cases, graph, canonical, integrations, account, AI engines)
- `components/` — UI primitives + feature components
- `lib/`, `stores/`, `types/` — cross-cutting libraries, Zustand stores, canonical types
- `supabase/` — migrations, policies, seed
- `scripts/` — seed + verification harnesses
- `docs/` — the full specification suite (28 documents)

---

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build (also regenerates typed routes) |
| `npm run start` | Run the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run verify:guardrails` | Regression test for the Detective + guardrails |
| `npm run verify:m5` | Authenticated E2E for Momentum / Reports / Cases |
| `npm run verify:m6` | Verifies RLS + data-ownership (export/delete) |
| `npm run seed:demo` | (Re)seed the public demo account |

---

## Safety, privacy & data ownership

- **Non-diagnostic by design.** A guardrail layer (`ai/guardrails.ts`) scans every generated statement for diagnostic/prescriptive/causal language and medical condition names, auto-attaches disclaimers, and routes emergencies. Regression-tested via `npm run verify:guardrails`.
- **Deterministic analysis.** Pattern discovery is computed, not generated — explainable and reproducible.
- **Row Level Security** on all user-owned tables; sensitive (reproductive / mental-health) data gets extra protection.
- **You own your data** — export everything as JSON at any time, or hard-delete your account and storage irreversibly.

See [docs/10-security-design.md](docs/10-security-design.md), [docs/16-compliance-review.md](docs/16-compliance-review.md), and [docs/18-product-risks.md](docs/18-product-risks.md).

---

## Extending: the Pack SDK

New Investigation Packs are added as self-contained modules implementing a `PackDefinition` (metrics + deterministic index formulas), then registered and surfaced in the marketplace. Packs pass a safety review gate before being marked verified. See [docs/27-pack-sdk.md](docs/27-pack-sdk.md).

---

## Documentation

The complete specification suite (28 documents — PRD, personas, journeys, IA, schema, API, types, security, formulas, detective rules, evidence framework, phase plans, risks, compliance, and more) starts at **[docs/00-index.md](docs/00-index.md)**.

---

## Disclaimer

Kintsugi helps you observe and organize your own health data. It is **not** a medical device, does not provide medical advice, and does not replace professional care. Always discuss health concerns with a qualified clinician. In an emergency, contact local emergency services.
