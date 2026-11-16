---
type: operations
title: Deployment and releases
description: How ta-web reaches Railway, from the infrastructure-as-code service definition through dev auto-deploys with a post-deploy smoke to the owner-only production release workflow.
tags: [deployment, railway, release, github-actions, smoke-tests]
sources:
  - id: openwiki-source-e8a8d74e045abdf58230a543
    resource: repo://.github/workflows/deploy-dev-smoke.yml
  - id: openwiki-source-4d1d392666be6dfdd7a91a2e
    resource: repo://.github/workflows/release.yml
  - id: openwiki-source-42271e2e50bb89647a0cb594
    resource: repo://.github/workflows/smoke.yml
  - id: openwiki-source-d60a6f0f1e9b6eab797ff859
    resource: repo://.railway/railway.ts
  - id: openwiki-source-2615540ec7553288b52f775d
    resource: repo://docs/legacy/infra.md
  - id: openwiki-source-8a351af10d89cd949447bf39
    resource: repo://scripts/ci/playwright-chromium.sh
  - id: openwiki-source-a493eb920ff6a7f8859a6c69
    resource: repo://tests/e2e/smoke.spec.ts
  - id: openwiki-source-6d7290acd85912e8a5ebb6cc
    resource: repo://tests/unit/railway-config.test.ts
generated: { by: "claude-code", at: "2026-11-16T11:00:16.891Z" }
verified:
  - by: openwiki/0.4.3
    at: 2026-11-16T11:00:16.891Z
---

# Deployment and releases

The app runs as one long-lived Node container per environment on Railway: service `web`, environments `dev` and `production`. `dev` also has a `game-data` cron service that refreshes the DofusDB data once a week. The same build serves both; behavior that differs (the dev `noindex` header, robots, the `/sistema` catalog, the Sentry environment) is read from the environment at runtime.

```
PR ──▶ CI (Pruebas required) ──▶ merge to main
                                   │
                                   ├─▶ Railway dev: GitHub source, deploys main without waiting for checks
                                   │      └─▶ deployment_status ─▶ "Smoke de dev" workflow
                                   │
                                   └─▶ "Release" workflow (manual, owner only)
                                          tag vX.Y.Z ─▶ approve ─▶ railway up ─▶ verify commit ─▶ smoke prod
```

## Service definition: `.railway/railway.ts`

The service is described as code with `railway/iac`. Railway does not read this file on deploy; it is applied by hand per environment with `railway config plan` and `railway config apply`. `railway config plan` always shows `deploy.restartPolicyType (null → "ON_FAILURE")` for both environments, even right after an apply, because Railway stores its default policy `ON_FAILURE` as `null`; the diff is harmless (`docs/legacy/infra.md`).

| Setting | Value |
|---|---|
| Builder | Railpack, `RAILPACK_NODE_VERSION=24.22.2` |
| Build / start | `pnpm build` / `pnpm start` |
| Pre-deploy | `pnpm migrate`, timeout 600 s |
| Health check | `/api/health`, timeout 120 s. It only says the process answers and never touches the database |
| Restart policy | `ON_FAILURE`, up to 5 retries |
| Replicas | 1, in `us-east4-eqdc4a` (US East, next to Neon `us-east-1`) |
| Source | `dev`: GitHub `main` with `checkSuites: false`. `production`: none |

The function throws for any environment other than `dev` or `production` rather than guessing. Secrets use `preserve()`, which keeps the value stored in Railway and never writes one; `config apply` deletes undeclared variables, so declare a new variable here before creating it. See [Environment configuration](../architecture/configuration.md).

### The weekly game data task (dev only)

In `dev` the file also declares the `game-data` service, and the project lists it only there (`resources: dev ? [web, gameData] : [web]`):

| Setting | Value |
|---|---|
| Source | GitHub `main` with `checkSuites: false`, like the web |
| Build | Railpack with `RAILPACK_NODE_VERSION=24.22.2`; the build command only echoes, because `payload run` transpiles the script and the Next build is not needed |
| Start | `pnpm data:refresh --schedule` |
| Cron | `0 6 * * 3`: Wednesdays at 06:00 UTC, after Ankama's usual Tuesday patch |
| Restart policy | `NEVER`: a failed run is not retried; it stays in «Refrescos de datos» until next week or the panel's «Traer ahora» |
| Replicas | 1, in the same region |
| Variables | References to the web's (`web.env.DATABASE_URL`, `PAYLOAD_SECRET`, `NEXT_PUBLIC_SITE_URL`, the `S3_*` set, `MEDIA_BASE_URL`, `SENTRY_DSN`) plus `APP_ENV=dev`, so no secret has to be created by hand |

