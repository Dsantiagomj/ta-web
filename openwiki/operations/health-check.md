---
type: api
title: Health and readiness endpoints
description: The public GET /api/health liveness endpoint, which never touches the database, and GET /api/ready, which pings Postgres with bounded time and without poisoning the pool; their response contracts, the single-flight database check, and who calls each.
tags: [operations, health-check, api, postgres, monitoring]
sources:
  - id: openwiki-source-d60a6f0f1e9b6eab797ff859
    resource: repo://.railway/railway.ts
  - id: openwiki-source-2615540ec7553288b52f775d
    resource: repo://docs/legacy/infra.md
  - id: openwiki-source-e6259e232b376ac021274244
    resource: repo://src/endpoints/health.ts
  - id: openwiki-source-c2422c944d24c107c4548327
    resource: repo://src/endpoints/ready.ts
  - id: openwiki-source-2c42ff828c6d8e213a2f7416
    resource: repo://src/payload.config.ts
  - id: openwiki-source-a493eb920ff6a7f8859a6c69
    resource: repo://tests/e2e/smoke.spec.ts
  - id: openwiki-source-bf91a85433a2b4f753ed6ec4
    resource: repo://tests/unit/health.test.ts
  - id: openwiki-source-a1c0ffa5bc07218f51606c8e
    resource: repo://tests/unit/ready.test.ts
generated: { by: "claude-code", at: "2026-11-14T11:00:46.827Z" }
verified:
  - by: openwiki/0.4.3
    at: 2026-11-14T11:00:46.827Z
---

# Health and readiness endpoints

Two public Payload custom endpoints report on a running app. Both are registered in `src/payload.config.ts` and mounted under `/api` by Payload's REST catch-all route.

- `GET /api/health` (`src/endpoints/health.ts`) is the liveness check: the process answers, with the version and commit it serves. It never touches the database.
- `GET /api/ready` (`src/endpoints/ready.ts`) is the readiness check: the same, plus a database ping.

## Why two endpoints

Until 2026-11-13 `/api/health` pinged the database on every call. The uptime monitors call it every few minutes, and a query on each call kept the Neon compute from scaling to zero; on 2026-11-13 that used up the quota and took dev and production down. Since then `/api/health` only says the process responds, and the database check lives in `/api/ready`, which nothing calls periodically: the smoke tests after a deploy and a person checking by hand. `healthEndpoint`'s handler does not even take the request, so it has no way to reach `req.payload.db`.

A database that does not answer still stops a deploy: Railway runs `pnpm migrate` before the new version starts, and the migration fails without a connection (see [Deployment and releases](deployment.md)).

## Contract

`GET /api/health` always returns `200` with `{ "status": "ok", "version": "<release version>", "commit": "<sha or dev>" }`.

`GET /api/ready`:

| Database | Status | Body |
|---|---|---|
| Answers within 2 s | `200` | `{ "status": "ok", "db": "ok", "version": "<release version>", "commit": "<sha or dev>" }` |
| Fails or times out | `503` | `{ "status": "error", "db": "error" }` |

Every response from both has `Cache-Control: no-store`.

Both are public, so they never include error messages, stack traces or anything secret. The readiness failure body is deliberately bare: the underlying error could contain the database URL.

`commit` comes from `resolveCommit`, which returns the deployed commit (`RAILWAY_GIT_COMMIT_SHA`, then `GIT_COMMIT_SHA`) or `dev` when neither is set or both are blank. `version` comes from `resolveVersion`: `APP_VERSION` (trimmed), which the release workflow sets in production to the tag's version without the `v`, or the `package.json` version (`0.0.0`) when it is missing or blank, as in dev and local runs. `ready.ts` imports both from `health.ts`.

## Who uses them

| Consumer | Endpoint | How |
|---|---|---|
| Railway | `/api/health` | Service health check (`healthcheck: '/api/health'`, 120 s timeout). A new deploy only receives traffic once the process answers |
| `Smoke de dev` workflow | `/api/health` | Polls until `commit` equals the deployed SHA before running the smoke suite |
| `Release` workflow | `/api/health` | Polls production until `commit` equals the tagged SHA |
| `@smoke` Playwright tests | both | `/api/health`: `200`, `no-store`, `status` `ok` and no `db` field. `/api/ready`: `200` with `status` and `db` both `ok` |
| Uptime monitors (Better Stack) | `/api/health` | Ping dev and production every 3 minutes; down when the body lacks `"status":"ok"` |

In the dev environment both answer like every other route, with the `noindex` header (see [Dev environment: public, never indexed](dev-gate.md)).

## How the database ping works

`pingPool(pool, timeoutMs)` in `ready.ts` uses the Postgres adapter's `pg` pool directly and bounds the time at both ends.

1. **Acquire** a client with a 2 s timeout. If acquisition times out, the client may still arrive later; when it does it is released with `release(true)`, which destroys it instead of returning it to the pool.
2. **Query** inside a transaction: `begin`, `set local statement_timeout = '<timeout>ms'`, `select 1`, `commit`. `set local` scopes the limit to that transaction, so it never sticks to a pooled connection. The whole sequence is also wrapped in the same client-side timeout.
3. **Release**: a healthy client goes back to the pool; one that failed or timed out is destroyed (`release(true)`). A stuck or broken connection never returns to the pool to be handed to a real request.

`withTimeout` races the work against a timer and always clears the timer.

## Single flight

A module-level `inFlight` promise in `ready.ts` holds the database check in progress. Concurrent requests await that same promise instead of starting their own ping, so a hung database plus callers that keep polling does not pile up connections. The promise resolves to a boolean, not a `Response`, because a response body can only be read once; each request builds its own response. The promise is cleared in `finally`, so the next request after it settles starts a fresh check.

## Tests

- `tests/unit/health.test.ts`: `checkLiveness` answers `200` with version and commit and says nothing about the database; `healthEndpoint` never touches the database and is mounted on `GET /health`; `resolveCommit` (Railway's SHA wins, then `GIT_COMMIT_SHA`, then `dev`; blank values count as missing); `resolveVersion` (`APP_VERSION` wins and is trimmed; missing or blank falls back to the `package.json` version).
- `tests/unit/ready.test.ts` uses fake pools and timers: `checkReady` answers `200` with version and commit, `503` without error details on failure or timeout, and shares one check between simultaneous requests; `pingPool` sets the local statement timeout and returns the client to the pool, destroys the client when the query times out, and destroys a client that arrives after the acquisition timeout without running any query; `readyEndpoint` is mounted on `GET /ready`.
- `tests/e2e/smoke.spec.ts` runs both checks against a deployed URL (see [Deployment and releases](deployment.md#reusable-smoke-workflow)).

## Related pages

- [Deployment and releases](deployment.md)
- [Dev environment: public, never indexed](dev-gate.md)
- [Request pipeline](../architecture/request-pipeline.md)
