---
type: api
title: Health check endpoint
description: The public GET /api/health endpoint, its response contract, how it pings Postgres with bounded time and without poisoning the pool, how concurrent checks share one ping, and who depends on it.
tags: [operations, health-check, api, postgres, monitoring]
verified:
  - by: openwiki/0.4.3
    at: 2026-11-04T00:16:52.047Z
sources:
  - id: openwiki-source-d60a6f0f1e9b6eab797ff859
    resource: repo://.railway/railway.ts
  - id: openwiki-source-e6259e232b376ac021274244
    resource: repo://src/endpoints/health.ts
  - id: openwiki-source-a493eb920ff6a7f8859a6c69
    resource: repo://tests/e2e/smoke.spec.ts
  - id: openwiki-source-bf91a85433a2b4f753ed6ec4
    resource: repo://tests/unit/health.test.ts
generated: { by: "claude-code", at: "2026-11-04T00:16:52.047Z" }
---

# Health check endpoint

`GET /api/health` tells a caller whether the app is up, whether its database answers, and which version and commit it is serving. It is a Payload custom endpoint (`src/endpoints/health.ts`) registered in `src/payload.config.ts` and mounted under `/api` by Payload's REST catch-all route.

## Contract

| Database | Status | Body |
|---|---|---|
| Answers within 2 s | `200` | `{ "status": "ok", "db": "ok", "version": "<package.json version>", "commit": "<sha or dev>" }` |
| Fails or times out | `503` | `{ "status": "error", "db": "error" }` |

Every response has `Cache-Control: no-store`.

The endpoint is public, so it never includes error messages, stack traces or anything secret. The failure body is deliberately bare: the underlying error could contain the database URL.

`commit` comes from `resolveCommit`, which returns the deployed commit (`RAILWAY_GIT_COMMIT_SHA`, then `GIT_COMMIT_SHA`) or `dev` when neither is set or both are blank. `version` is the `version` field of `package.json`.

## Who uses it

| Consumer | How |
|---|---|
| Railway | Service health check (`healthcheck: '/api/health'`, 120 s timeout). A new deploy only receives traffic once it returns `200`, so an app that cannot reach its database never goes live |
| `Smoke de dev` workflow | Polls until `commit` equals the deployed SHA before running the smoke suite |
| `Release` workflow | Polls production until `commit` equals the tagged SHA |
| `@smoke` Playwright test | Expects `200`, `no-store` and `status`/`db` both `ok` |
| Uptime monitors | Ping dev and production |

In the dev environment this is the only path the basic-auth gate lets through without credentials, so monitors and workflows can reach it without the password. See [Dev environment gate](dev-gate.md).

## How the database ping works

`pingPool(pool, timeoutMs)` uses the Postgres adapter's `pg` pool directly and bounds the time at both ends.

1. **Acquire** a client with a 2 s timeout. If acquisition times out, the client may still arrive later; when it does it is released with `release(true)`, which destroys it instead of returning it to the pool.
2. **Query** inside a transaction: `begin`, `set local statement_timeout = '<timeout>ms'`, `select 1`, `commit`. `set local` scopes the limit to that transaction, so it never sticks to a pooled connection. The whole sequence is also wrapped in the same client-side timeout.
3. **Release**: a healthy client goes back to the pool; one that failed or timed out is destroyed (`release(true)`). A stuck or broken connection never returns to the pool to be handed to a real request.

`withTimeout` races the work against a timer and always clears the timer.

## Single flight

A module-level `inFlight` promise holds the database check in progress. Concurrent requests await that same promise instead of starting their own ping, so a hung database plus monitors that keep polling does not pile up connections. The promise resolves to a boolean, not a `Response`, because a response body can only be read once; each request builds its own response. The promise is cleared in `finally`, so the next request after it settles starts a fresh check.

## Tests

`tests/unit/health.test.ts` uses fake pools and timers:

- `checkHealth`: `200` with version and commit; `503` without error details on failure; `503` on timeout; one shared check for simultaneous requests.
- `pingPool`: sets the local statement timeout and returns the client to the pool; destroys the client when the query times out; destroys a client that arrives after the acquisition timeout without running any query.
- `resolveCommit`: Railway's SHA wins, then `GIT_COMMIT_SHA`, then `dev`; blank values count as missing.

## Related pages

- [Deployment and releases](deployment.md)
- [Dev environment gate](dev-gate.md)
- [Request pipeline](../architecture/request-pipeline.md)