Railway starts the container at the scheduled time, runs the command and stops it, so it costs nothing between runs and Neon can sleep; once a week because each run wakes Neon for a few minutes. It never migrates: the web's pre-deploy migration owns the schema. Production has no such task yet, because it has no GitHub source; it needs a step in the release workflow first. The refresh it runs, its run log and its lock against a concurrent panel run are in [DofusDB game data refresh](../data/dofusdb-refresh.md).

`tests/unit/railway-config.test.ts` evaluates the file for both environments: build and start commands, migration with timeout, health check and restart policy, region, secrets preserved, dev wired to GitHub `main` with `checkSuites: false`, `APP_ENV=dev` and no basic-auth variables, production without a GitHub source and with `GIT_COMMIT_SHA` and `APP_VERSION`, unknown environments rejected, and the dev `game-data` task (its weekly cron and command, no retry, deploying `main` without the Next build, the web's secrets by reference) with no such task in production.

### What protects a deploy

1. `pnpm migrate` runs before the new version starts. If it fails or times out, the deploy stops and the previous version keeps serving. A database that does not answer stops the deploy here, because the migration cannot connect.
2. Railway waits for `/api/health` to return `200`, which only needs the process to answer; the database check lives in `/api/ready`. See [Health check endpoint](health-check.md).
3. A crashed process restarts up to five times.

There is no automatic down-migration. A bad migration is fixed by a new forward migration.

## Dev: continuous deploys

Railway deploys every push to `main` without waiting for GitHub's check suites (`checkSuites: false`). Branch protection already requires `Pruebas` on each PR, history is linear, and the PR's CI runs on the same code, so running CI again on `main` only delayed every dev deploy. Waiting also had a failure mode: Railway waited for every check on the commit, not only `Pruebas`, so one failed unrelated job (a Dependabot security update, in `docs/legacy/infra.md`) skipped that commit's deploy and any redeploy of it. The setting was applied to `dev` with `railway config apply` on 2026-11-04. Production is unaffected: it has no GitHub source and the release workflow still requires `Pruebas` on the commit.

Railway reports each deploy as a GitHub deployment, and `.github/workflows/deploy-dev-smoke.yml` listens to `deployment_status`:

1. It runs only for a `success` state on an environment containing `dev`. Successful dev deploys share one concurrency group, so a newer deploy cancels an older smoke; other events get their own group and never cancel it.
2. It takes the app URL from the `DEV_URL` repository variable, not from the event: Railway's `environment_url` points at its dashboard. `DEV_URL` must start with `https://`, otherwise the job fails before any credentials are sent.
3. It polls `DEV_URL/api/health` every 10 s, up to 30 times, until the reported `commit` equals the deployed SHA. Railway can mark the deploy done while the old version still serves for a few seconds.
4. It calls the reusable smoke workflow with `DEV_URL`. Dev is public since 2026-11-05, so no credentials are passed.

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
4. Sets `GIT_COMMIT_SHA` and `APP_VERSION` (the tag's version, without the `v`) on the production service with `--skip-deploys`. `railway up` uploads files without git metadata, so Railway would not inject `RAILWAY_GIT_COMMIT_SHA`, and `package.json` is not bumped per release, so `/api/health` takes the version from `APP_VERSION`.
5. Runs `railway up` without `--detach`, so the job waits for pre-deploy migrations and the health check and fails if they fail.
6. Polls `PROD_URL/api/health` until it reports the tagged commit (up to 5 minutes).

**Job `smoke`** calls the reusable smoke workflow against `PROD_URL`.

## Reusable smoke workflow

`.github/workflows/smoke.yml` runs on `workflow_call` (with `base_url`) or by hand. It installs dependencies and Chromium (cached by Playwright version) through `scripts/ci/playwright-chromium.sh`, the same script CI runs through its `.github/actions/chromium` composite action (see [CI and quality gates](../workflows/ci-and-quality-gates.md)): it skips apt when Chromium already starts with the runner's libraries, and retries each step with a time limit. It then runs `pnpm test:smoke` with `SMOKE_BASE_URL` set, which makes Playwright test the remote URL without building or starting anything locally. The `@smoke` tests only read: home page, `/admin`, `/api/health` and `/api/ready`, which must report the database as `ok`. See [Test suites](../testing/test-suites.md).

## Related pages

- [Health check endpoint](health-check.md)
- [CI and quality gates](../workflows/ci-and-quality-gates.md)
- [Database and migrations](../data/database.md)
- [Environment configuration](../architecture/configuration.md)
