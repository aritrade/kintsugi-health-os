# Kintsugi Health OS

A privacy-first **Personal Health Operating System** that helps people become the primary investigator of their own health journey - through structured observation, evidence collection, experimentation, timeline reconstruction, pattern discovery, and healthcare preparation.

> Investigation, not diagnosis. The platform never diagnoses, prescribes, recommends medication changes, or replaces a physician. See [docs/01-prd.md](docs/01-prd.md) and [docs/24-product-principles.md](docs/24-product-principles.md).

## Status

Pre-implementation blueprint is complete and validated ([docs/26-architecture-validation.md](docs/26-architecture-validation.md), verdict: GO). This repo currently contains **M0 - Foundations** of the MVP ([docs/12-mvp-plan.md](docs/12-mvp-plan.md)): project scaffold, database schema + RLS, auth, onboarding, and the Investigation Pack eligibility engine.

## Tech stack

- Next.js 15 (App Router) + React + TypeScript
- TailwindCSS + shadcn-style UI primitives
- Supabase (PostgreSQL + Auth + Storage)
- Zustand (state), Recharts (charts)
- Claude + OpenAI (AI, server-side, behind a guardrail layer)

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in Supabase + AI keys
npm run dev
```

### Database

SQL migrations live in `supabase/migrations/` and seed data in `supabase/seed/`. Apply them to your Supabase project (via the Supabase SQL editor or CLI). The schema and Row Level Security policies are specified in [docs/05-database-schema.md](docs/05-database-schema.md).

## Project structure

See [docs/08-folder-structure.md](docs/08-folder-structure.md). High level:

- `app/` - routes + API (App Router)
- `features/` - core domain modules
- `packs/` - Investigation Packs (plugin modules)
- `ai/` - AI provider abstraction + guardrails
- `server/` - server-only services
- `lib/`, `stores/`, `types/` - cross-cutting libraries, Zustand stores, canonical types
- `supabase/` - migrations, policies, seed
- `docs/` - the full specification suite (27 documents)

## Documentation

Start at [docs/00-index.md](docs/00-index.md).
