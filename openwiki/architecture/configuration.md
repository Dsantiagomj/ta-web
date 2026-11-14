---
type: reference
title: Environment configuration
description: Every environment variable the app, the tests and the GitHub workflows read, who sets it, and how each resolver turns it into behavior, including the cases that refuse to start.
tags: [configuration, environment, secrets, railway]
sources:
  - id: openwiki-source-5f5b95b3d6a215fa02ceb945
    resource: repo://.env.example
  - id: openwiki-source-4d1d392666be6dfdd7a91a2e
    resource: repo://.github/workflows/release.yml
  - id: openwiki-source-ea70eb6c045047448e446296
    resource: repo://.gitignore
  - id: openwiki-source-d60a6f0f1e9b6eab797ff859
    resource: repo://.railway/railway.ts
  - id: openwiki-source-7382aecd8b46a81ca66efc96
    resource: repo://lighthouserc.cjs
  - id: openwiki-source-5b54a58d1b51cd490b0e7162
    resource: repo://package.json
  - id: openwiki-source-5e753d9d77984cb67aae1517
    resource: repo://playwright.config.ts
  - id: openwiki-source-de5a7370ff2798c2513d3fab
    resource: repo://scripts/hooks/gga-review.sh
  - id: openwiki-source-f0b0dfee6a793bb5e8050714
    resource: repo://scripts/lhci-env.ts
  - id: openwiki-source-95f46342bb37caacc4ce1dbc
    resource: repo://scripts/lhci.ts
  - id: openwiki-source-63cbcc482c18e4f9ce5d0888
    resource: repo://scripts/refresh-quests.ts
  - id: openwiki-source-b6d2ac28f484617caef7e1ad
    resource: repo://scripts/review-release.ts
  - id: openwiki-source-7a2845694b67f1018000b585
    resource: repo://src/app/(frontend)/layout.tsx
  - id: openwiki-source-e6259e232b376ac021274244
    resource: repo://src/endpoints/health.ts
  - id: openwiki-source-2ad419cae2f45e97a3ca23d7
    resource: repo://src/lib/db/database-url.ts
  - id: openwiki-source-d71565e37020ac0fe77be60d
    resource: repo://src/lib/deploy/commit.ts
  - id: openwiki-source-cbc6ab52e896365649760a9f
    resource: repo://src/lib/dev-gate/design-catalog.ts
  - id: openwiki-source-6b31d93be9f7026d5af1d752
    resource: repo://src/lib/dev-gate/dev-gate.ts
  - id: openwiki-source-2ce84534e6026072681beb8b
    resource: repo://src/lib/dev-gate/robots.ts
  - id: openwiki-source-4ce5bfd40fc86e2e8680d71f
    resource: repo://src/lib/dofusdb/refresh-quests.ts
  - id: openwiki-source-47a80445306e82d0ef444872
    resource: repo://src/lib/media/storage.ts
  - id: openwiki-source-c31449ae998e78dd836b84bc
    resource: repo://src/lib/monitoring/sentry.ts
  - id: openwiki-source-2e24cfbb628a19f71e2bf154
    resource: repo://src/lib/site/origin.ts
  - id: openwiki-source-2c42ff828c6d8e213a2f7416
    resource: repo://src/payload.config.ts
  - id: openwiki-source-f34ac1e549d94dc3ac475ae4
    resource: repo://src/proxy.ts
  - id: openwiki-source-15d81576125ffd9d62dc8605
    resource: repo://tests/e2e/app-server.ts
  - id: openwiki-source-ba0c02c20c1203ccdd8a9159
    resource: repo://tests/integration/env.ts
  - id: openwiki-source-e73350ef868f2379d51909ed
    resource: repo://tests/unit/dofusdb-write-concurrency.test.ts
