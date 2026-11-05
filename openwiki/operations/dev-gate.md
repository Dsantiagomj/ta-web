---
type: security
title: Dev environment gate
description: How the dev deployment is kept private and out of search engines with basic auth in the Next proxy, a fail-closed 503 when credentials are missing, one exempt health path, a noindex header and an environment-aware robots.txt.
tags: [security, dev-environment, basic-auth, proxy, seo]
verified:
  - by: openwiki/0.4.3
    at: 2026-11-05T11:00:19.182Z
sources:
  - id: openwiki-source-e97ce5e3668d477e63c70413
    resource: repo://playwright.dev-gate.config.ts
  - id: openwiki-source-cbc6ab52e896365649760a9f
    resource: repo://src/lib/dev-gate/design-catalog.ts
  - id: openwiki-source-6b31d93be9f7026d5af1d752
    resource: repo://src/lib/dev-gate/dev-gate.ts
  - id: openwiki-source-2ce84534e6026072681beb8b
    resource: repo://src/lib/dev-gate/robots.ts
  - id: openwiki-source-f34ac1e549d94dc3ac475ae4
    resource: repo://src/proxy.ts
  - id: openwiki-source-7d797ca6d3fc3312d9b9d118
    resource: repo://tests/e2e-dev-gate/gate.spec.ts
  - id: openwiki-source-e86e758ff5d85d87b1d704a1
    resource: repo://tests/e2e-dev-gate/unconfigured.spec.ts
  - id: openwiki-source-cd6d0cbf6430870fd37a8762
    resource: repo://tests/unit/dev-gate.test.ts
generated: { by: "claude-code", at: "2026-11-05T11:00:19.182Z" }
---

# Dev environment gate

The dev environment shows the half-built site and its admin panel to Torre for review. It must not be public and must not be indexed. The gate does that inside the app, so it works on any host and the same build serves dev and production.

The logic is in `src/lib/dev-gate/`; the wiring is `src/proxy.ts` and `src/app/robots.ts`.

## When it is active

`isDevEnvironment(env)` is true when `APP_ENV` or `RAILWAY_ENVIRONMENT_NAME` equals `dev` (trimmed, case-insensitive). Railway injects `RAILWAY_ENVIRONMENT_NAME`, and `.railway/railway.ts` also sets `APP_ENV=dev` for the dev environment. Production, local runs and CI are not dev, so the gate does nothing there.

Because `src/proxy.ts` reads `process.env` per request in the Node runtime, the decision is made at runtime, not baked in at build.

## The decision

`decideDevGate({ env, pathname, authorization })` returns one of four outcomes:

| Outcome | When | Proxy response |
|---|---|---|
| `open` | Not dev | Pass-through, no extra headers |
| `allow` | Dev, and the path is exempt or the credentials match | Pass-through with `X-Robots-Tag: noindex, nofollow` |
| `misconfigured` | Dev, and `DEV_BASIC_AUTH_USER` or `DEV_BASIC_AUTH_PASSWORD` is blank | `503`, Spanish "not available" message |
| `challenge` | Dev, with missing, malformed or wrong credentials | `401` with `WWW-Authenticate: Basic realm="Torrente Arcano: entorno de desarrollo", charset="UTF-8"` |

Order matters: the exempt path is checked before configuration, so `/api/health` answers even when the credentials are missing.

Both error responses carry `Cache-Control: no-store`, `Content-Type: text/plain; charset=utf-8` and the noindex header. The messages live in `src/lib/dev-gate/strings.ts`.

### Fail closed

If dev is detected but either credential is blank, every non-exempt path gets `503`. A forgotten variable takes the environment down instead of serving it open. The 503 has no `WWW-Authenticate` header, so browsers do not prompt for a password that cannot work.

### Credential checks

- The `Authorization` header must match `Basic <base64>`; the scheme is case-insensitive. Anything else is treated as no credentials.
- The decoded value is split at the first `:`, so a password may contain colons. UTF-8 (non-ASCII) credentials work.
- User and password are both compared, always, so timing does not reveal which one failed. Each comparison hashes both sides with SHA-256 and uses `timingSafeEqual` on the digests, so neither length nor the first differing character leaks through response time.

### The exempt path

`DEV_GATE_EXEMPT_PATHS` contains exactly `/api/health`, compared as an exact pathname. Uptime monitors and the deploy workflows can ping dev without the password because the endpoint only returns `ok` or `error`, the version and the commit. Everything else needs credentials, including `/admin`, the REST API, `robots.txt` and static files: the proxy has no `matcher`.

## Indexing

Two layers keep dev out of search engines:

- Every response the gate lets through or rejects in dev carries `X-Robots-Tag: noindex, nofollow`.
- `robotsFor(env)` returns `Disallow: /` for everyone in dev. Outside dev it allows everything except `/admin`. `src/app/robots.ts` is `force-dynamic` so the rule follows the runtime environment.

## The component catalog

`src/lib/dev-gate/design-catalog.ts` reuses `isDevEnvironment` for a second decision: whether `/sistema`, the design system catalog, renders or answers 404. It opens in the dev environment because the gate already puts basic auth in front of it there, and also under `pnpm dev` and in the E2E run (`E2E_DESIGN_CATALOG=1`). Production never serves it. See [Component catalog (/sistema)](../frontend/component-catalog.md).

## Tests

- `tests/unit/dev-gate.test.ts`: detection, every decision branch (non-ASCII credentials, passwords with colons, wrong user or password, malformed headers, lowercase scheme, exact exempt path, fail-closed with and without the exempt path) and both responses.
- `tests/unit/robots.test.ts`: dev and production rules.
- `pnpm test:e2e:dev-gate` (`playwright.dev-gate.config.ts`) starts the production build twice with `APP_ENV=dev`: once with test credentials on port 3101 (`tests/e2e-dev-gate/gate.spec.ts`: 401 on `/`, `/admin`, `/api/users` and `/robots.txt`; health open; wrong password rejected; home, admin and a disallow-all robots with credentials) and once with blank credentials on the next port (`unconfigured.spec.ts`: 503 without a `WWW-Authenticate` header).

To try it locally:

```sh
APP_ENV=dev DEV_BASIC_AUTH_USER=torre DEV_BASIC_AUTH_PASSWORD=clave pnpm dev
```

## Related pages

- [Request pipeline](../architecture/request-pipeline.md)
- [Health check endpoint](health-check.md)
- [Test suites](../testing/test-suites.md)
- [Component catalog (/sistema)](../frontend/component-catalog.md)
