# Infrastructure and delivery plan

Status: draft for review (2026-11-02). Implementation starts in the next work session. Decisions marked **open** need an answer before that step.

## 1. Environments

| | Local | Dev (staging) | Prod |
|---|---|---|---|
| Purpose | Daily work | Every merge to `main`, visible to Torre for review | torrentearcano.com |
| App | `pnpm dev` on the laptop | Railway service, environment `dev` | Railway service, environment `production` |
| Database | Embedded Postgres 17 (`pnpm db:dev`) | Neon branch `dev` (child of `main`) | Neon branch `main` |
| Media | Local disk | R2 bucket `ta-media-dev` | R2 bucket `ta-media-prod` |
| Domain | `localhost:3000` | Railway default domain now; `dev.torrentearcano.com` after the domain transfer | Railway default domain until cutover; `torrentearcano.com` at cutover |
| Email | Logged to the console | Resend, sandbox sender | Resend, verified domain |
| Indexing | n/a | `noindex` header and `robots.txt` disallow | Indexed |
| Data | Seed script | Copy of prod content refreshed on demand (Neon branch reset) | Real |
| Secrets | `.env.local` (never committed) | Railway variables of `dev` | Railway variables of `production` |

Rules:
- Dev never sends real email to members and never charges money: payments run in Stripe/Lemon Squeezy test mode there.
- Dev is password-protected with basic auth in the Next middleware (Cloudflare Access after the domain transfer), so the half-built site and its admin panel are not public.
- Prod content is the source of truth; dev gets a fresh copy by resetting its Neon branch from `main`. Never the other way around.

## 2. Hosting choice

**Recommendation: Railway.**

| | Railway | Fly.io | Hetzner + Coolify |
|---|---|---|---|
| Environments built in | Yes (dev, production, PR environments) | Separate apps per environment | Manual |
| Deploy from GitHub | Native, per environment and branch | GitHub Action with `flyctl` | Coolify webhook |
| Pre-deploy command (migrations) | Yes | `release_command` | Script |
| Long-running Node, no cold starts | Yes | Yes (keep one machine on) | Yes |
| Ops work | Lowest | Medium | Highest (OS updates, backups, TLS) |
| Cost at launch (two environments) | About 10 to 25 USD/month, usage based | Similar | 5 to 10 EUR/month |

Railway wins on effort: two environments, deploys and migrations without writing deployment scripts. Fly is the fallback if Railway's pricing or regions don't fit; Hetzner if cost has to be minimal and Daniel accepts the ops work.

**Decided (2026-11-02)**: US East. The audience is mostly Latin America with a share in Europe, and US East sits between both: roughly 50 to 150 ms from most of Latin America and 80 to 100 ms from Western Europe (estimates). Railway region US East (Virginia) and Neon in AWS `us-east-1`, so the app and the database are in the same place. Cloudflare serves images and static files from the edge closest to each visitor, so only page renders and API calls travel to Virginia.

## 3. Services per environment

| Service | Provider | Notes |
|---|---|---|
| App | Railway (Railpack, Node 24 from `engines.node`, at least 24.22.1, `pnpm build` then `pnpm start`), configured in `.railway/railway.ts` | Health check on `/api/health` |
| Postgres | Neon | One project, branches `main` (prod) and `dev`. Point-in-time recovery on `main`. Pooled connection string for the app, direct one for migrations |
| Media | Cloudflare R2 | Two buckets, public through a Cloudflare custom domain (`media.torrentearcano.com`, `media-dev...`) once the domain is on Cloudflare |
| DNS, CDN, TLS | Cloudflare | Requires the domain transfer out of Squarespace (plan, decision 1) |
| Email | Resend | Prod sender on the domain with SPF, DKIM and DMARC |
| Errors | Sentry (free tier) | Separate environments `dev` and `production` in one project |
| Uptime | Better Stack or UptimeRobot (free) | Ping prod and dev every minute |
| Analytics | Plausible or self-hosted Umami | Prod only |
| AI review | GGA with Codex in CI | Already configured, advisory |

## 4. CI/CD flow

```
feature branch ──PR──▶ CI: lint, types, unit, build, e2e  ─┐
                        GGA review (advisory)              │ "Pruebas" required
                                                           ▼
                                   merge (rebase) to main
                                                           │
                         Railway deploys main to DEV ◀─────┘
                         pre-deploy: payload migrate (Neon dev)
                         smoke test against dev URL (GitHub Action)
                                                           │
                    git tag vX.Y.Z  /  "Release" workflow  │
                    (GitHub environment "production",       ▼
                     required reviewer: Daniel)
                         Railway deploys the tag to PROD
                         pre-deploy: payload migrate (Neon main)
                         smoke test against prod URL
```

