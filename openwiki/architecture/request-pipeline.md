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
  - id: openwiki-source-14ca87abed0f0ffc69067570
    resource: repo://src/app/(frontend)/%5Bslug%5D/redirect-data.ts
  - id: openwiki-source-f6463aeeb13df0785c5218a1
    resource: repo://src/app/(frontend)/error.tsx
  - id: openwiki-source-57f8bec0258d7f32b9cf331b
    resource: repo://src/app/(frontend)/ErrorView.tsx
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
  - id: openwiki-source-90182fdeabeb5c115ecbd1e9
    resource: repo://src/app/sitemap.ts
  - id: openwiki-source-c74463529d89880b13383ea1
    resource: repo://src/collections/Checklists.ts
  - id: openwiki-source-4563c6781f32461806ff9616
    resource: repo://src/collections/SubAreas.ts
  - id: openwiki-source-3565ad21d65bf23ebb27b148
    resource: repo://src/endpoints/checklist-details.ts
  - id: openwiki-source-1e1f10541d2f60e6ad8364a8
    resource: repo://src/endpoints/checklist-poster-progress.ts
  - id: openwiki-source-e6259e232b376ac021274244
    resource: repo://src/endpoints/health.ts
  - id: openwiki-source-def7d1eb211fec2407ad644c
    resource: repo://src/endpoints/search-index.ts
  - id: openwiki-source-273f067cfdf4642d554d72d2
    resource: repo://src/endpoints/zone-background.ts
  - id: openwiki-source-2dcb4ef15a24888e2bf6e8b3
    resource: repo://src/instrumentation.ts
  - id: openwiki-source-9f27f890e8ed62d0c9064556
    resource: repo://src/lib/checklists/poster-progress-url.ts
  - id: openwiki-source-66d7fca83a6f05e9ffb3f658
    resource: repo://src/lib/guides/slug.ts
  - id: openwiki-source-2c42ff828c6d8e213a2f7416
    resource: repo://src/payload.config.ts
  - id: openwiki-source-f34ac1e549d94dc3ac475ae4
    resource: repo://src/proxy.ts
  - id: openwiki-source-486ad82a8c55c43af9a04fc7
    resource: repo://tests/unit/next-compression.test.ts
generated: { by: "claude-code", at: "2026-11-20T11:20:16.585Z" }
verified:
  - by: openwiki/0.4.3
    at: 2026-11-20T11:20:16.585Z
---

# Request pipeline

ta-web is a single Next.js App Router application with Payload CMS 3 mounted inside it. One Node process serves the public site, the Payload admin panel, Payload's REST and GraphQL APIs and the custom endpoints. There is no separate CMS service.

```
request
  └─ src/proxy.ts            legacy URL → 301/307 redirect or 410 page (no rendering);
       │                       dev only: adds X-Robots-Tag noindex
       ├─ src/app/robots.ts               /robots.txt, computed per request
       ├─ src/app/sitemap.ts              /sitemap.xml, computed per request, cached data
       ├─ src/app/(frontend)/…            public site (server components)
       │    ├─ page.tsx                   home page
       │    ├─ [slug]                     quest guide, achievement page, Dofus guide,
       │    │                               standalone page or checklist; else slug redirect or 404
       │    ├─ metalogros                 metalogros index
       │    ├─ guias-dofus                Dofus guides index
       │    ├─ checklists                 checklists index
       │    ├─ sistema                    component catalog (not in production)
       │    ├─ buscar                     /buscar, search results without JavaScript
       │    ├─ og                         /og, the brand share card (and /[slug]/og per page)
       │    ├─ error.tsx                  error page inside the site shell
       │    └─ vista-previa               draft preview on/off
       └─ src/app/(payload)/…             Payload, generated files
            ├─ admin/[[...segments]]      /admin panel
            ├─ api/[...slug]              REST + custom endpoints (/api/health, /api/ready,
            │                               /api/search/guides, /api/dofusdb-values,
            │                               /api/game-data/refresh,
            │                               /api/checklists/:slug/details,
            │                               /api/checklists/poster-progress,
            │                               /api/subareas/:id/zone-background)
            ├─ api/graphql                GraphQL POST
            └─ api/graphql-playground
errors → src/instrumentation.ts → Sentry (server only, when configured)
```

