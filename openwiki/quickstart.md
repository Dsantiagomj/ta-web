---
type: guide
title: Quickstart
description: Entry point to the ta-web wiki. What the repo is, the four commands to get it running, and which page to read for each kind of task.
tags: [quickstart, onboarding, navigation]
sources:
  - id: openwiki-source-5f5b95b3d6a215fa02ceb945
    resource: repo://.env.example
  - id: openwiki-source-164e2da859b5277df81c7d94
    resource: repo://.github/workflows/ci.yml
  - id: openwiki-source-5b54a58d1b51cd490b0e7162
    resource: repo://package.json
  - id: openwiki-source-23775c3de52f3ab95a13cb8b
    resource: repo://README.md
  - id: openwiki-source-71c840280649a7620f8e010f
    resource: repo://scripts/db-dev.ts
  - id: openwiki-source-63cbcc482c18e4f9ce5d0888
    resource: repo://scripts/refresh-quests.ts
  - id: openwiki-source-7a2723ea85824e431ff5eb54
    resource: repo://src/collections/QuestGuides.ts
generated: { by: "claude-code", at: "2026-11-04T12:46:56.619Z" }
verified:
  - by: openwiki/0.4.3
    at: 2026-11-04T12:46:56.619Z
---

# Quickstart

ta-web is the new torrentearcano.com: a Next.js 16 app with Payload CMS 3 inside it, Postgres, Cloudflare R2 and Railway. The skeleton is built; most product features are still planned. Start with the [Project overview](overview.md).

## Run it

```sh
pnpm install          # dependencies and git hooks
cp .env.example .env  # set PAYLOAD_SECRET (openssl rand -hex 32)
pnpm db:dev           # terminal 1: embedded Postgres on 127.0.0.1:54329
pnpm dev              # terminal 2: http://localhost:3000, panel at /admin
```

Node 24 (≥ 24.22.1) and pnpm 11. No Docker. Details in [Local development](workflows/local-development.md).

## Before you change anything

- Read `AGENTS.md`: workflow, language and stack rules. UI work also follows `DESIGN.md`.
- Work test-first. `pnpm test` for unit tests; the other suites are in [Test suites](testing/test-suites.md).
- Schema change: `pnpm migrate:create <name>` and `pnpm generate:types`, committed together.

## Find the right page

| I want to… | Read |
|---|---|
| Understand what exists and what is planned | [Project overview](overview.md) |
| Follow a request from the proxy to a route | [Request pipeline](architecture/request-pipeline.md) |
| Know what an environment variable does, or add one | [Environment configuration](architecture/configuration.md) |
| Change Payload settings, add an endpoint or admin component | [Payload CMS configuration](cms/payload-config.md) |
| Add or change a collection, or its access rules | [Collections and access](cms/collections.md) |
| Add or change a block in a guide body (rich text, image, video, callout) | [Guide body blocks](cms/blocks.md) |
| Change the schema, connect to Neon, reset local data | [Database and migrations](data/database.md) |
| Load or refresh DofusDB quests (`pnpm data:quests`) | [DofusDB game data refresh](data/dofusdb-refresh.md) |
| Upload files, configure R2, serve images | [Media storage](media/storage.md) |
| Work on dark/light mode or premium themes | [Theme and mode](frontend/theme-and-mode.md) |
| Use design tokens, fonts or the page shell | [Styles, tokens and site shell](frontend/styles-and-shell.md) |
| Run or write tests | [Test suites](testing/test-suites.md) |
| Fix a failing CI job or a git hook | [CI and quality gates](workflows/ci-and-quality-gates.md) |
| Deploy to dev or release to production | [Deployment and releases](operations/deployment.md) |
| Check or monitor app health | [Health check endpoint](operations/health-check.md) |
| Access or debug the password-protected dev site | [Dev environment gate](operations/dev-gate.md) |
| Find a server error | [Error monitoring with Sentry](operations/error-monitoring.md) |
| Set up a laptop | [Local development](workflows/local-development.md) |
