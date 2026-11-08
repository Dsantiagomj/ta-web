---
type: architecture
title: Request pipeline
description: How an HTTP request moves through the Next.js proxy, the frontend and Payload route groups, robots.txt and Payload custom endpoints, and where server errors are reported.
tags: [architecture, nextjs, payload, routing, proxy]
sources:
  - id: openwiki-source-50a18d054b596a7ed0eeffb0
    resource: repo://next.config.ts
  - id: openwiki-source-5070cf9485858a3914a90ea6
    resource: repo://src/app/(frontend)/%5Bslug%5D/data.ts
  - id: openwiki-source-cb49e3c4d1015b8673e71275
    resource: repo://src/app/(frontend)/%5Bslug%5D/page.tsx
  - id: openwiki-source-7a2845694b67f1018000b585
    resource: repo://src/app/(frontend)/layout.tsx
  - id: openwiki-source-e662deaf5fc4b6bc8b7128a5
    resource: repo://src/app/(frontend)/site-data.ts
  - id: openwiki-source-07144b2bfe70fe832648abcc
    resource: repo://src/app/(payload)/api/%5B...slug%5D/route.ts
  - id: openwiki-source-1cc46ad4e4240a3b361caf82
    resource: repo://src/app/(payload)/api/graphql/route.ts
  - id: openwiki-source-92e7194e47ea5652f723471b
    resource: repo://src/app/robots.ts
  - id: openwiki-source-e6259e232b376ac021274244
    resource: repo://src/endpoints/health.ts
  - id: openwiki-source-2dcb4ef15a24888e2bf6e8b3
    resource: repo://src/instrumentation.ts
  - id: openwiki-source-66d7fca83a6f05e9ffb3f658
    resource: repo://src/lib/guides/slug.ts
  - id: openwiki-source-2c42ff828c6d8e213a2f7416
    resource: repo://src/payload.config.ts
  - id: openwiki-source-f34ac1e549d94dc3ac475ae4
    resource: repo://src/proxy.ts
generated: { by: "claude-code", at: "2026-11-08T11:00:21.339Z" }
verified:
  - by: openwiki/0.4.3
    at: 2026-11-08T11:00:21.339Z
---

# Request pipeline

ta-web is a single Next.js App Router application with Payload CMS 3 mounted inside it. One Node process serves the public site, the Payload admin panel, Payload's REST and GraphQL APIs and the custom endpoints. There is no separate CMS service.

```
request
  └─ src/proxy.ts            (dev only: adds X-Robots-Tag noindex)
       ├─ src/app/robots.ts               /robots.txt, computed per request
       ├─ src/app/(frontend)/…            public site (server components)
       │    ├─ page.tsx                   home page
       │    ├─ [slug]                     quest guide or achievement page
       │    ├─ metalogros                 metalogros index
       │    ├─ sistema                    component catalog (not in production)
       │    └─ vista-previa               draft preview on/off
       └─ src/app/(payload)/…             Payload, generated files
            ├─ admin/[[...segments]]      /admin panel
            ├─ api/[...slug]              REST + custom endpoints (/api/health,
            │                               /api/search/guides, /api/dofusdb-values)
            ├─ api/graphql                GraphQL POST
            └─ api/graphql-playground
errors → src/instrumentation.ts → Sentry (server only, when configured)
```

## 1. Proxy

`src/proxy.ts` is the Next 16 proxy (formerly middleware). It runs in the Node runtime and has no `matcher`, so it sees every request, including static files and the admin panel. It reads `process.env` on each request rather than at build time, which lets one build serve both dev and production.

It never blocks a request. When `isDevEnvironment(process.env)` is true it lets the request through with `X-Robots-Tag: noindex, nofollow`; outside dev it is a plain pass-through. Dev is public, with no basic auth. Details are in [Dev environment gate](../operations/dev-gate.md).

## 2. Route groups

The App Router tree has two route groups, each with its own root layout.

**`src/app/(frontend)/`** is the public site. Its layout reads the mode cookie, resolves the theme on the server, renders `<html lang="es" data-theme data-mode>` and injects the pre-paint mode script; see [Theme and mode](../frontend/theme-and-mode.md). It wraps every page in the site header and footer, and loads the header's guide counts through `unstable_cache` under the `guide-pages` tag; see [Site header, footer and search](../frontend/site-shell-and-search.md). Because it reads a cookie, every page renders per request; what is cached is the data.

