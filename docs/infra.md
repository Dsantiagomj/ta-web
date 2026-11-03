# Infrastructure reference

What runs where, the decisions in force and what is left. Inventory as of 2026-11-03. The repo files named here (`.railway/railway.ts` and the workflows in `.github/workflows/`) are the source of truth when they disagree with this page.

## 1. Environments

| | Local | Dev (staging) | Prod |
|---|---|---|---|
| Purpose | Daily work | Every merge to `main`, visible to Torre for review | torrentearcano.com |
| App | `pnpm dev` on the laptop | Railway service `web`, environment `dev` | Railway service `web`, environment `production` |
| Database | Embedded Postgres 17 (`pnpm db:dev`) | Neon branch `dev` (child of `main`) | Neon branch `main` |
| Media | Local disk | R2 bucket `ta-media-dev` | R2 bucket `ta-media-prod` |
| Domain | `localhost:3000` | `ta-web-dev.up.railway.app`; `dev.torrentearcano.com` after the domain transfer | `ta-web-production-7f45.up.railway.app`; `torrentearcano.com` at cutover |
| Email | Logged to the console | Resend, sandbox sender (planned) | Resend, verified domain (planned) |
| Indexing | n/a | `noindex` header and `robots.txt` disallow | Indexed |
| Data | Seed script | Copy of prod content, refreshed by resetting the Neon branch from `main` | Real |
| Secrets | `.env.local` (never committed) | Railway variables of `dev` | Railway variables of `production` |

Rules:
- Dev never sends real email to members and never charges money: payments run in test mode there.
- Dev is behind basic auth in the Next proxy (`src/proxy.ts`), so the half-built site and its admin panel are not public. Cloudflare Access replaces it after the domain transfer.
- Prod content is the source of truth. Dev gets a fresh copy by resetting its Neon branch from `main`, never the other way around.

## 2. Region and host

US East, decided 2026-11-02. The audience is mostly Latin America with a share in Europe, and US East sits between both: roughly 50 to 150 ms from most of Latin America and 80 to 100 ms from Western Europe (estimates). The app runs in Railway US East (Virginia) and the database in Neon AWS `us-east-1`, side by side. Cloudflare serves images and static files from the edge, so only page renders and API calls travel to Virginia. Railway won over Fly.io and a VPS on effort: environments, GitHub deploys and a pre-deploy command for migrations come built in.

## 3. Services