generated: { by: "claude-code", at: "2026-11-14T11:00:46.827Z" }
verified:
  - by: openwiki/0.4.3
    at: 2026-11-14T11:00:46.827Z
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
| `NEXT_PUBLIC_SITE_URL` | `siteUrl` and `SITE_URL` in `src/lib/site/origin.ts`: `metadataBase` in `src/app/(frontend)/layout.tsx`, canonical URLs, the JSON-LD, the `robots.txt` sitemap line, `/sitemap.xml` and the `Location` of legacy redirects. Trailing slashes are dropped. Required in production; development and tests fall back to `http://localhost:3000` | `.env`, Railway; the E2E and Lighthouse servers set it to their own `localhost` port |
| `APP_ENV` | `isDevEnvironment` (the `noindex` header, `robots.txt`, the `/sistema` catalog), `sentryServerOptions` | Railway `dev` sets `dev`; empty locally and in production |
| `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_REGION`, `MEDIA_BASE_URL` | `readS3Settings` (`src/lib/media/storage.ts`) | Railway |
| `SENTRY_DSN` | `sentryServerOptions` (`src/lib/monitoring/sentry.ts`) | Railway |
| `SENTRY_AUTH_TOKEN` | `next.config.ts`, at build time | Railway (declared, not yet populated) |
| `DOFUSDB_WRITE_CONCURRENCY` | `writeConcurrencyFromEnv` (`src/lib/dofusdb/refresh-quests.ts`), only for `pnpm data:quests` | `.env` or the shell; empty means 8 |
| `GIT_COMMIT_SHA` | `deployedCommit` (`src/lib/deploy/commit.ts`) | The release workflow, for production |
| `APP_VERSION` | `resolveVersion` (`src/endpoints/health.ts`) | The release workflow, for production; falls back to the `package.json` version |
| `RAILWAY_GIT_COMMIT_SHA`, `RAILWAY_ENVIRONMENT_NAME` | `deployedCommit`, `isDevEnvironment`, Sentry | Injected by Railway |
| `E2E_PORT`, `E2E_DEV_GATE_PORT`, `E2E_SKIP_BUILD` | Playwright configs; `pnpm test:lhci` also reads `E2E_SKIP_BUILD` | `.env` or the shell |
| `E2E_DESIGN_CATALOG` | `isDesignCatalogEnabled` (`src/lib/dev-gate/design-catalog.ts`): `1` opens `/sistema` on a production build | Only `playwright.config.ts`, for the `pnpm test:e2e` app; never a deployed environment |
| `CHROME_PATH` | `scripts/lhci.ts`: the browser Lighthouse measures with; Playwright's Chromium when empty | The process environment only, not `.env` |
| `SMOKE_BASE_URL` | `playwright.config.ts` | The shell or the smoke workflow; never `.env` |
| `RAILWAY_TOKEN`, `PROD_URL`, `DEV_URL` | GitHub workflows only | GitHub environment secrets and repository variables |
| `GGA_CLAUDE_MODEL` | `scripts/hooks/gga-review.sh`: exported as `ANTHROPIC_MODEL` for the per-commit gga review; empty means `claude-sonnet-5-5` | The shell; local tooling only, the app never reads it |
| `LHCI_SHARD` | `lighthouserc.cjs`: `1/2` or `2/2` measures one contiguous part of the page list; unset measures every page; a malformed value or more parts than pages throws | CI's two budget jobs; unset locally |
| `RELEASE_REVIEW_MODEL`, `RELEASE_REVIEW_JOBS`, `RELEASE_REVIEW_TIMEOUT_MINUTES`, `RELEASE_REVIEW_BATCH_CHARS` | `scripts/review-release.ts` (`pnpm review:release`): model, parallel batches, minutes per batch and diff characters per batch; empty means `fable`, 3, 20 and 120000 | The shell; local tooling only. See [Release review](../workflows/release-review.md) |

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

`isDevEnvironment` returns true when either `APP_ENV` or `RAILWAY_ENVIRONMENT_NAME` equals `dev`, ignoring case and surrounding spaces. The proxy, `robots.txt`, the design catalog and the Sentry environment all use it. Dev is public, with no basic auth: when dev is detected, the proxy adds `X-Robots-Tag: noindex, nofollow` to every response and `robots.txt` disallows everything. See [Dev environment gate](../operations/dev-gate.md).

### The public origin

