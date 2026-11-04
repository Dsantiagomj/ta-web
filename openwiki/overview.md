---
type: overview
title: Project overview
description: What ta-web is, the stack it runs on, which parts exist in code today and which are still planned, and how the subsystems connect.
tags: [overview, architecture, nextjs, payload, roadmap]
sources:
  - id: openwiki-source-d60a6f0f1e9b6eab797ff859
    resource: repo://.railway/railway.ts
  - id: openwiki-source-8037e2358a2c4f9b2c722a11
    resource: repo://AGENTS.md
  - id: openwiki-source-46a5fe0601ecffbcc4ce1280
    resource: repo://docs/legacy/README.md
  - id: openwiki-source-5b54a58d1b51cd490b0e7162
    resource: repo://package.json
  - id: openwiki-source-23775c3de52f3ab95a13cb8b
    resource: repo://README.md
  - id: openwiki-source-aafaf952c3fb594c6ce91656
    resource: repo://src/app/(frontend)/page.tsx
  - id: openwiki-source-d91bcfe9b85be5b5860292ba
    resource: repo://src/app/(frontend)/strings.ts
  - id: openwiki-source-633cb155d38055ddc4af30fc
    resource: repo://src/collections/Quests.ts
  - id: openwiki-source-4ce5bfd40fc86e2e8680d71f
    resource: repo://src/lib/dofusdb/refresh-quests.ts
  - id: openwiki-source-2c42ff828c6d8e213a2f7416
    resource: repo://src/payload.config.ts
generated: { by: "claude-code", at: "2026-11-04T12:18:18.185Z" }
verified:
  - by: openwiki/0.4.3
    at: 2026-11-04T12:18:18.185Z
---

# Project overview

ta-web is the new torrentearcano.com: Torre's Dofus quest guides, achievements, classes, Dofus guides and checklists, with member accounts, per-member progress and premium features. It replaces the current Squarespace site and the checklist embeds served from the separate `silvestre-checklist` repo.

The site, the CMS panel and the UI copy are in Spanish. The repo's docs are in English.

## Stack

| Layer | In use today | Planned |
|---|---|---|
| App | Next.js 16 App Router, React 19, TypeScript, server components | |
| CMS | Payload CMS 3, inside the Next app | Editorial collections, globals, guide blocks |
| Database | Postgres through Payload's adapter; Neon when deployed, embedded Postgres 17 locally | Drizzle tables for member progress |
| Media | Cloudflare R2 through `@payloadcms/storage-s3`, local disk as fallback | Offline AVIF/WebP pipeline in the Squarespace import |
| Styles | Tailwind v4 with the tokens from `DESIGN.md` | |
| Members | | Better Auth (Google, Discord, magic link) |
| Search | | Postgres full text (`spanish` plus `unaccent`) |
| Hosting | One Node container per environment on Railway (`dev`, `production`) | |
| Errors | Sentry, server only | |

Runtime: Node 24 (`>=24.22.1 <25`) and pnpm 11, pinned in `package.json`.

## What exists today

The repository is at "phase 0": the skeleton is done and most product features are not built yet.

- **Public site**: a root layout with the brand header and dark/light mode switch, and a placeholder home page that points to the current site. See [Styles, tokens and site shell](frontend/styles-and-shell.md) and [Theme and mode](frontend/theme-and-mode.md).
- **CMS**: Payload with three collections, `users` (panel accounts), `media` and `quests` (read-only DofusDB game data), Spanish admin UI and a single `es` locale. See [Payload CMS configuration](cms/payload-config.md) and [Collections and access](cms/collections.md).
- **Data**: two committed migrations; schema push only under `next dev`. See [Database and migrations](data/database.md).
- **Game data**: `pnpm data:quests` copies every quest from the public DofusDB API into `quests`, idempotently and without deleting anything. See [DofusDB game data refresh](data/dofusdb-refresh.md).
- **Media**: R2 or disk, chosen by environment. See [Media storage](media/storage.md).
- **Operations**: `GET /api/health`, a basic-auth gate for the dev environment, server-side Sentry, Railway infrastructure as code, and GitHub workflows for CI, dev smoke tests and production releases. See the operations pages.
- **Quality**: unit, integration, E2E, dev-gate and smoke suites; lint, format, types and dependency audit in CI; git hooks for formatting, linting, AI review and commit messages.

## What is planned

AGENTS.md describes the target layout and rules. Not yet in the code:

- Editorial collections: quest guides, achievements, Dofus guides, checklists, classes, dungeons, pages (`src/collections/`).
- `src/globals/` (navigation, socials, Ko-fi, Twitch card, announcement bar) and `src/blocks/` (rich text, image, video, callout, dialogue, step).
- Members with Better Auth, per-member progress in Drizzle tables, entitlement checks, premium themes and view modes.
- The Squarespace import pipeline (`scripts/import/`).
- Search, revalidation hooks on publish, and the derived checklist data.

When a rule names a path that does not exist yet, create it with that name.

## How the pieces connect

```
Browser ──▶ Railway container (Node 24)
              └─ Next.js
                   ├─ proxy.ts ─ dev gate (dev only)
                   ├─ (frontend) routes ─ server components ─ Payload local API
                   ├─ (payload) routes ─ /admin, REST, GraphQL, /api/health
                   └─ instrumentation ─ Sentry
              ├──▶ Neon Postgres (pooled URL; direct URL for migrations)
              └──▶ Cloudflare R2 (uploads; public CDN URLs)
```

One build serves both environments. Everything that differs between dev and production is read from environment variables at runtime. See [Request pipeline](architecture/request-pipeline.md) and [Environment configuration](architecture/configuration.md).

## Where the rules live

| File | What |
|---|---|
| `AGENTS.md` | The contract for anyone changing the repo: workflow, language, stack, layout, rules |
| `DESIGN.md` | Visual language and tokens |
| `README.md` | Development, scripts, deploys, hooks, CI |
| `openwiki/` | This generated wiki, the only generated documentation. AGENTS.md requires refreshing it with the `openwiki` skill in `update` mode before every PR |
| `docs/legacy/` | The hand-written plan, infrastructure and dependency-security docs this wiki replaced, kept for decisions and infrastructure state the code does not show |
| `docs/research/` | Research notes, such as the visual study behind `DESIGN.md` |

## Related pages

- [Quickstart](quickstart.md)
- [Request pipeline](architecture/request-pipeline.md)
- [Deployment and releases](operations/deployment.md)
- [DofusDB game data refresh](data/dofusdb-refresh.md)