## 1. Proxy

`src/proxy.ts` is the Next 16 proxy (formerly middleware). It runs in the Node runtime and has no `matcher`, so it sees every request, including static files and the admin panel. It reads `process.env` on each request rather than at build time, which lets one build serve both dev and production.

It does two things:

1. **Legacy URLs.** `lookupLegacyUrl` (`src/lib/redirects/table.ts`) looks the path up in a `Map` built once from `src/lib/redirects/legacy-urls.json`. A hit answers before Next renders anything: a 301 (or 307 for a section still being rewritten) to the new page on the public origin (`siteUrl`, falling back to the request's origin), without the old query string, or a 410 with a short Spanish HTML page (`gonePage`) in the visitor's mode and theme: the `ta-theme` cookie when it names a free theme (`isFreeTheme`), otherwise Amakna, since Ocre needs an entitlement. A miss passes through. See [Redirects, sitemap and robots](../operations/redirects-and-seo.md).
2. **Dev gate.** When `isDevEnvironment(process.env)` is true it adds `X-Robots-Tag: noindex, nofollow` to whatever response it returns, redirects and 410s included. Dev is public, with no basic auth. Details are in [Dev environment gate](../operations/dev-gate.md).

It never asks for credentials and never queries the database.

## 2. Route groups

The App Router tree has two route groups, each with its own root layout.

**`src/app/(frontend)/`** is the public site. Its layout reads the mode cookie (`ta-mode`) and the theme cookie (`ta-theme`), resolves both on the server (`resolveMode`, and `resolveTheme` with `premium: false`, since there are no members yet: a free theme from the cookie, otherwise `amakna`), renders `<html lang="es" data-theme data-mode>` and injects the pre-paint mode script, plus the inline Umami tracker when `umamiConfig(process.env)` returns a configuration (see [Analytics with Umami](../operations/analytics.md)). Its `generateViewport` resolves the same cookies and returns the theme-color of the header bar (`themeViewport`), so a phone browser's bar matches the header; see [Theme and mode](../frontend/theme-and-mode.md). In draft mode it renders `PreviewBar` above the header. It wraps every page in the site header and footer, puts the floating Ko-fi button (`KofiFloat`) right before the footer, adds the ambience particles (`Ambience`) after the footer, and loads in parallel, from `src/app/(frontend)/site-data.ts`, the header's guide counts (`loadSiteCounts`, `unstable_cache` under the `guide-pages` tag), the Dofus of the menu and search (`loadDofusNav`, under the `dofus-guides` tag, from the `dofus-guides` collection), the checklists of the menu (`loadChecklistNav`, mapped from `loadChecklists` under the `checklists` tag), the standalone pages for the footer's legal links (`loadPageNav`, under the `pages` tag), «Ajustes del sitio» (`loadSiteSettings`, under the `site-copy` tag) for the footer, the social links and the site-wide metadata, «Navegación» (`loadNavigation`, under the `site-copy` and `dofus-guides` tags) for the menu sections and the featured Dofus eggs, and the published class and dungeon pages (`loadSectionNav`, under the `section-pages` tag), whose menu lists only give the header its class and dungeon counts for now. Its `generateMetadata` builds `metadataBase` from `SITE_URL` and the site name, description and share image from those settings (see [Site settings and index texts](../cms/site-copy.md) and [Class and dungeon pages](../pages/class-and-dungeon-pages.md)); see [Site header, footer and search](../frontend/site-shell-and-search.md). Because it reads a cookie, every page renders per request; what is cached is the data.

The group holds:

- the [home page](../frontend/home-page.md) at `/`;
- `/[slug]`, which tries in order a quest guide, a published achievement page, a published Dofus guide, a standalone page and a checklist, loading each once per request. When none exists, `redirectOrNotFound` (`src/app/(frontend)/[slug]/redirect-data.ts`) looks the slug up in the cached table of changed slugs and answers a 308 to the page's current address, or calls `notFound()`; it runs last, so a page that takes an old address wins over its redirect row. A standalone page or checklist «En preparación» redirects to its Squarespace page instead, and a souls checklist renders `SoulsView` instead of `ChecklistView`. Guides, achievement pages, metalogros, Dofus guides, checklists and standalone pages share one slug space, so they never collide. See [Public quest guide page](../frontend/guide-page.md), [Achievement page](../achievements/achievement-page.md), [Dofus guide page](../dofus-guides/dofus-guide-page.md), [Standalone pages](../pages/standalone-pages.md), [Checklist page](../checklists/checklist-page.md), [Souls checklist](../checklists/souls-checklist.md) and [Redirects, sitemap and robots](../operations/redirects-and-seo.md);
- the [metalogros index](../achievements/metalogros-index.md) at `/metalogros`;
- the [Dofus guides index](../dofus-guides/dofus-guides-index.md) at `/guias-dofus`;
- the [checklists index](../checklists/checklists-index.md) at `/checklists`;
- `/buscar`, the search results page that works without JavaScript (see [Site header, footer and search](../frontend/site-shell-and-search.md));
- `/og` and `/[slug]/og`, the route handlers that draw the share cards (see [Share cards, JSON-LD and update dates](../operations/share-cards-and-structured-data.md));
- the `/vista-previa` routes that turn Next's draft mode on and off for editors;
- the `/sistema` component catalog outside production;
- `error.tsx`, a client error boundary that renders `ErrorView` (`src/app/(frontend)/ErrorView.tsx`) inside the header and footer: the page title, a sentence, a «retry» button that calls `reset` and a full-load link to the home page, styled like the 404. It has no state or effects, because Next loads it on every page. There is no `global-error.tsx`: it pushed the guide pages past their 150 KB JavaScript budget (see [Performance budgets](../testing/performance-budgets.md)).

Top-level routes win over `/[slug]`, so their segments (`admin`, `api`, `sistema`, `vista-previa`, `metalogros`, `guias-dofus`, `checklists`, `buscar`, `og`) are listed in `RESERVED_SLUGS` in `src/lib/guides/slug.ts`. The panel rejects them as slugs and the page returns 404 before querying. A new top-level route adds its segment there.

AGENTS.md defines the conventions: server components by default, data fetched on the server through Payload's local API, and client islands only where interaction requires them.

**`src/app/(payload)/`** is generated by Payload and must not be hand-edited (each file carries a "generated automatically" header). The layout wraps Payload's `RootLayout` with the admin import map and a server function handler. The catch-all `api/[...slug]/route.ts` exports Payload's REST handlers for every method; `api/graphql/route.ts` handles GraphQL POSTs.

## 3. robots.txt and sitemap.xml

`src/app/robots.ts` is marked `force-dynamic` so it is computed per request: the environment is only known when the container starts, not at build time. It returns `robotsFor(process.env)`, which disallows everything in dev and, elsewhere, allows everything except `/admin` and points to `<public origin>/sitemap.xml`.

`src/app/sitemap.ts` is `force-dynamic` too, because the build has no database. Its data read (`readSitemapData`) goes through `unstable_cache` with the `guide-pages`, `achievement-pages`, `dofus-guides`, `checklists` and `pages` tags, so publishing expires it like the pages themselves. See [Redirects, sitemap and robots](../operations/redirects-and-seo.md).

## 4. Custom endpoints

Endpoints listed in the Payload config's `endpoints` array are mounted under `/api` by the REST catch-all route. `src/payload.config.ts` registers five:

| Endpoint | File | Purpose |
|---|---|---|
| `GET /api/health` | `src/endpoints/health.ts` | Liveness for monitors and pollers; never touches the database. See [Health and readiness checks](../operations/health-check.md) |
| `GET /api/ready` | `src/endpoints/ready.ts` | The database check, for deploy smoke checks and manual checks only |
| `GET /api/search/guides` | `src/endpoints/search-index.ts` | The header and home page search index of published guides, fetched by the browser on first use. See [Site header, footer and search](../frontend/site-shell-and-search.md) |
| `GET /api/dofusdb-values/:source/:id` | `src/endpoints/dofusdb-values.ts` | What DofusDB gives for an achievement page or a metalogro, for the panel notes; panel users only. See [Achievement data model](../achievements/achievement-data.md) |
| `POST /api/game-data/refresh` | `src/endpoints/game-data-refresh.ts` | The panel's «Traer ahora»: starts a full DofusDB refresh in the server process; admins only. See [DofusDB game data refresh](../data/dofusdb-refresh.md) |

A collection can mount its own endpoints under its slug. The `subareas` collection mounts `POST /api/subareas/:id/zone-background` (`src/endpoints/zone-background.ts`), the panel's «Traer fondo de DofusDB» button, admins only; see [Zone background](../frontend/zone-background.md). The `checklists` collection mounts two:

- `GET /api/checklists/:slug/details` (`src/endpoints/checklist-details.ts`): the quest givers, coordinates and objectives the checklist island loads after the page paints. See [Checklist page](../checklists/checklist-page.md).
- `GET /api/checklists/poster-progress` (`src/endpoints/checklist-poster-progress.ts`): what the progress engine of each poster on `/checklists` needs, for every published checklist. It reads as a visitor through `unstable_cache` under the `checklists` tag, returns plain JSON and lets the browser keep it for five minutes. The index island requests it only when the browser has saved progress. See [Checklists index](../checklists/checklists-index.md).

New endpoints belong in `src/endpoints/` and get added to the config's array or to their collection.

The JSON endpoints (the search index and both checklist endpoints) return plain `Response.json` and let Next compress them like any response. Up to Next 16.4.5 route handler headers were stored as arrays and Next's `compression` middleware skipped them, so these endpoints gzipped their own bodies; 16.4.6 fixed it, the hand-made gzip is gone, and a `Content-Encoding` set by the handler would now be dropped. `tests/unit/next-compression.test.ts` runs Next's own compression and `sendResponse` against a route handler response and fails if a future Next version stops compressing it.

## 5. Error capture

`src/instrumentation.ts` is Next's instrumentation hook. `register()` runs only when `NEXT_RUNTIME` is `nodejs`; it imports the Sentry options builder dynamically and calls `Sentry.init` only when options are returned. `onRequestError` is wired to `Sentry.captureRequestError`, which covers errors from server components, route handlers and the proxy, and does nothing when Sentry was not initialized. There is no browser SDK and no edge runtime. See [Error monitoring with Sentry](../operations/error-monitoring.md).

## Build-level settings that affect requests

`next.config.ts` wraps the config with `withPayload` and then `withSentryConfig`. Relevant settings:

- `images.unoptimized: true`. The app never resizes images on request; Payload generates the AVIF and WebP variants on upload.
- `agentRules: false`, so `next dev` does not append its own block to `AGENTS.md`.
- `devIndicators: false`, so the Next indicator bubble does not cover the panel in development screenshots.
- `experimental.clientTraceMetadata` is deleted after `withSentryConfig`, so pages do not ship `sentry-trace` and `baggage` meta tags that would only serve a browser SDK and expose the DSN key.

## Related pages

- [Payload CMS configuration](../cms/payload-config.md)
- [Dev environment gate](../operations/dev-gate.md)
- [Health and readiness checks](../operations/health-check.md)
- [Redirects, sitemap and robots](../operations/redirects-and-seo.md)
- [Public quest guide page](../frontend/guide-page.md)
- [Achievement page](../achievements/achievement-page.md)
- [Site header, footer and search](../frontend/site-shell-and-search.md)
- [Theme and mode](../frontend/theme-and-mode.md)
