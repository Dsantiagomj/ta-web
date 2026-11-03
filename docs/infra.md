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
| App | Railway (Nixpacks or a Dockerfile, Node 24 from `engines.node`, at least 24.22.1, `pnpm build` then `pnpm start`) | Health check on `/api/health` (to add) |
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
| `RAILWAY_TOKEN` | n/a | n/a | project token | GitHub environment `production` |
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

1. `/api/health` route and the `@smoke` e2e subset (small PR, tests first).
2. Railway project with `dev` and `production` environments; Neon project with `main` and `dev`; R2 buckets and tokens. Variables loaded per environment.
3. Pre-deploy migration command and the direct DB URL; first dev deploy from `main`.
4. Basic auth and `noindex` on dev (env vars `DEV_BASIC_AUTH_USER`, `DEV_BASIC_AUTH_PASSWORD`, added to `.env.example`).
5. Post-deploy smoke workflow against dev.
6. Release workflow with the `production` environment and required reviewer; first prod deploy to the Railway domain.
7. Branch protection on `main` (`Pruebas` required).
8. Sentry and uptime checks.

## 8. Decisions on the former open questions (2026-11-03)

| Question | Decision |
|---|---|
| Region | US East: Railway US East (Virginia), Neon AWS `us-east-1` |
| Prod deploy mechanism | Railway CLI from the release workflow, behind the GitHub environment `production` |
| Dev access gate | Basic auth in the Next middleware, active only when the app runs in the dev environment, plus `noindex`. After the domain transfer, Cloudflare Access on `dev.torrentearcano.com` replaces it |
| Prod approvers | Daniel only |