| Service | Provider | Notes |
|---|---|---|
| App | Railway: Railpack, Node 24.22.2 (the security floor), `pnpm build`, `pnpm start`, configured in `.railway/railway.ts` | Health check on `/api/health` |
| Postgres | Neon | Branches `main` (prod) and `dev`. Pooled URL for the app, direct URL for migrations |
| Media | Cloudflare R2 | Two buckets. Public through `media.torrentearcano.com` and a dev twin once the domain is on Cloudflare |
| DNS, CDN, TLS | Cloudflare | Needs the domain transfer out of Squarespace (plan, decision 1) |
| Email | Resend | Pending. Prod sender on the domain with SPF, DKIM and DMARC |
| Errors | Sentry (free tier) | Project `ta-web` in org `dsmjdev`. Server errors only (`src/instrumentation.ts`), no browser SDK. Environments `dev` and `production` appear with their first events |
| Uptime | Better Stack (free) | Pending. Check `/api/health` on prod and dev every 3 minutes (the free plan's interval) |
| Analytics | Plausible or self-hosted Umami | Prod only, later |
| AI review | `gga` with Codex in CI | Advisory |

## 4. CI/CD

```
feature branch ──PR──▶ CI: lint, types, unit, integration,─┐
                        build, e2e, dev gate, audit        │
                        GGA review (advisory)              │ "Pruebas" required
                                                           ▼
                                   merge (rebase or squash) to main
                                                           │
                         Railway deploys main to DEV ◀─────┘
                         pre-deploy: pnpm migrate (Neon dev)
                         "Smoke de dev": waits for DEV_URL to
                         serve the commit, then smoke tests it
                                                           │
                    "Release" workflow, run by the owner   │
                    from main with a semver version         ▼
                         tag vX.Y.Z, railway up to PROD
                         pre-deploy: pnpm migrate (Neon main)
                         checks the commit on /api/health
                         smoke test against PROD_URL
```

- **Branch protection.** The ruleset `Proteger main` (section 6). `Revisión GGA` stays advisory.
- **Dev deploys.** Every push to `main`, through Railway's GitHub integration, once the GitHub checks pass. No manual step. Then `deploy-dev-smoke.yml` polls `$DEV_URL/api/health` for up to 5 minutes until it reports the deployment's commit, and runs the smoke suite against `DEV_URL` with the dev basic-auth credentials. It never uses the deployment's `environment_url` (section 9).
- **Prod deploys.** Only `release.yml`, run by hand from `main` with a semver version. It refuses to run unless the repository owner triggered it, checks that `Pruebas` passed on the commit, creates the tag and GitHub release, sets `GIT_COMMIT_SHA`, deploys with `railway up` and the `RAILWAY_TOKEN` of the GitHub environment `production`, waits until `/api/health` reports the commit, then runs the smoke suite. Railway's `production` has no GitHub source, so nothing else deploys it.
- **Migrations.** `pnpm migrate` is the pre-deploy command in both environments, against the direct Neon URL. A failed migration stops the deploy and the previous version keeps serving.
- **Rollback.** For code, redeploy the previous Railway deployment. Schema changes are forward-only: a bad migration gets a new migration. Neon point-in-time restore is the last resort for data, and the Free plan keeps only 6 hours of history.
- **Smoke tests.** The `@smoke` Playwright subset against the deployed URL: home renders, `/admin` responds, `/api/health` is ok. Read-only.
- **PR preview environments.** Later, once Torre reviews content changes in PRs. Railway can create one per PR with a Neon branch each.

## 5. Secrets and variables

| Variable | Local | Dev | Prod | Stored in |
|---|---|---|---|---|
| `DATABASE_URL` (pooled) | embedded | Neon `dev` | Neon `main` | Railway |
| `DATABASE_URL_DIRECT` (migrations) | embedded | Neon `dev` | Neon `main` | Railway |
| `PAYLOAD_SECRET` | dummy | random, unique | random, unique | Railway |
| `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | unset (disk) | `ta-media-dev` and its token | `ta-media-prod` and its token | Railway |
| `S3_REGION` | unset | unset (the app defaults to `auto`) | unset | not declared |
| `MEDIA_BASE_URL` | unset | empty until the media domain exists | empty until the media domain exists | Railway |
| `NEXT_PUBLIC_SITE_URL` | localhost | dev domain | prod domain | Railway |
| `APP_ENV` | unset | `dev` | unset | `.railway/railway.ts` |
| `DEV_BASIC_AUTH_USER`, `DEV_BASIC_AUTH_PASSWORD` | unset | set (user `torre`) | unset | Railway |
| `GIT_COMMIT_SHA` | unset | unset (Railway injects `RAILWAY_GIT_COMMIT_SHA`) | set by `release.yml` on each deploy | Railway |
| `EMAIL_API_KEY` (planned) | unset | sandbox key | prod key | Railway |
| `SENTRY_DSN` | unset | set | set | Railway |
| `SENTRY_AUTH_TOKEN` (source maps at build time) | unset | pending | pending | Railway (both builds run on Railway, so no GitHub secret) |
| `RAILWAY_TOKEN` | n/a | n/a | project token `prod`, scoped to `production` | GitHub environment `production` (secret) |
| `PROD_URL` | n/a | n/a | prod domain | GitHub environment `production` (variable) |
| `SMOKE_BASIC_AUTH_USER`, `SMOKE_BASIC_AUTH_PASSWORD` | n/a | the dev credentials | n/a | GitHub repo secrets |
| `DEV_URL` | n/a | dev domain | n/a | GitHub repo variable |
| `CODEX_AUTH_JSON` | n/a | n/a | n/a | GitHub repo secret (CI review) |

Every variable the app reads goes in `.env.example` in the same PR (AGENTS.md). A Railway variable must be declared in `.railway/railway.ts` (a value, or `preserve()` for secrets) before it is set in Railway, or the next `railway config apply` deletes it (section 9).

## 6. Inventory

### Railway

- Workspace `DSMJProjects`, project `ta-web` (`e7259c49-dfaa-4d86-9c5c-e2461681fdf5`), service `web`.
- Environments `dev` and `production`, region `us-east4-eqdc4a` (US East, Virginia).
- Domains: dev `https://ta-web-dev.up.railway.app`, prod `https://ta-web-production-7f45.up.railway.app`.
- `dev` has the GitHub source `main` with `checkSuites`: it deploys after the checks pass. `production` has no source; only `release.yml` deploys it, with `railway up`.
- Config comes from `.railway/railway.ts`, applied to both environments with `railway config plan` and `railway config apply` on 2026-11-03.
- First dev deploy succeeded on 2026-11-03: the pre-deploy applied migration `20261103_030359_initial`, `/api/health` answered ok, and basic auth and `X-Robots-Tag` behaved as expected.
- First prod deploy succeeded on 2026-11-03 with release `v0.1.0` (commit `172686b`): the pre-deploy applied `20261103_030359_initial` to Neon `main`, `/api/health` reported the commit, and the smoke suite passed. Prod serves without basic auth, and `robots.txt` allows everything except `/admin`.

### Neon

- Organization on the Free plan, project `ta-web` (`holy-cake-31058356`), AWS `us-east-1`, Postgres 17.
- Branches `main` (default, prod) and `dev` (child of `main`).
- `main` is not protected: the Free plan has no protected branches (Launch allows 2, Scale 5). Point-in-time history on Free is 6 hours.
- Each branch's pooled URL is `DATABASE_URL`; its direct URL is `DATABASE_URL_DIRECT`.

### Cloudflare R2

- Account `DSMJ`, buckets `ta-media-dev` and `ta-media-prod`, location ENAM.
- One account API token per bucket, named `ta-web R2 <bucket>`, limited to Object Read & Write on that bucket.
- `S3_REGION` is not set; `MEDIA_BASE_URL` stays empty until the media domain exists.

### Sentry

- Organization `dsmjdev` (US region), project `ta-web` with its default DSN, set as `SENTRY_DSN` on `web` in both Railway environments.
- Only the server SDK runs (`@sentry/nextjs`, `src/instrumentation.ts`). It sends events only when `SENTRY_DSN` is set and the environment is `dev` or `production`; each event's release is the deployed commit.
- `SENTRY_AUTH_TOKEN` (an organization token) is not set yet, so source maps are not uploaded.

### GitHub

- Ruleset `Proteger main` on the default branch, active, no bypass: PR required with 0 approvals, rebase or squash merges, required status check `Pruebas`, linear history, no force-push, no deletion.
- Environment `production`: deployments only from `main` (custom branch policy), variable `PROD_URL`, secret `RAILWAY_TOKEN` (the Railway project token `prod`, scoped to `production`). Required reviewers need GitHub Enterprise on private repos, so the approval is the owner-only guard in `release.yml`. While Daniel is the only person with write access, that is the same thing.
- Environment `ta-web / dev`: created by Railway's deployments.
- Repo secrets `SMOKE_BASIC_AUTH_USER` and `SMOKE_BASIC_AUTH_PASSWORD` (the dev basic-auth credentials) and `CODEX_AUTH_JSON`; repo variable `DEV_URL`.

## 7. Decisions

| Question | Decision |
|---|---|
| Host | Railway, both environments (section 2) |
| Region | US East: Railway US East (Virginia), Neon AWS `us-east-1` |
| Prod deploy mechanism | Railway CLI (`railway up`) from `release.yml`, with a project token in the GitHub environment `production`. No auto-deploy on prod |
| Prod approval | The repository owner (Daniel) runs or re-runs `release.yml`; anyone else is refused |
| Dev deploy | Railway's GitHub integration on `main`, after the checks pass |
| Dev access gate | Basic auth in the Next proxy, active only in the dev environment, plus `noindex`. Cloudflare Access on `dev.torrentearcano.com` replaces it after the domain transfer. `/api/health` stays open |
| Dev smoke target | Always `DEV_URL`, after `/api/health` reports the deployed commit |
| Schema changes | Forward-only migrations, applied by the pre-deploy command |

## 8. Agent access

Daniel provides the tools once, and the coding agent operates the infrastructure from the session that writes the code. Daniel keeps the accounts and approves anything destructive.

| Service | Preferred | Fallback | What the agent does with it |
|---|---|---|---|
| GitHub | `gh` CLI | GitHub MCP | PRs, checks, rulesets, environments, secrets |
| Railway | Railway MCP (OAuth) | `railway` CLI, project linked | Deploy status, logs, variables, `config plan`/`apply`, redeploys |
| Neon | Neon MCP | `neonctl` | Branches (reset dev from main, PR branches), connection strings, query plans |
| Cloudflare | Cloudflare MCP | `wrangler` | R2 buckets and tokens; DNS, cache and Access after the domain transfer |
| Sentry | Sentry MCP (`mcp.sentry.dev/mcp`) | `sentry-cli` | Issues, stack traces, errors linked to commits |

Access rules:
- **Least privilege.** Full access to dev, read access to prod. Prod writes (variables, redeploys, database changes) go through `release.yml` or need Daniel's explicit yes for that one action.
- **Destructive actions ask first.** Deleting a service, bucket, database branch or DNS record, rotating secrets, a Neon point-in-time restore, a forced prod redeploy. The agent states what will change and waits.
- **Secrets never pass through the chat.** Tokens go in through a private prompt or a CLI login on Daniel's machine. The agent never prints, commits or copies them.
- **Scoped tokens.** Where a service supports it, the agent's token is limited to this project and revocable on its own.
- **Audit.** The PR or the conversation records each infra change the agent makes. Railway configuration changes go through `.railway/railway.ts` and a PR.

## 9. Verified behavior

Checked against the real accounts on 2026-11-03:
- Railway's GitHub deployment for dev has the environment `ta-web / dev`, and its `environment_url` is the Railway dashboard URL (`https://railway.com/project/<id>?environmentId=<id>`), not the app. That is why `deploy-dev-smoke.yml` targets `DEV_URL`.
- `railway config apply` deletes Railway variables that `.railway/railway.ts` does not declare. The plan marks them as destructive; the first apply removed `S3_REGION`. Always read `railway config plan` first.
- `preserve()` for a variable that does not exist yet (prod `GIT_COMMIT_SHA`) does nothing: it creates no variable.
- `production` without a GitHub source did not auto-deploy.
- Railway project tokens cannot be created from the CLI or the OAuth session (the API answers "Not Authorized"). Create them in the dashboard; Railway shows the value only once.
- `railway up` from `release.yml` deploys to a `production` that has no GitHub source, and the release waits for the health check before the smoke runs (release `v0.1.0`).
- A wrong `RAILWAY_TOKEN` fails the release at "Fijar el commit desplegado" ("Invalid RAILWAY_TOKEN"), before anything is deployed. After fixing the secret, re-running the failed release with the same version works; the tag and GitHub release from the first attempt are reused.
- Sentry members of the `dsmjdev` organization cannot create projects (the API answers 403, "Your organization has disabled this feature for members"). An owner or manager creates them, or enables project creation for members.
- Sentry Uptime cannot monitor `*.railway.app`. Creating the monitor answered 400: "The domain \*.railway.app has already been used in 1000 uptime monitoring alerts, which is the limit." The cap is per domain across all Sentry customers. Uptime runs on Better Stack until the app has its own domain.
- `preserve()` on a variable that does not exist yet (`SENTRY_AUTH_TOKEN`) plans no change and no error, so a secret can be declared before it is set.

## 10. Status and what is left

| Item | Status |
|---|---|
| `/api/health` and the `@smoke` suite | Done |
| Railway, Neon and R2 accounts, resources and variables | Done |
| Pre-deploy migrations | Done |
| Dev basic auth and `noindex` | Done |
| Dev smoke workflow | Done |
| Release workflow and first prod deploy | Done (`v0.1.0`, 2026-11-03) |
| Branch protection | Done (ruleset `Proteger main`) |
| Sentry | Done for server errors. Source maps wait on `SENTRY_AUTH_TOKEN` |
| Uptime | Pending: Better Stack monitors for both domains |

What is left:
1. Sentry source maps: an organization auth token in Sentry, set as `SENTRY_AUTH_TOKEN` on `web` in both Railway environments (already declared in `.railway/railway.ts`).
2. Better Stack monitors on `/api/health` for both domains, alerting by email. They need no credentials.
3. `/api/health` reports `version` from `package.json` (`0.0.0`), not the release tag. Bump it in the release, or report the tag, if the version should match.
4. Resend.
5. Domain transfer to Cloudflare, then `dev.torrentearcano.com`, the media domains and Cloudflare Access.
6. Neon Launch plan, if `main` has to be protected or 6 hours of point-in-time history is too short.
7. Optionally, `sslmode=verify-full` in the Neon URLs: `pg` warns that `require` changes meaning in `pg` v9.
