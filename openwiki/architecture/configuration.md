---
type: reference
title: Environment configuration
description: Every environment variable the app, the tests and the GitHub workflows read, who sets it, and how each resolver turns it into behavior, including the cases that refuse to start.
tags: [configuration, environment, secrets, railway]
verified:
  - by: openwiki/0.4.3
    at: 2026-11-04T00:32:19.388Z
sources:
  - id: openwiki-source-4d1d392666be6dfdd7a91a2e
    resource: repo://.github/workflows/release.yml
  - id: openwiki-source-ea70eb6c045047448e446296
    resource: repo://.gitignore
  - id: openwiki-source-d60a6f0f1e9b6eab797ff859
    resource: repo://.railway/railway.ts
  - id: openwiki-source-5b54a58d1b51cd490b0e7162
    resource: repo://package.json
  - id: openwiki-source-7a2845694b67f1018000b585
    resource: repo://src/app/(frontend)/layout.tsx
  - id: openwiki-source-2ad419cae2f45e97a3ca23d7
    resource: repo://src/lib/db/database-url.ts
  - id: openwiki-source-d71565e37020ac0fe77be60d
    resource: repo://src/lib/deploy/commit.ts
  - id: openwiki-source-6b31d93be9f7026d5af1d752
    resource: repo://src/lib/dev-gate/dev-gate.ts
  - id: openwiki-source-47a80445306e82d0ef444872
    resource: repo://src/lib/media/storage.ts
  - id: openwiki-source-c31449ae998e78dd836b84bc
    resource: repo://src/lib/monitoring/sentry.ts
  - id: openwiki-source-15d81576125ffd9d62dc8605
    resource: repo://tests/e2e/app-server.ts
  - id: openwiki-source-ba0c02c20c1203ccdd8a9159
    resource: repo://tests/integration/env.ts
generated: { by: "claude-code", at: "2026-11-04T00:16:52.047Z" }
---

# Environment configuration

The app reads all of its configuration from environment variables. `.env.example` lists each one with a comment, and AGENTS.md requires a new variable to be added there in the same change that starts reading it. `.env*` files are git-ignored except `.env.example`; server-only variables never carry the `NEXT_PUBLIC_` prefix.

Each group of variables has one small resolver function that takes an `env` record instead of reading `process.env` directly. That keeps the rules unit-testable and puts the fail-closed decisions in one place.

## Variables by owner

| Variable | Read by | Set where |
|---|---|---|
| `DATABASE_URL` | `resolveDatabaseUrl` (`src/lib/db/database-url.ts`) | `.env` locally, Railway (preserved secret), CI job env |
| `DATABASE_URL_DIRECT` | `resolveDatabaseUrl`, only when `DATABASE_CONNECTION=direct` | Railway (Neon non-pooled URL) |
| `DATABASE_CONNECTION` | `resolveDatabaseUrl` | The `pnpm migrate` script sets it to `direct`; never set by hand |
| `PAYLOAD_SECRET` | `src/payload.config.ts` | `.env`, Railway, CI (a dummy value) |
| `NEXT_PUBLIC_SITE_URL` | `metadataBase` in `src/app/(frontend)/layout.tsx` | `.env`, Railway |
| `APP_ENV` | `isDevEnvironment`, `sentryServerOptions` | Railway `dev` sets `dev`; empty locally and in production |
| `DEV_BASIC_AUTH_USER`, `DEV_BASIC_AUTH_PASSWORD` | `decideDevGate` | Railway `dev` only |
| `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_REGION`, `MEDIA_BASE_URL` | `readS3Settings` (`src/lib/media/storage.ts`) | Railway |
| `SENTRY_DSN` | `sentryServerOptions` (`src/lib/monitoring/sentry.ts`) | Railway |
| `SENTRY_AUTH_TOKEN` | `next.config.ts`, at build time | Railway (declared, not yet populated) |
| `GIT_COMMIT_SHA` | `deployedCommit` (`src/lib/deploy/commit.ts`) | The release workflow, for production |
| `RAILWAY_GIT_COMMIT_SHA`, `RAILWAY_ENVIRONMENT_NAME` | `deployedCommit`, `isDevEnvironment`, Sentry | Injected by Railway |
| `E2E_PORT`, `E2E_DEV_GATE_PORT`, `E2E_SKIP_BUILD` | Playwright configs | `.env` or the shell |
| `SMOKE_BASE_URL`, `SMOKE_BASIC_AUTH_USER`, `SMOKE_BASIC_AUTH_PASSWORD` | `playwright.config.ts` | The shell or the smoke workflow; never `.env` |
| `RAILWAY_TOKEN`, `PROD_URL`, `DEV_URL` | GitHub workflows only | GitHub environment secrets and repository variables |