Details:
- **Branch protection on `main`**: PR required, `Pruebas` required, linear history, no force-push. `Revisión GGA` stays advisory until it has been stable for a while on small PRs.
- **Dev deploys** on every push to `main`, through Railway's GitHub integration. No manual step.
- **Prod deploys** only from a version tag created by a `release` workflow (`workflow_dispatch` or a merged release PR), behind the GitHub environment `production` with Daniel as the only required reviewer (decided 2026-11-03). **Decided (2026-11-03)**: the release workflow deploys with the Railway CLI, using a project token stored as a secret of the GitHub environment `production`. Railway's own auto-deploy stays off for production, so nothing reaches prod without the approval, `Pruebas` green on the tagged commit, and the post-deploy smoke test in the same run.
- **Migrations** run as the pre-deploy command in both environments, against the direct (non-pooled) Neon URL. A failed migration stops the deploy; the previous version keeps serving.
- **Rollback**: redeploy the previous Railway deployment (one click) for code. Schema changes are forward-only: a bad migration gets a new migration, and Neon point-in-time recovery is the last resort for data.
- **Smoke tests after deploy**: a small Playwright subset (`@smoke` tag) against the deployed URL: home renders, `/admin` responds, `/api/health` is OK.
- **PR preview environments**: optional, later. Railway can spin one per PR with a Neon branch per PR; worth it once Torre reviews content changes in PRs.

## 5. Secrets and variables

| Variable | Local | Dev | Prod | Stored in |
|---|---|---|---|---|
| `DATABASE_URL` (pooled) | embedded | Neon `dev` | Neon `main` | Railway env |
| `DATABASE_URL_DIRECT` (migrations) | embedded | Neon `dev` | Neon `main` | Railway env |
| `PAYLOAD_SECRET` | dummy | random, unique | random, unique | Railway env |
| `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `MEDIA_BASE_URL` | unset (disk) | R2 dev token scoped to its bucket | R2 prod token scoped to its bucket | Railway env |
| `NEXT_PUBLIC_SITE_URL` | localhost | dev URL | prod URL | Railway env |
| `EMAIL_API_KEY` (Resend key) | unset | sandbox key | prod key | Railway env |
| `SENTRY_DSN`, `SENTRY_AUTH_TOKEN` | unset | set | set | Railway env, GitHub secret for source maps |
| `APP_ENV` | unset | `dev` | unset | `.railway/railway.ts` |
| `DEV_BASIC_AUTH_USER`, `DEV_BASIC_AUTH_PASSWORD` | unset | set | unset | Railway env |
| `GIT_COMMIT_SHA` | unset | unset (Railway injects `RAILWAY_GIT_COMMIT_SHA`) | set by `release.yml` on each deploy | Railway env |
| `RAILWAY_TOKEN` | n/a | n/a | project token | GitHub environment `production` |
| `PROD_URL` | n/a | n/a | prod URL | GitHub environment `production` (variable) |
| `SMOKE_BASIC_AUTH_USER`, `SMOKE_BASIC_AUTH_PASSWORD` | n/a | the dev credentials | n/a | GitHub repo secrets |
| `CODEX_AUTH_JSON` | n/a | n/a | n/a | GitHub repo secret (CI review) |

Every new variable is added to `.env.example` in the same PR (AGENTS.md rule). Each environment has its own R2 token limited to its bucket, and its own `PAYLOAD_SECRET`.

## 6. Accounts to create (Daniel, before or during implementation)

1. Railway: project `torrente-arcano`, connect the GitHub repo.
2. Neon: project `torrente-arcano`, region AWS `us-east-1`, branches `main` and `dev`.
3. Cloudflare: account (needed for R2 now; DNS after the domain transfer). Two R2 buckets and two scoped API tokens.
4. Resend and Sentry: free accounts (can wait until members and errors matter; Sentry is cheap to add from day one).
5. GitHub: environment `production` with Daniel as reviewer; branch protection on `main`.

Cost while only dev and prod run with little traffic: Railway about 10 to 25 USD, Neon free tier (upgrade when PITR retention matters), R2 under 1 USD, the rest free (estimates).

## 7. Implementation order

1. Done. `/api/health` route and the `@smoke` e2e subset.
2. Waiting on the accounts. Railway project with `dev` and `production` environments; Neon project with `main` and `dev`; R2 buckets and tokens. Variables loaded per environment. Section 9 lists every step.
3. Prepared. Pre-deploy migration command (`pnpm migrate` in `.railway/railway.ts`) and the direct DB URL (`DATABASE_URL_DIRECT`). The first dev deploy from `main` waits on step 2.
4. Prepared. Basic auth and `noindex` on dev (`src/proxy.ts`, `src/app/robots.ts`; `APP_ENV`, `DEV_BASIC_AUTH_USER`, `DEV_BASIC_AUTH_PASSWORD` in `.env.example`).
5. Prepared. Post-deploy smoke workflow against dev (`.github/workflows/deploy-dev-smoke.yml`). It runs once Railway reports its first dev deploy.
6. Prepared. Release workflow (`.github/workflows/release.yml`) with the `production` environment. The required reviewer and the first prod deploy wait on step 2.
7. Branch protection on `main` (`Pruebas` required).
8. Sentry and uptime checks.

## 8. Decisions on the former open questions (2026-11-03)

| Question | Decision |
|---|---|
| Region | US East: Railway US East (Virginia), Neon AWS `us-east-1` |
| Prod deploy mechanism | Railway CLI from the release workflow, behind the GitHub environment `production` |
| Dev access gate | Basic auth in the Next middleware, active only when the app runs in the dev environment, plus `noindex`. After the domain transfer, Cloudflare Access on `dev.torrentearcano.com` replaces it |
| Prod approvers | Daniel only |

## 9. Go-live checklist

Everything in the repo is ready. What is left needs the accounts, in this order. Nothing here goes in git.

### Neon

1. Create the project `torrente-arcano` in AWS `us-east-1`, with the branches `main` (prod) and `dev`.
2. For each branch, copy two connection strings: the pooled one (host with `-pooler`) and the direct one. They become `DATABASE_URL` and `DATABASE_URL_DIRECT`.

### Cloudflare R2

1. Create the buckets `ta-media-dev` and `ta-media-prod`, and one API token per bucket, scoped to it.

### Railway

1. Create the project `torrente-arcano` with the environments `dev` and `production`, and install the Railway GitHub app on `Dsantiagomj/torrente-arcano`.
2. Create the empty service `web` in both environments.
3. Set these variables on `web` in each environment, before applying the config:

| Variable | `dev` | `production` |
|---|---|---|
| `DATABASE_URL` | Neon `dev`, pooled | Neon `main`, pooled |
| `DATABASE_URL_DIRECT` | Neon `dev`, direct | Neon `main`, direct |
| `PAYLOAD_SECRET` | `openssl rand -hex 32` | another one |
| `NEXT_PUBLIC_SITE_URL` | the dev Railway domain | the prod Railway domain |
| `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | `ta-media-dev` and its token | `ta-media-prod` and its token |
| `MEDIA_BASE_URL` | empty until the media domain exists | empty until the media domain exists |
| `DEV_BASIC_AUTH_USER`, `DEV_BASIC_AUTH_PASSWORD` | the dev credentials | not set |
| `GIT_COMMIT_SHA` | not set | any value; `release.yml` overwrites it on each deploy |

