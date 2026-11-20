---
type: guide
title: Quickstart
description: Entry point to the ta-web wiki. What the repo is, the four commands to get it running, and which page to read for each kind of task.
tags: [quickstart, onboarding, navigation]
sources:
  - id: openwiki-source-5f5b95b3d6a215fa02ceb945
    resource: repo://.env.example
  - id: openwiki-source-164e2da859b5277df81c7d94
    resource: repo://.github/workflows/ci.yml
  - id: openwiki-source-5b54a58d1b51cd490b0e7162
    resource: repo://package.json
  - id: openwiki-source-23775c3de52f3ab95a13cb8b
    resource: repo://README.md
  - id: openwiki-source-71c840280649a7620f8e010f
    resource: repo://scripts/db-dev.ts
  - id: openwiki-source-b086b6b1802f507b0e5a4c8f
    resource: repo://scripts/dungeon-notes.ts
  - id: openwiki-source-9e87f9929ce6181cecc80fe9
    resource: repo://scripts/import/import-guides.ts
  - id: openwiki-source-fd0bec8778f0f03626754905
    resource: repo://scripts/import/squarespace/to-quest-guide.ts
  - id: openwiki-source-13a4a70459b559cdd8e4d8fd
    resource: repo://scripts/refresh-game-data.ts
  - id: openwiki-source-4a5208ee002f2e6da1e00546
    resource: repo://scripts/zone-backgrounds.ts
  - id: openwiki-source-cb49e3c4d1015b8673e71275
    resource: repo://src/app/(frontend)/%5Bslug%5D/page.tsx
  - id: openwiki-source-803782f80e96170da42df0a4
    resource: repo://src/app/(frontend)/buscar/page.tsx
  - id: openwiki-source-5f0afecf4f0bcd886ec62fb5
    resource: repo://src/app/(frontend)/checklists/page.tsx
  - id: openwiki-source-2335a47ac9395688d636b848
    resource: repo://src/app/(frontend)/guias-dofus/page.tsx
  - id: openwiki-source-2db76d84ebc87095c44118ff
    resource: repo://src/app/(frontend)/metalogros/page.tsx
  - id: openwiki-source-7a2723ea85824e431ff5eb54
    resource: repo://src/collections/QuestGuides.ts
  - id: openwiki-source-2f2b90aba3af4142e443ba84
    resource: repo://src/lib/guides/strings.ts
generated: { by: "claude-code", at: "2026-11-20T11:20:16.585Z" }
verified:
  - by: openwiki/0.4.3
    at: 2026-11-20T11:20:16.585Z
---

# Quickstart

ta-web is the new torrentearcano.com: a Next.js 16 app with Payload CMS 3 inside it, Postgres, Cloudflare R2 and Railway. The skeleton, the site header and footer with search, the home page, quest guide pages, achievement pages, the metalogros index, the Dofus guides with their index, the checklists with their index, standalone pages, the editable site copy and menu navigation, the class and dungeon pages in the panel, Torre's corrections to DofusDB data, the legacy and changed-slug redirects, the sitemap, the four free themes with the header theme picker, the zone backgrounds of guides and achievement pages, the table block, the `/buscar` results page, share cards with JSON-LD, the «Actualizado el» date, Umami analytics and the delta import from Squarespace are built; member features are still planned. Start with the [Project overview](overview.md).

## Run it

```sh
pnpm install          # dependencies and git hooks
cp .env.example .env  # set PAYLOAD_SECRET (openssl rand -hex 32)
pnpm db:dev           # terminal 1: embedded Postgres on 127.0.0.1:54329
pnpm dev              # terminal 2: http://localhost:3000, panel at /admin
```

Node 24 (≥ 24.22.1) and pnpm 11. No Docker. Details in [Local development](workflows/local-development.md).

## Before you change anything

- Read `AGENTS.md`: workflow, language and stack rules. UI work also follows `DESIGN.md`.
- Work test-first. `pnpm test` for unit tests; the other suites are in [Test suites](testing/test-suites.md).
- Schema change: `pnpm migrate:create <name>` and `pnpm generate:types`, committed together.

## Find the right page

