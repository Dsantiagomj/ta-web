---
type: operations
title: Deployment and releases
description: How ta-web reaches Railway, from the infrastructure-as-code service definition through dev auto-deploys with a post-deploy smoke to the owner-only production release workflow.
tags: [deployment, railway, release, github-actions, smoke-tests]
verified:
  - by: openwiki/0.4.3
    at: 2026-11-04T00:16:52.047Z
sources:
  - id: openwiki-source-e8a8d74e045abdf58230a543
    resource: repo://.github/workflows/deploy-dev-smoke.yml
  - id: openwiki-source-4d1d392666be6dfdd7a91a2e
    resource: repo://.github/workflows/release.yml
  - id: openwiki-source-42271e2e50bb89647a0cb594
    resource: repo://.github/workflows/smoke.yml
  - id: openwiki-source-d60a6f0f1e9b6eab797ff859
    resource: repo://.railway/railway.ts
  - id: openwiki-source-6d7290acd85912e8a5ebb6cc
    resource: repo://tests/unit/railway-config.test.ts
generated: { by: "claude-code", at: "2026-11-04T00:16:52.047Z" }
---

# Deployment and releases

The app runs as one long-lived Node container per environment on Railway: service `web`, environments `dev` and `production`. The same build serves both; behavior that differs (dev gate, robots, Sentry environment) is read from the environment at runtime.

```
PR ──▶ CI (Pruebas required) ──▶ merge to main
                                   │
                                   ├─▶ Railway dev: GitHub source, deploys main after checks pass
                                   │      └─▶ deployment_status ─▶ "Smoke de dev" workflow
                                   │
                                   └─▶ "Release" workflow (manual, owner only)
                                          tag vX.Y.Z ─▶ approve ─▶ railway up ─▶ verify commit ─▶ smoke prod
```

## Service definition: `.railway/railway.ts`

The service is described as code with `railway/iac`. Railway does not read this file on deploy; it is applied by hand per environment with `railway config plan` and `railway config apply`.

| Setting | Value |
|---|---|
| Builder | Railpack, `RAILPACK_NODE_VERSION=24.22.2` |
| Build / start | `pnpm build` / `pnpm start` |
| Pre-deploy | `pnpm migrate`, timeout 600 s |
| Health check | `/api/health`, timeout 120 s (room for a Neon compute waking up) |
| Restart policy | `ON_FAILURE`, up to 5 retries |
| Replicas | 1, in `us-east4-eqdc4a` (US East, next to Neon `us-east-1`) |
| Source | `dev`: GitHub `main` with `checkSuites: true`. `production`: none |

The function throws for any environment other than `dev` or `production` rather than guessing. Secrets use `preserve()`, which keeps the value stored in Railway and never writes one; `config apply` deletes undeclared variables, so declare a new variable here before creating it. See [Environment configuration](../architecture/configuration.md).

`tests/unit/railway-config.test.ts` evaluates the file for both environments: build and start commands, migration with timeout, health check and restart policy, region, secrets preserved, dev wired to GitHub with the gate on, production without a GitHub source and with `GIT_COMMIT_SHA`, and unknown environments rejected.

### What protects a deploy

1. `pnpm migrate` runs before the new version starts. If it fails or times out, the deploy stops and the previous version keeps serving.
2. Railway waits for `/api/health` to return `200`, which requires the database to answer. See [Health check endpoint](health-check.md).
3. A crashed process restarts up to five times.

There is no automatic down-migration. A bad migration is fixed by a new forward migration.

## Dev: continuous deploys

Railway deploys every push to `main` once GitHub's check suites pass. It reports the result as a GitHub deployment, and `.github/workflows/deploy-dev-smoke.yml` listens to `deployment_status`:

1. It runs only for a `success` state on an environment containing `dev`. Successful dev deploys share one concurrency group, so a newer deploy cancels an older smoke; other events get their own group and never cancel it.
2. It takes the app URL from the `DEV_URL` repository variable, not from the event: Railway's `environment_url` points at its dashboard. `DEV_URL` must start with `https://`, otherwise the job fails before any credentials are sent.
3. It polls `DEV_URL/api/health` every 10 s, up to 30 times, until the reported `commit` equals the deployed SHA. Railway can mark the deploy done while the old version still serves for a few seconds.
4. It calls the reusable smoke workflow with `DEV_URL` and the `SMOKE_BASIC_AUTH_*` secrets.

## Production: the Release workflow

`.github/workflows/release.yml` is started by hand (`workflow_dispatch`) from `main` with a `version` input. Releases never overlap (`concurrency: release`, no cancellation).

**Job `release`** (contents write, checks read):

1. Fails unless both `github.actor` and `github.triggering_actor` are the repository owner. Checking both stops a re-run by someone else from slipping through. GitHub does not offer required reviewers on environments for private repositories, so this is the approval gate.
2. Fails unless the ref is `refs/heads/main` and `version` matches the official semver.org regex (no `v` prefix). A version with a prerelease suffix (`1.2.3-rc.1`) marks the GitHub release as a prerelease.
3. Fails unless the latest `Pruebas` check run on the commit concluded `success`.
4. Creates tag `vX.Y.Z` and its GitHub release with generated notes. If the tag already exists on the same commit, it reuses it (retrying a failed deploy) and creates the release only if missing. A tag on a different commit is never moved; the job fails and asks for another version.

**Job `deploy`** (GitHub environment `production`):

1. Repeats the owner check.
2. Requires the `RAILWAY_TOKEN` secret and an `https://` `PROD_URL` variable.
3. Checks out the tag and installs a pinned Railway CLI.
4. Sets `GIT_COMMIT_SHA` on the production service with `--skip-deploys`. `railway up` uploads files without git metadata, so Railway would not inject `RAILWAY_GIT_COMMIT_SHA`.
5. Runs `railway up` without `--detach`, so the job waits for pre-deploy migrations and the health check and fails if they fail.
6. Polls `PROD_URL/api/health` until it reports the tagged commit (up to 5 minutes).

**Job `smoke`** calls the reusable smoke workflow against `PROD_URL`.

## Reusable smoke workflow

`.github/workflows/smoke.yml` runs on `workflow_call` (with `base_url` and optional basic-auth secrets) or by hand. It installs dependencies and Chromium (cached by Playwright version) and runs `pnpm test:smoke` with `SMOKE_BASE_URL` set, which makes Playwright test the remote URL without building or starting anything locally. The `@smoke` tests only read: home page, `/admin` and `/api/health`. See [Test suites](../testing/test-suites.md).

## Related pages

- [Health check endpoint](health-check.md)
- [CI and quality gates](../workflows/ci-and-quality-gates.md)
- [Database and migrations](../data/database.md)
- [Environment configuration](../architecture/configuration.md)