`NODE_ENV`, `NEXT_PHASE` and `CI` come from Next.js and GitHub Actions and are not listed in `.env.example`.

## Resolvers and their failure modes

### Database URL

`resolveDatabaseUrl` picks the connection string in this order:

1. `DATABASE_URL_DIRECT`, but only when `DATABASE_CONNECTION` is `direct` (set by `pnpm migrate`).
2. `DATABASE_URL`, which always wins over the local default.
3. If neither is set and `NODE_ENV` is `production` outside the build phase, it throws. Production never falls back to a local database.
4. Otherwise the embedded development database from `pnpm db:dev`.

`next build` sets `NEXT_PHASE=phase-production-build` and opens no connections, so the build succeeds without a database URL. See [Database and migrations](../data/database.md).

### Media storage

`readS3Settings` treats the four required S3 variables as all-or-nothing. With none set it returns `null` and Payload writes uploads to `./media`. With some but not all set it throws at startup and names the missing ones, so a half-configured production never silently writes to the container disk. `S3_REGION` defaults to `auto` and `MEDIA_BASE_URL` loses any trailing slash. See [Media storage](../media/storage.md).

### Dev environment detection

`isDevEnvironment` returns true when either `APP_ENV` or `RAILWAY_ENVIRONMENT_NAME` equals `dev`, ignoring case and surrounding spaces. The dev gate, `robots.txt` and the Sentry environment all use it. When dev is detected but either basic-auth credential is blank, the gate answers `503` to everything instead of serving the site open. See [Dev environment gate](../operations/dev-gate.md).

### Sentry

`sentryServerOptions` returns options only when `SENTRY_DSN` is set and the environment resolves to `dev` or `production` (through `APP_ENV` or `RAILWAY_ENVIRONMENT_NAME`). Locally and in CI it returns `undefined` and the SDK never initializes. See [Error monitoring with Sentry](../operations/error-monitoring.md).

### Deployed commit

`deployedCommit` returns the first non-blank value of `RAILWAY_GIT_COMMIT_SHA` and then `GIT_COMMIT_SHA`. Railway injects the first for git-sourced deploys (dev). Production is deployed with `railway up`, which uploads files without git metadata, so the release workflow writes `GIT_COMMIT_SHA` before deploying. The health endpoint reports `dev` when neither exists.

## Railway variable declarations

`.railway/railway.ts` declares every Railway variable for the `web` service. Secrets use `preserve()`, which keeps the value already stored in Railway and never creates one, so secrets are entered in the Railway dashboard. A variable missing from this file is deleted by `railway config apply`, so any new Railway variable must be declared here first. The file sets `APP_ENV=dev` and the basic-auth pair only for `dev`, and `GIT_COMMIT_SHA` only for `production`.

## Test isolation from real databases

Tests never trust a `DATABASE_URL` that might come from `.env`:

- The Playwright configs load only the three `E2E_*` keys from `.env` (`loadE2eEnvFromFile` in `tests/e2e/app-server.ts`), and the smoke variables only from the process environment.
- E2E servers and the integration setup set `DATABASE_URL_DIRECT` to the same value as `DATABASE_URL`, because `pnpm migrate` prefers the direct URL and a value inherited from the shell would migrate a real database.
- `integrationEnv` blanks every `S3_*` variable and `MEDIA_BASE_URL`, so integration uploads go to local disk.

See [Test suites](../testing/test-suites.md).