The group holds:

- the [home page](../frontend/home-page.md) at `/`;
- `/[slug]`, which serves a quest guide or, when no guide has that slug, a published achievement page, and calls `notFound()` when neither exists. Guides, achievement pages and metalogros share one slug space, so the two never collide. See [Public quest guide page](../frontend/guide-page.md) and [Achievement page](../achievements/achievement-page.md);
- the [metalogros index](../achievements/metalogros-index.md) at `/metalogros`;
- the `/vista-previa` routes that turn Next's draft mode on and off for editors;
- the `/sistema` component catalog outside production.

Top-level routes win over `/[slug]`, so their segments (`admin`, `api`, `sistema`, `vista-previa`, `metalogros`) are listed in `RESERVED_SLUGS` in `src/lib/guides/slug.ts`. The panel rejects them as slugs and the page returns 404 before querying. A new top-level route adds its segment there.

AGENTS.md defines the conventions: server components by default, data fetched on the server through Payload's local API, and client islands only where interaction requires them.

**`src/app/(payload)/`** is generated by Payload and must not be hand-edited (each file carries a "generated automatically" header). The layout wraps Payload's `RootLayout` with the admin import map and a server function handler. The catch-all `api/[...slug]/route.ts` exports Payload's REST handlers for every method; `api/graphql/route.ts` handles GraphQL POSTs.

## 3. robots.txt

`src/app/robots.ts` is marked `force-dynamic` so it is computed per request: the environment is only known when the container starts, not at build time. It returns `robotsFor(process.env)`, which disallows everything in dev and allows everything except `/admin` elsewhere.

## 4. Custom endpoints

Endpoints listed in the Payload config's `endpoints` array are mounted under `/api` by the REST catch-all route. `src/payload.config.ts` registers three:

| Endpoint | File | Purpose |
|---|---|---|
| `GET /api/health` | `src/endpoints/health.ts` | Smoke checks after a deploy. See [Health check endpoint](../operations/health-check.md) |
| `GET /api/search/guides` | `src/endpoints/search-index.ts` | The header and home page search index of published guides, fetched by the browser on first use. See [Site header, footer and search](../frontend/site-shell-and-search.md) |
| `GET /api/dofusdb-values/:source/:id` | `src/endpoints/dofusdb-values.ts` | What DofusDB gives for an achievement page or a metalogro, for the panel notes; panel users only. See [Achievement data model](../achievements/achievement-data.md) |

New endpoints belong in `src/endpoints/` and get added to the same array.

## 5. Error capture

`src/instrumentation.ts` is Next's instrumentation hook. `register()` runs only when `NEXT_RUNTIME` is `nodejs`; it imports the Sentry options builder dynamically and calls `Sentry.init` only when options are returned. `onRequestError` is wired to `Sentry.captureRequestError`, which covers errors from server components, route handlers and the proxy, and does nothing when Sentry was not initialized. There is no browser SDK and no edge runtime. See [Error monitoring with Sentry](../operations/error-monitoring.md).

## Build-level settings that affect requests

`next.config.ts` wraps the config with `withPayload` and then `withSentryConfig`. Relevant settings:

- `images.unoptimized: true`. The app never resizes images on request; Payload generates the AVIF and WebP variants on upload.
- `agentRules: false`, so `next dev` does not append its own block to `AGENTS.md`.
- `experimental.clientTraceMetadata` is deleted after `withSentryConfig`, so pages do not ship `sentry-trace` and `baggage` meta tags that would only serve a browser SDK and expose the DSN key.

## Related pages

- [Payload CMS configuration](../cms/payload-config.md)
- [Dev environment gate](../operations/dev-gate.md)
- [Health check endpoint](../operations/health-check.md)
- [Public quest guide page](../frontend/guide-page.md)
- [Achievement page](../achievements/achievement-page.md)
- [Site header, footer and search](../frontend/site-shell-and-search.md)
- [Theme and mode](../frontend/theme-and-mode.md)
