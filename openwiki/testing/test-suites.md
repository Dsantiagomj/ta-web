---
type: testing
title: Test suites
description: The five test suites (unit, integration, E2E, dev-gate E2E and smoke), what each one covers, how each provisions its database and app server, and the guards that keep tests away from real databases.
tags: [testing, vitest, playwright, integration, e2e]
verified:
  - by: openwiki/0.4.3
    at: 2026-11-04T00:16:52.047Z
sources:
  - id: openwiki-source-5e753d9d77984cb67aae1517
    resource: repo://playwright.config.ts
  - id: openwiki-source-e97ce5e3668d477e63c70413
    resource: repo://playwright.dev-gate.config.ts
  - id: openwiki-source-15d81576125ffd9d62dc8605
    resource: repo://tests/e2e/app-server.ts
  - id: openwiki-source-c04b26872daa30d9d3f5983e
    resource: repo://tests/e2e/robots.spec.ts
  - id: openwiki-source-a493eb920ff6a7f8859a6c69
    resource: repo://tests/e2e/smoke.spec.ts
  - id: openwiki-source-450b6a23d7e25100eadc359f
    resource: repo://tests/integration/global-setup.ts
  - id: openwiki-source-dbcd0524c9464e05f7f54ade
    resource: repo://tests/integration/payload.ts
  - id: openwiki-source-56eed4e45701ea6820d33662
    resource: repo://tests/unit/test-database-env.test.ts
  - id: openwiki-source-b58f839a189d87a7e1f37d39
    resource: repo://vitest.config.mts
  - id: openwiki-source-57da85ca1bb457973a5594ff
    resource: repo://vitest.integration.config.mts
generated: { by: "claude-code", at: "2026-11-04T00:16:52.047Z" }
---

# Test suites

The repo works test-first (AGENTS.md: strict TDD). There are five suites. All of them run in CI except smoke, which runs after deploys.

| Suite | Command | Runner | Location | Needs |
|---|---|---|---|---|
| Unit | `pnpm test` | Vitest | `tests/unit/` | Nothing |
| Integration | `pnpm test:integration` | Vitest | `tests/integration/` | Postgres, migrations |
| E2E | `pnpm test:e2e` | Playwright | `tests/e2e/` | Production build, Postgres, migrations |
| Dev gate | `pnpm test:e2e:dev-gate` | Playwright | `tests/e2e-dev-gate/` | Same build, `APP_ENV=dev` |
| Smoke | `pnpm test:smoke` | Playwright (`@smoke` subset) | `tests/e2e/` | A local server, or a deployed URL |

## Unit

`vitest.config.mts` runs `tests/unit/**/*.test.ts` in the Node environment, with `vite-tsconfig-paths` so `@/…` imports work. Unit tests target the pure resolvers and builders that take an `env` record, which is why most server logic is written that way:

- configuration: `database-url`, `media-storage`, `sentry-options`, `railway-config` (evaluates `.railway/railway.ts` for each environment), `next-config`, `test-database-env`;
- behavior: `health` (fake pool and timers), `dev-gate`, `robots`, `theme`, `mode-script`, `mode-toggle-strings`, `media-collection`;
- tooling: `commit-msg` (runs the git hook script).

## Integration

Real Payload (`getPayload`) against a real Postgres with the committed migrations applied. They check rules that only exist at runtime, such as collection access.

- `vitest.integration.config.mts` runs `tests/integration/**/*.test.ts` with a global setup, `fileParallelism: false` (all files share one database), a 30 s test timeout and a 120 s hook timeout.
- `integrationEnv` sets the environment: `DATABASE_URL` from the shell or the embedded `ta_web_integration` database, `DATABASE_URL_DIRECT` forced to the same URL, a dummy `PAYLOAD_SECRET` when none is set, and every `S3_*` and `MEDIA_BASE_URL` blanked so uploads go to `./media`.
- `tests/integration/global-setup.ts`: with no `DATABASE_URL`, it starts `pnpm db:dev` if port 54329 is closed (and stops it afterwards, or on setup failure), recreates `ta_web_integration`, then runs `pnpm migrate`. With `DATABASE_URL` (CI's empty Postgres service) it only migrates.
- Helpers in `tests/integration/payload.ts`: `startPayload`, `tinyPng` (a 1×1 PNG in memory) and `createPanelUser` (creates and logs in a panel user, returning what Payload puts in `req.user`).
- Access tests call the local API with `overrideAccess: false`; omitting `user` makes the call anonymous. See [Collections and access](../cms/collections.md).

## E2E

`playwright.config.ts` tests the app on the production path, never `next dev`:

1. `pnpm build` (skipped with `E2E_SKIP_BUILD=1`).
2. With no `DATABASE_URL`: start `pnpm db:dev` (reusing a running one) and reset `ta_web_e2e` with `scripts/db-e2e-reset.ts`.
3. `pnpm migrate` on the empty database.
4. `pnpm start --port 3100` (`E2E_PORT`), a port of its own so a running `pnpm dev` on 3000 is never reused by mistake.

`appWebServers` in `tests/e2e/app-server.ts` builds that server list and passes `DATABASE_URL_DIRECT` equal to `DATABASE_URL`, because `pnpm migrate` prefers the direct URL. Only Chromium runs. In CI: one worker, one retry, traces on first retry, GitHub and HTML reporters, and `forbidOnly`.

Specs:

- `smoke.spec.ts`: home renders in Arcano dark; the toggle switches to light and the mode survives reload; the egg medallion per mode and its hover state; the head script recovers the mode from `localStorage` without a cookie; `/admin` responds and hydrates the first-user form without errors; `/api/health` is ok.
- `robots.spec.ts`: outside dev, `robots.txt` allows indexing except `/admin`, and the home page has no `X-Robots-Tag`.

## Dev gate

`playwright.dev-gate.config.ts` starts two instances of the same build: one with `APP_ENV=dev` and the test credentials on port 3101 (`E2E_DEV_GATE_PORT`), and one with `APP_ENV=dev` and blank credentials on the next port, waited for by port because it answers `503` everywhere. With `E2E_SKIP_BUILD=1` it reuses the E2E build, which works because the gate reads the environment at startup, not at build. Cases are in [Dev environment gate](../operations/dev-gate.md).

## Smoke

`pnpm test:smoke` runs only tests tagged `@smoke` (home, `/admin`, `/api/health`). They only read, so they are safe against dev or production.

- Without `SMOKE_BASE_URL` it behaves like E2E and starts a local server.
- With `SMOKE_BASE_URL` it tests that URL and starts nothing: no build, no migrations, no database.
- `SMOKE_BASIC_AUTH_USER` and `SMOKE_BASIC_AUTH_PASSWORD` become Playwright `httpCredentials` only when both are set.

## Guards against touching real data

- Playwright reads only `E2E_PORT`, `E2E_DEV_GATE_PORT` and `E2E_SKIP_BUILD` from `.env` (`loadE2eEnvFromFile`); a `DATABASE_URL` in `.env` never reaches the tests, and the smoke variables come only from the shell. The process environment always wins.
- E2E and integration use their own databases (`ta_web_e2e`, `ta_web_integration`), dropped and recreated per run, so local dev data in `ta_web` is untouched.
- Both force `DATABASE_URL_DIRECT` to the test database so `pnpm migrate` cannot follow a direct URL inherited from the shell. `tests/unit/test-database-env.test.ts` pins this.

## Related pages

- [CI and quality gates](../workflows/ci-and-quality-gates.md)
- [Database and migrations](../data/database.md)
- [Dev environment gate](../operations/dev-gate.md)