| I want to… | Read |
|---|---|
| Understand what exists and what is planned | [Project overview](overview.md) |
| Follow a request from the proxy to a route | [Request pipeline](architecture/request-pipeline.md) |
| Know what an environment variable does, or add one | [Environment configuration](architecture/configuration.md) |
| Change Payload settings, add an endpoint or admin component | [Payload CMS configuration](cms/payload-config.md) |
| Add or change a collection, or its access rules | [Collections and access](cms/collections.md) |
| Change how the panel looks and behaves for Torre: labels, menu groups, admin and editor roles, refused deletes, fields that lock once saved | [Admin panel](cms/admin-panel.md) |
| Change the «Pendiente» dashboard, the panel guide, the «En la web» status line, the preview sizes, form tabs, row labels, the checklist step outline and pickers, the color picker or the accessible names added to Payload's controls | [Panel dashboard and editing aids](cms/panel-editing-aids.md) |
| Write a quest guide in the panel, or change what its DofusDB quest fills in (title, slug, SEO, summary, the "Necesitarás" list) and the notes under each field | [Writing a quest guide](cms/guide-authoring.md) |
| Add or change a block in a guide body (rich text, image, YouTube video, callout, fight, table, step) | [Guide body blocks](cms/blocks.md) |
| Change how a published guide renders at `/<slug>`, its breadcrumb, header, steps or next quest card, draft preview or cache revalidation | [Public quest guide page](frontend/guide-page.md) |
| Change a quest guide's reward fields (XP, kamas, items, level tiers, other rewards), how the header picks between them and DofusDB, or run the reward maintenance scripts (`pnpm guides:rewards`, `guides:rewards-dofusdb`, `guides:reward-typos`, `guides:shown-items`) | [Quest guide rewards](data/guide-rewards.md) |
| Add or change a standalone page (emotes, how-tos, legal pages), how `/<slug>` renders it or sends it to Squarespace, or import them (`pnpm import:pages`) | [Standalone pages](pages/standalone-pages.md) |
| Change the class or dungeon pages in the panel (builds, «Sale en el menú»), the menu's class and dungeon lists, or import them (`pnpm import:section-pages`) | [Class and dungeon pages](pages/class-and-dungeon-pages.md) |
| Change the site name, description, share image, footer, social links, the home and index copy or the menu sections and featured Dofus Torre edits in «Ajustes del sitio», «Portada e índices» and «Navegación», or seed them (`pnpm seed:site-copy`) | [Site settings, index texts and navigation](cms/site-copy.md) |
| Change the achievement collections (DofusDB achievements, achievement pages, metalogros, dungeons), their fill from DofusDB and panel notes, or the shared root slug space | [Achievement data model](achievements/achievement-data.md) |
| Change how an achievement page renders at `/<slug>`, or a guide's achievement breadcrumb and "Misión 2 de 3" | [Achievement page](achievements/achievement-page.md) |
| Change the metalogros index at `/metalogros` or its search | [Metalogros index](achievements/metalogros-index.md) |
| Change the Dofus guides collection or the index global (fields, Necesitarás groups, achievement and quest parts, slugs, cache tag) | [Dofus guide data model](dofus-guides/dofus-guide-data.md) |
| Change how a Dofus guide renders at `/<slug>` (header, Necesitarás, achievements and quests, video, previous and next) | [Dofus guide page](dofus-guides/dofus-guide-page.md) |
| Change the `/guias-dofus` index, its search and filters, or the Dofus in the header menu | [Dofus guides index and menu](dofus-guides/dofus-guides-index.md) |
| Change the checklists collection (steps or souls kind), its steps and their identifiers, or import Torre's checklists (`pnpm import:checklists`) | [Checklist data and import](checklists/checklist-data.md) |
| Change how a steps checklist renders at `/<slug>`: the route lines inside each quest, «Objetos», its island and details | [Checklist page](checklists/checklist-page.md) |
| Change the souls checklist (the Ocre): souls derived from a quest and its monsters, stages, regions, the level search and its island | [Souls checklist (Ocre)](checklists/souls-checklist.md) |
| Change the `/checklists` posters, their art (`pnpm import:checklist-cards`), the «???» teaser, the poster progress or the menu entries | [Checklists index](checklists/checklists-index.md) |
| Change how checklist and souls progress is stored in the browser, or how the old app's progress is merged | [Checklist progress engine](checklists/progress.md) |
| Change the site header, footer, menu links (the Dofus and the checklists come from their collections), the search dialog, the `/buscar` results page without JavaScript or the `/api/search/guides` index | [Site header, footer and search](frontend/site-shell-and-search.md) |
| Change the home page or its hero quest search | [Home page](frontend/home-page.md) |
| Change the schema, connect to Neon, reset local data | [Database and migrations](data/database.md) |
| Load or refresh DofusDB quests, the monster and item catalogs, achievements and the NPCs, import game images, change how quest rewards (including per level tier), needs, zone and achievement are computed, change how DofusDB requests are retried, or work on the refresh runs (the «Refrescos de datos» list, «Traer ahora», the weekly cron) (`pnpm data:refresh`); print how dungeon notes match (`pnpm data:dungeon-notes`) | [DofusDB game data refresh](data/dofusdb-refresh.md) |
| Let Torre override a DofusDB name, level or image, or hide a record, and apply that on every page | [Torre corrections to DofusDB data](data/torre-corrections.md) |
| Change how Squarespace pages become quest guides, import them (`pnpm import:guides`) or bring imported guides up to date (`pnpm guides:backfill`, `pnpm guides:summary-text`) | [Squarespace import](data/squarespace-import.md) |
| Import Torre's metalogros index onto the achievement pages (`pnpm import:achievements`) or apply targeted fixes afterwards (`pnpm fix:achievements`) | [Importing Torre's achievement pages](data/achievements-import.md) |
| Import the prose of Torre's achievement pages (`pnpm import:achievement-prose`) or create the Alineamiento pages (`pnpm achievements:alineamiento`) | [Achievement prose import](data/achievement-prose-import.md) |
| Import Torre's Dofus guides (`pnpm import:dofus-guides`) or change how a Dofus page becomes a guide | [Importing Torre's Dofus guides](data/dofus-guides-import.md) |
| Download a new inventory of Torre's Squarespace site and bring what he changed there into ta-web without undoing his panel edits (`pnpm import:inventory`, `pnpm import:delta`) | [Inventory and delta import](data/delta-import.md) |
| Check that a converter change or a Squarespace markup change does not alter imported content (`pnpm test:import`, `pnpm import:golden-refresh`) | [Import golden tests](testing/import-golden.md) |
| Upload files, configure R2, serve images, backfill image sizes (`pnpm media:sizes`) | [Media storage](media/storage.md) |
| Work on the themes (Amakna by default, the header theme picker, Ocre premium), dark/light mode or the browser bar color | [Theme and mode](frontend/theme-and-mode.md) |
| Change the zone landscape behind quest guides and achievement pages, a subarea's «Fondo de la zona», the «Traer fondo de DofusDB» button or `pnpm zones:backgrounds` | [Zone background](frontend/zone-background.md) |
| Use design tokens and the item hues, rem units and the root size, the full-width page frame and its margins, fonts, the three-stylesheet limit, the page shell, the emblem or the favicon, print and forced colors, or change page transitions and motion | [Styles, tokens and site shell](frontend/styles-and-shell.md) |
| Use or change a button, callout, figure, amount or a quest guide component (quest header, rewards bag, icon wells, fight block, steps, next quest card, Torre's tips, video), or the island that copies coordinates and item names, opens images fullscreen and opens the rewards bag | [Design system components](frontend/design-system-components.md) |
| See every component in every theme, or add a new one to the catalog (`/sistema`) | [Component catalog (/sistema)](frontend/component-catalog.md) |
| Run or write tests, or the layout review that checks every public page type at four widths (`maquetacion.spec.ts`) | [Test suites](testing/test-suites.md) |
| Fix a failing Lighthouse budget (LCP, CLS, JavaScript, images) or add a page to `pnpm test:lhci` | [Performance budgets](testing/performance-budgets.md) |
| Fix a failing CI job or a git hook | [CI and quality gates](workflows/ci-and-quality-gates.md) |
| Review everything entering a release with AI before releasing (`pnpm review:release`) | [Release review](workflows/release-review.md) |
| Deploy to dev or release to production | [Deployment and releases](operations/deployment.md) |
| Check or monitor app health (`/api/health`, `/api/ready`) | [Health and readiness endpoints](operations/health-check.md) |
| Redirect or retire an old Squarespace URL, regenerate the stubs (`pnpm redirects:stubs`), change how a changed slug answers its old address, or change `/sitemap.xml` or `robots.txt` | [Legacy redirects, sitemap and robots.txt](operations/redirects-and-seo.md) |
| List every link still pointing at Squarespace or what this site will answer on every old URL before the domain cutover (`pnpm links:legacy`, `pnpm urls:map`) | [Legacy link reports and URL map](operations/legacy-links.md) |
| Change a page's share image, the Article and WebSite JSON-LD, or the «Actualizado el» date (`contentUpdatedAt`) | [Share cards, JSON-LD and update dates](operations/share-cards-and-structured-data.md) |
| Turn on or change page-view analytics (Umami) | [Analytics with Umami](operations/analytics.md) |
| Understand why dev is public but never indexed | [Dev environment](operations/dev-gate.md) |
| Find a server error | [Error monitoring with Sentry](operations/error-monitoring.md) |
| Set up a laptop | [Local development](workflows/local-development.md) |
