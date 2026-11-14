---
type: "Reference"
title: "Dev environment: public, never indexed"
openwiki_generated: true
sources:
  - id: openwiki-source-2615540ec7553288b52f775d
    resource: repo://docs/legacy/infra.md
  - id: openwiki-source-e97ce5e3668d477e63c70413
    resource: repo://playwright.dev-gate.config.ts
  - id: openwiki-source-c46dfd6e94656494b7d9df7b
    resource: repo://src/collections/Users.ts
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
  - id: openwiki-source-cd6d0cbf6430870fd37a8762
    resource: repo://tests/unit/dev-gate.test.ts
  - id: openwiki-source-299f708a96902b808ff05ee6
    resource: repo://tests/unit/robots.test.ts
generated: { by: "claude-code", at: "2026-11-14T11:00:46.827Z" }
verified:
  - by: openwiki/0.4.3
    at: 2026-11-14T11:00:46.827Z
---


# Dev environment: public, never indexed

The `dev` deployment runs the same build as production with `APP_ENV=dev` (or Railway's `RAILWAY_ENVIRONMENT_NAME=dev`). Since 2026-11-05 it is public: nothing asks for credentials. It is kept out of search engines instead. Until that date the same proxy put the whole site behind basic auth; it was dropped once Torre had his own panel account (`docs/legacy/infra.md`, sections 1 and 7).

The code lives in `src/lib/dev-gate/` and `src/proxy.ts`. In production, locally and in CI none of it changes anything. The proxy also answers old Squarespace URLs with a redirect or a 410 in every environment; that part is described in [Legacy redirects and SEO](redirects-and-seo.md).

## Detecting dev

`isDevEnvironment(env)` (`src/lib/dev-gate/dev-gate.ts`) returns true when `APP_ENV` or `RAILWAY_ENVIRONMENT_NAME` equals `dev`, ignoring case and surrounding spaces. Railway injects `RAILWAY_ENVIRONMENT_NAME`, and `.railway/railway.ts` also sets `APP_ENV=dev` for the `dev` environment. Everything below reads the environment per request or per process start, never at build time, so one build serves every environment.

## What dev does differently

| Piece | In dev | Elsewhere |
|---|---|---|
| `src/proxy.ts` | Adds `X-Robots-Tag: noindex, nofollow` (`NOINDEX_HEADER`) to every response, without asking for credentials | No header: production is indexed |
| `robots.txt` (`robotsFor` in `src/lib/dev-gate/robots.ts`, served by the force-dynamic `src/app/robots.ts`) | `User-Agent: *` / `Disallow: /` | Allows everything except `/admin` and points at `<public origin>/sitemap.xml` (`siteUrl`) |
| `/sistema` (`isDesignCatalogEnabled`) | Renders the component catalog, itself `noindex` | 404 in production |
| Sentry | Reports with the `dev` environment when `SENTRY_DSN` is set | `production`, or off locally and in CI |

The proxy has no `matcher`, so the header covers static files, API responses and the admin panel too.

## The admin panel

With no basic auth in front, the panel relies on Payload's login. The `users` collection pins `maxLoginAttempts: 5` and `lockTime` of ten minutes (Payload's defaults, fixed so they cannot change unnoticed), so an account locks for ten minutes after five failed logins. See [Collections and access](../cms/collections.md#users-panel-accounts).

## Tests

- `tests/unit/dev-gate.test.ts` covers `isDevEnvironment` (`APP_ENV`, Railway's variable, spaces and case, non-dev values) and the proxy: in dev it passes without asking for credentials and adds `noindex`, outside dev it leaves the response alone, and the module no longer exports a basic-auth gate.
- `pnpm test:e2e:dev-gate` (`playwright.dev-gate.config.ts`) builds and starts the app the E2E way with `APP_ENV=dev` on `E2E_DEV_GATE_PORT` (3101); `E2E_SKIP_BUILD=1` reuses the `pnpm test:e2e` build because the proxy reads the environment at start. `tests/e2e-dev-gate/gate.spec.ts` checks that the home page and a seeded guide load with no credentials and with `noindex`; that `/admin` asks for Payload's own login; that Next's static files and API responses (`/api/ready`, which reports the database as `ok`, and `/api/users`) carry `noindex` and never a `WWW-Authenticate` challenge; and that `robots.txt` disallows everything.
- `tests/unit/robots.test.ts` covers `robotsFor` in and out of dev, including the sitemap pointer, which in production needs `NEXT_PUBLIC_SITE_URL`: without it `robotsFor` throws rather than announce localhost.
- `tests/unit/railway-config.test.ts` checks that `dev` sets `APP_ENV=dev` and declares no basic-auth variables.

## Related pages

- [Environment configuration](../architecture/configuration.md)
- [Request pipeline](../architecture/request-pipeline.md)
- [Deployment and releases](deployment.md)
- [Component catalog (/sistema)](../frontend/component-catalog.md)