`siteUrl(env, fallback)` in `src/lib/site/origin.ts` returns `NEXT_PUBLIC_SITE_URL` trimmed and without trailing slashes. When the variable is missing it returns the fallback (`http://localhost:3000` by default), except when `NODE_ENV` is `production` outside `next build` (`NEXT_PHASE` is not `phase-production-build`): then it throws, like the database URL does. The public origin never comes from the request, because behind Railway's proxy the request only knows the internal host. `SITE_URL` is `siteUrl(process.env)`, read once when the server starts. The proxy calls `siteUrl` with the request's own origin as the fallback when it builds a redirect (see [Redirects, sitemap and robots](../operations/redirects-and-seo.md)).

### Sentry

`sentryServerOptions` returns options only when `SENTRY_DSN` is set and the environment resolves to `dev` or `production` (through `APP_ENV` or `RAILWAY_ENVIRONMENT_NAME`). Locally and in CI it returns `undefined` and the SDK never initializes. See [Error monitoring with Sentry](../operations/error-monitoring.md).

### Deployed commit

`deployedCommit` returns the first non-blank value of `RAILWAY_GIT_COMMIT_SHA` and then `GIT_COMMIT_SHA`. Railway injects the first for git-sourced deploys (dev). Production is deployed with `railway up`, which uploads files without git metadata, so the release workflow writes `GIT_COMMIT_SHA` before deploying. The health endpoint reports `dev` when neither exists.

### Deployed version

`resolveVersion` returns `APP_VERSION` (trimmed) or, when it is missing or blank, the `package.json` version. `package.json` stays at `0.0.0` and is not bumped per release; instead the release workflow writes the tag's version, without the `v`, to `APP_VERSION` on the production service next to `GIT_COMMIT_SHA`. Dev and local runs therefore report the `package.json` version.

### DofusDB write concurrency

`writeConcurrencyFromEnv` reads `DOFUSDB_WRITE_CONCURRENCY` for `pnpm data:quests`. Empty or unset gives `DEFAULT_WRITE_CONCURRENCY`, 8. Any value that is not a whole number of at least 1 (`0`, `-2`, `1.5`, `ocho`) throws instead of falling back to the default. The script reads it before starting Payload, so a typo fails at once. Each concurrent write holds one connection from the Postgres pool, which keeps pg's default of 10, so `.env.example` advises staying at 9 or below. See [DofusDB game data refresh](../data/dofusdb-refresh.md#write-concurrency).

## Railway variable declarations

`.railway/railway.ts` declares every Railway variable for the `web` service. Secrets use `preserve()`, which keeps the value already stored in Railway and never creates one, so secrets are entered in the Railway dashboard. A variable missing from this file is deleted by `railway config apply`, so any new Railway variable must be declared here first. The file sets `APP_ENV=dev` only for `dev`, and `GIT_COMMIT_SHA` and `APP_VERSION` only for `production`.

## Test isolation from real databases

Tests never trust a `DATABASE_URL` that might come from `.env`:

- The Playwright configs load only the three `E2E_*` keys from `.env` (`loadE2eEnvFromFile` in `tests/e2e/app-server.ts`), and the smoke variables only from the process environment.
- `pnpm test:lhci` loads the same three keys through `loadE2eEnvFromFile`, then overrides the app's environment with `lhciEnv` (`scripts/lhci-env.ts`): its own database for both URLs, a dummy `PAYLOAD_SECRET` when none is set, `NEXT_PUBLIC_SITE_URL` set to the local server, `APP_ENV` blank so it measures the public site rather than the dev gate, and every `S3_*` variable and `MEDIA_BASE_URL` blank. See [Performance budgets](../testing/performance-budgets.md).
- E2E servers and the integration setup set `DATABASE_URL_DIRECT` to the same value as `DATABASE_URL`, because `pnpm migrate` prefers the direct URL and a value inherited from the shell would migrate a real database. The E2E app server also blanks every `S3_*` variable and `MEDIA_BASE_URL`, so the seeded image goes to local disk.
- `integrationEnv` blanks every `S3_*` variable and `MEDIA_BASE_URL`, so integration uploads go to local disk.

See [Test suites](../testing/test-suites.md).