`.railway/railway.ts` sets `APP_ENV=dev` on dev and `RAILPACK_NODE_VERSION=24.22.2` (the Node security release floor, see `docs/security.md`) on both.

4. Apply the config to each environment. Then check that the plan creates or changes only `web` and deletes no variable:

```sh
pnpm install
railway login
railway link          # project torrente-arcano, environment dev
railway config plan
railway config apply
railway environment production
railway config plan
railway config apply
```

5. Generate a Railway domain for `web` in both environments.
6. In `production`, create a project token scoped to that environment. It becomes `RAILWAY_TOKEN` below.

### GitHub

1. Create the environment `production`. Set Daniel as the only required reviewer and limit it to the `main` branch. Add:
   - secret `RAILWAY_TOKEN`: the project token from Railway step 6;
   - variable `PROD_URL`: the prod Railway domain, `https://…`, no trailing slash.
2. Add the repo secrets `SMOKE_BASIC_AUTH_USER` and `SMOKE_BASIC_AUTH_PASSWORD`, the same values as the dev credentials. `Smoke de dev` uses them.
3. Protect `main` (section 4).

### First deploys

1. Push or merge to `main`. Railway deploys dev once the checks pass, and `Smoke de dev` runs against the deploy URL. Check in that run's log that Railway sent an `environment_url`. Without one, the smoke skips with a notice.
2. Run `Release` from `main` with version `0.1.0` and approve the `production` deployment.
3. Point an uptime monitor at `/api/health` in both environments. It needs no credentials.

### Not verified before the accounts existed

- Railway's `deployment_status` payload: the environment name is `<project> / <environment>` according to Railway's forum, not its docs, and `environment_url` may be empty. `deploy-dev-smoke.yml` matches any environment name that contains `dev` and skips without a URL.
- Whether `railway config apply` deletes Railway variables that `.railway/railway.ts` does not declare, and how `preserve()` behaves for a variable that does not exist yet. That is why the variables go in first and the plan gets read before applying.
- That a `production` service without a GitHub source accepts `railway up` and has no auto-deploy.
- That attached `railway up` (without `--ci`) waits for the health check. The release also checks the commit on `/api/health` before the smoke, so a stale deploy fails the run either way.
