---
type: overview
title: Project overview
description: What ta-web is, the stack it runs on, which parts exist in code today (guides, achievements, Dofus guides, checklists, standalone pages, class and dungeon pages in the panel, editable site copy and navigation, DofusDB game data with Torre's corrections) and which are still planned, and how the subsystems connect.
tags: [overview, architecture, nextjs, payload, roadmap]
sources:
  - id: openwiki-source-164e2da859b5277df81c7d94
    resource: repo://.github/workflows/ci.yml
  - id: openwiki-source-d60a6f0f1e9b6eab797ff859
    resource: repo://.railway/railway.ts
  - id: openwiki-source-8037e2358a2c4f9b2c722a11
    resource: repo://AGENTS.md
  - id: openwiki-source-46a5fe0601ecffbcc4ce1280
    resource: repo://docs/legacy/README.md
  - id: openwiki-source-7382aecd8b46a81ca66efc96
    resource: repo://lighthouserc.cjs
  - id: openwiki-source-5b54a58d1b51cd490b0e7162
    resource: repo://package.json
  - id: openwiki-source-23775c3de52f3ab95a13cb8b
    resource: repo://README.md
  - id: openwiki-source-9f5c4ea9e246f4ab67e69333
    resource: repo://scripts/backfill-guides.ts
  - id: openwiki-source-b086b6b1802f507b0e5a4c8f
    resource: repo://scripts/dungeon-notes.ts
  - id: openwiki-source-e83c2fdd2947ea7668ffa73d
    resource: repo://scripts/import/fix-achievements.ts
  - id: openwiki-source-97e144348afe72981f00c973
    resource: repo://scripts/import/import-achievements.ts
  - id: openwiki-source-36d8bf7e37d841ba67a15d0b
    resource: repo://scripts/import/import-checklist-cards.ts
  - id: openwiki-source-5e5a9deaf2d00890b3600afb
    resource: repo://scripts/import/import-checklists.ts
  - id: openwiki-source-d669905ebde3b9714d879fbc
    resource: repo://scripts/import/import-dofus-guides.ts
  - id: openwiki-source-3fc9f0484081f9ab441d6219
    resource: repo://scripts/import/load-quest-guides.ts
  - id: openwiki-source-fd0bec8778f0f03626754905
    resource: repo://scripts/import/squarespace/to-quest-guide.ts
  - id: openwiki-source-13a4a70459b559cdd8e4d8fd
    resource: repo://scripts/refresh-game-data.ts
  - id: openwiki-source-b6d2ac28f484617caef7e1ad
    resource: repo://scripts/review-release.ts
  - id: openwiki-source-4a5208ee002f2e6da1e00546
    resource: repo://scripts/zone-backgrounds.ts
  - id: openwiki-source-cb49e3c4d1015b8673e71275
    resource: repo://src/app/(frontend)/%5Bslug%5D/page.tsx
  - id: openwiki-source-5f0afecf4f0bcd886ec62fb5
    resource: repo://src/app/(frontend)/checklists/page.tsx
  - id: openwiki-source-2335a47ac9395688d636b848
    resource: repo://src/app/(frontend)/guias-dofus/page.tsx
  - id: openwiki-source-2db76d84ebc87095c44118ff
    resource: repo://src/app/(frontend)/metalogros/page.tsx
  - id: openwiki-source-aafaf952c3fb594c6ce91656
    resource: repo://src/app/(frontend)/page.tsx
  - id: openwiki-source-102ac9d3e731f9c02830d89f
    resource: repo://src/app/(frontend)/sistema/page.tsx
  - id: openwiki-source-c74463529d89880b13383ea1
    resource: repo://src/collections/Checklists.ts
  - id: openwiki-source-c78752655126ed640ba9a6d7
    resource: repo://src/collections/game-data-access.ts
  - id: openwiki-source-30fb9110f08cd9302abaca1a
    resource: repo://src/collections/Items.ts
  - id: openwiki-source-f6a77b87c2cce3530ab6695f
    resource: repo://src/collections/quest-guide-autofill.ts
  - id: openwiki-source-7a2723ea85824e431ff5eb54
    resource: repo://src/collections/QuestGuides.ts
  - id: openwiki-source-633cb155d38055ddc4af30fc
    resource: repo://src/collections/Quests.ts
  - id: openwiki-source-899ad2bd146eda3e8bb742c7
    resource: repo://src/collections/section-pages.ts
  - id: openwiki-source-4563c6781f32461806ff9616
    resource: repo://src/collections/SubAreas.ts
  - id: openwiki-source-c59753480751a9469ce8e192
    resource: repo://src/collections/torre-correction.ts
  - id: openwiki-source-c46dfd6e94656494b7d9df7b
    resource: repo://src/collections/Users.ts
  - id: openwiki-source-96b94ee077b0d0a0987ef203
    resource: repo://src/components/quest-guide-admin/QuestAutofill.tsx
  - id: openwiki-source-39afe86b52965c905da37bef
    resource: repo://src/components/site/nav.ts
  - id: openwiki-source-66dbb4d960232b7c95cf77e8
    resource: repo://src/globals/Navigation.ts
  - id: openwiki-source-ede372402a144740e1c5a80c
    resource: repo://src/lib/derive/checklist.ts
  - id: openwiki-source-cbc6ab52e896365649760a9f
    resource: repo://src/lib/dev-gate/design-catalog.ts
  - id: openwiki-source-09d6fe64c97ce6ea0a1d16e8
    resource: repo://src/lib/dofusdb/refresh-game-data.ts
  - id: openwiki-source-4ce5bfd40fc86e2e8680d71f
    resource: repo://src/lib/dofusdb/refresh-quests.ts
  - id: openwiki-source-6f1014e367f65576c0cc5a42
    resource: repo://src/lib/search/guide-index.ts
  - id: openwiki-source-aa3c4bb3373afa113c60c023
    resource: repo://src/lib/theme/theme.ts
  - id: openwiki-source-c306fbe28866186a2df852b4
    resource: repo://src/migrations/index.ts
  - id: openwiki-source-2c42ff828c6d8e213a2f7416
    resource: repo://src/payload.config.ts
generated: { by: "claude-code", at: "2026-11-18T11:06:38.803Z" }
verified:
  - by: openwiki/0.4.3
    at: 2026-11-18T11:06:38.803Z
---

# Project overview

ta-web is the new torrentearcano.com: Torre's Dofus quest guides, achievements, classes, Dofus guides and checklists, with member accounts, per-member progress and premium features. It replaces the current Squarespace site and the checklist embeds served from the separate `silvestre-checklist` repo.

The site, the CMS panel and the UI copy are in Spanish. The repo's docs are in English.

## Stack

| Layer | In use today | Planned |
|---|---|---|
| App | Next.js 16 App Router, React 19, TypeScript, server components | |
| CMS | Payload CMS 3, inside the Next app | Classes and dungeon guides, navigation and announcement globals, the dialogue block |
| Database | Postgres through Payload's adapter; Neon when deployed, embedded Postgres 17 locally | Drizzle tables for member progress |
| Media | Cloudflare R2 through `@payloadcms/storage-s3`, local disk as fallback; AVIF/WebP sizes generated by Payload on upload | |
| Styles | Tailwind v4 with the tokens from `DESIGN.md` | |
| Members | | Better Auth (Google, Discord, magic link) |
| Search | Name search over a JSON index of published quest guides, achievement pages and metalogros, plus the Dofus guides, checklists and standalone pages the menu links (`GET /api/search/guides`), shared by the header dialog and the home page | Postgres full text (`spanish` plus `unaccent`) |
| Hosting | One Node container per environment on Railway (`dev`, `production`), plus a weekly `game-data` cron service in `dev` | The production cron |
| Errors | Sentry, server only | |

Runtime: Node 24 (`>=24.22.1 <25`) and pnpm 11, pinned in `package.json`.

## What exists today

The skeleton is done, quest guides, achievement pages, Dofus guides, checklists and standalone pages are live in the app, and member features are not built yet.

- **Public site**: a site-wide header (a flat bar with the Sello lockup, a menu panel per section with the current section marked, Torre's Ko-fi button, the search dialog, the theme picker and the dark/light mode switch), a floating Ko-fi button and the footer; the home page with its hero search for quests and achievements; quest guide pages at `/<slug>` in the v5 single column, left aligned and as wide as the page frame (breadcrumb to the achievement, quest giver NPC, summary columns with the rewards bag, steps separated by a line, fight blocks and the next quest card); achievement pages and Dofus guides at the same `/<slug>`; the metalogros index at `/metalogros`; the Dofus guides index at `/guias-dofus`, whose list also feeds the header's Dofus menu; and checklists at `/<slug>` with the `/checklists` index, a row of posters that show the browser's progress per checklist. A checklist is either a steps route (the Silvestre, the Dofus de los Hielos, the Nebuloso) with Torre's stops and resolves drawn inside each quest's objectives, or a souls checklist (the Ocre) derived from one quest and its monsters, grouped by stage or region with a level-aware search; progress is kept in the browser, and a checklist still «En preparación» redirects to its Squarespace page. Achievement pages show a side sheet with prerequisites, «Necesitarás en total» and rewards beside their quests. Standalone pages (emotes, how-tos, the legal pages) also live at `/<slug>`, and one still «En preparación» redirects to its Squarespace page like a checklist. Guides, achievement pages, Dofus guides, standalone pages and checklists have draft preview from the panel and revalidate on save. Pages the app does not have yet (classes, dungeons) are linked on the legacy Squarespace site, and their sections show «Próximamente» in the menu; quest, achievement, Dofus guide and checklist links never go there. Old Squarespace URLs without a page of their own get a redirect or a 410 from one table before Next renders, a slug Torre changes answers its old address with a 308, and `/sitemap.xml` lists what a visitor can open. The site name, description, share image, footer, social links and the copy of the home page and the three indexes come from two editable globals, and the menu sections and featured Dofus from a third, «Navegación», with the built-in text as fallback. A layer of particles («Ambience») sits at the top of every page. Every link loads the whole page, which the browser crosses with a view transition while the header and footer stay still, and panels, dialogs and lists animate in and out (DESIGN.md, Motion). Every page uses the full width, left aligned, with side margins that grow with the screen up to a 110rem frame. Four free themes (Amakna, the default, Arcano, Bonta and Brâkmar, chosen in the header and kept in a cookie) and a dark/light mode; Ocre stays premium. List items take one of eight theme hues. Quest guides and achievement pages show the landscape of their zone behind the whole page, from the page's own upload or its subarea's cropped DofusDB map render. Pages print light on white paper. There is an error page with the 404's look. Fonts are Montserrat, Rowdies for page titles, Lexend for the interface and Lilita One. See [Home page](frontend/home-page.md), [Site header, footer and search](frontend/site-shell-and-search.md), [Public quest guide page](frontend/guide-page.md), [Achievement page](achievements/achievement-page.md), [Metalogros index](achievements/metalogros-index.md), [Dofus guide page](dofus-guides/dofus-guide-page.md), [Dofus guides index and menu](dofus-guides/dofus-guides-index.md), [Checklist page](checklists/checklist-page.md), [Souls checklist (Ocre)](checklists/souls-checklist.md), [Checklists index](checklists/checklists-index.md), [Checklist progress engine](checklists/progress.md), [Standalone pages](pages/standalone-pages.md), [Site settings and index texts](cms/site-copy.md), [Legacy redirects, sitemap and robots.txt](operations/redirects-and-seo.md), [Styles, tokens and site shell](frontend/styles-and-shell.md), [Theme and mode](frontend/theme-and-mode.md) and [Zone background](frontend/zone-background.md).
- **Design system**: the generic components (`src/components/ui/`) and the quest guide components (`src/components/game/`) from `DESIGN.md`, with one client island on guide and achievement pages, `PageEnhancements`, that copies coordinates and item names, plays videos on click, opens images fullscreen and opens and closes the rewards bag. The guide page renders them, and `/sistema` shows every component in the five themes and both modes; it answers 404 in production. See [Design system components](frontend/design-system-components.md) and [Component catalog (/sistema)](frontend/component-catalog.md).
- **CMS**: Payload with twenty collections and five globals: `users` (panel accounts with an administrator or editor role, at least one administrator always kept, locked for ten minutes after five failed logins), `media`; `quests`, `items`, `monsters`, `dungeons`, `npcs`, `subareas`, `achievements` and `achievement-categories` (DofusDB game data the panel cannot edit, except the «Corrección de Torre» group on quests, items, monsters, dungeons, NPCs and achievements, which overrides a name, level or image, or hides the record, on every page, and a subarea's zone background, which only an administrator sets, by upload or with «Traer fondo de DofusDB»); `game-data-refreshes` (one row per game data refresh) and `redirects` (old slugs and where they go now); and Torre's editorial collections with drafts and versions, readable by the public only once published: `quest-guides`, `achievement-pages`, `achievement-groups` (metalogros), `dofus-guides` (one guide per Dofus, pointing at achievement pages and quest guides, with its «Necesitarás» in a fixed list of groups), `checklists` (Torre's route to one Dofus, as steps or as the souls of one quest), `pages` (standalone pages), and `class-pages` and `dungeon-pages` (Torre's class builds and dungeon pages, edited in the panel, still without a public page, feeding the menu's class and dungeon lists); plus the `dofus-guides-index` global with the index's intro, the `checklists-index` global with the «???» poster, the `site-settings` («Ajustes del sitio») and `index-texts` («Portada e índices») globals with the site copy, and the `navigation` («Navegación») global with the menu sections and the featured Dofus. Editors write; only an administrator deletes, and nothing a guide still uses, nor game art, can be deleted. Spanish admin UI and a single `es` locale. The panel opens on «Pendiente», a dashboard of drafts and pages in preparation, has a panel guide at `/admin/guia`, says in one line what a visitor sees of each document, splits long forms into tabs, picks checklist steps by name and stop objectives by text, and names every control for screen readers. Guides, achievement pages, metalogros, Dofus guides and checklists share one slug space at the root, which never takes a slug from the legacy redirect table. A guide starts from its DofusDB quest, one per guide: picking it fills the empty title, slug, SEO fields and summary (prerequisites, the "Necesitarás" item list, rewards with their level tiers, start NPC and coordinates) live in the panel form; on save the server fills the SEO and summary only when the guide is created or its quest changes, and the «Rellenar desde DofusDB» button fills them on request; nothing already written is overwritten. A guide's rewards are fields Torre edits (XP, kamas, items, level tiers, other rewards) beside his Squarespace text. Guide bodies are built from rich text, image, video (YouTube only), callout, fight and step blocks, picked from a block chooser with thumbnails. Achievement pages and metalogros fill their empty fields from their DofusDB record the same way, with a note under each field comparing it with DofusDB, and their state (Publicada or En preparación) is Torre's. See [Admin panel](cms/admin-panel.md), [Panel dashboard and editing aids](cms/panel-editing-aids.md), [Writing a quest guide](cms/guide-authoring.md), [Quest guide rewards](data/guide-rewards.md), [Torre corrections to DofusDB data](data/torre-corrections.md), [Achievement data model](achievements/achievement-data.md), [Checklist data and import](checklists/checklist-data.md), [Dofus guide data model](dofus-guides/dofus-guide-data.md), [Payload CMS configuration](cms/payload-config.md), [Collections and access](cms/collections.md) and [Guide body blocks](cms/blocks.md).
- **Data**: fifty committed migrations; schema push only under `next dev`. See [Database and migrations](data/database.md).
- **Game data**: `pnpm data:refresh` (its old name `pnpm data:quests` still works) copies every quest from the public DofusDB API into `quests`, the whole DofusDB monster and item catalogs into `monsters` and `items`, so a guide can name any of them, every achievement category and the achievements under Misiones and Eventos, and the quest-giving NPCs into `npcs`. It imports into `media` once the NPC renders, the achievement icons and the images of the items and monsters some page shows, and creates the missing metalogros and achievement pages «En preparación»; idempotently and without deleting anything, and never touching Torre's corrections. Each run leaves a row in the panel's «Refrescos de datos», and only one runs at a time; a weekly Railway cron in `dev` and an administrator's «Traer ahora» button start it too. Monsters also keep their grade levels, boss and archmonster flags and subarea, and dungeons their level, for the souls checklist. It ends with a report of how each dungeon note of the published achievement pages matched; `pnpm data:dungeon-notes` prints only that report. Each quest stores its zone, its achievement and position in it, its rewards for a level-200 character (XP and the XP at the optimal level, kamas, items, emote, spell, title and job IDs, and per level tier for quests whose reward changes with the character's level) and its needs (show objectives kept apart from bring objectives) (items, monsters, whether you walk new maps); each start position also keeps its map's subarea, which picks a guide's zone background. `pnpm zones:backgrounds` fetches the zone background of every subarea a published page uses that still has none. See [DofusDB game data refresh](data/dofusdb-refresh.md) and [Torre corrections to DofusDB data](data/torre-corrections.md).
- **Squarespace import**: `scripts/import/` turns a cached Squarespace page into a quest guide draft (summary, start NPC, an introduction, steps and a closing, callouts and Torre's recommendations) and lists what it could not convert. `pnpm import:guides` loads them into `quest-guides` as drafts, with each image stored once in `media` and the guide's DofusDB quest linked when the page names exactly one that is already in `quests`; the summary gaps are filled from DofusDB as on save, so re-running it changes only what changed and never publishes. Five demo guides are covered by tests. `pnpm guides:backfill` brings guides imported earlier up to the current importer (closing sentence, fight blocks), and `pnpm import:achievements` copies Torre's metalogros index (order, names, slugs, states) onto the metalogros and achievement pages, with `pnpm fix:achievements` for targeted corrections afterwards and `pnpm import:achievement-prose` for the prose of each achievement page. `pnpm import:dofus-guides` reads each Dofus page of Torre's site into `dofus-guides`, linking its achievements, quests and items, and on a rerun leaves alone what Torre changed in the panel. `pnpm import:checklists` loads Torre's checklists from a copy of `silvestre-checklist` into `checklists`: the ported ones (the Silvestre, the Hielos and the Nebuloso whole, the Ocre as a souls checklist) as drafts «En preparación», the rest as «En preparación» cards linking to Squarespace, keeping each step's identifier on a rerun; `pnpm import:checklist-cards` brings the poster art of the old hub. `pnpm import:pages` brings Torre's loose Squarespace pages (emotes, how-tos, the legal pages) into `pages`, and `pnpm import:section-pages` his class and dungeon pages into `class-pages` and `dungeon-pages`. One-off maintenance scripts filled and cleaned the structured guide rewards (`pnpm guides:rewards`, `guides:rewards-dofusdb`, `guides:reward-typos`) and the guides' shown items (`pnpm guides:shown-items`), and `pnpm seed:site-copy` writes the built-in site copy into the three site copy globals. See [Squarespace import](data/squarespace-import.md), [Importing Torre's achievement pages](data/achievements-import.md), [Achievement prose import](data/achievement-prose-import.md) [Importing Torre's Dofus guides](data/dofus-guides-import.md), [Checklist data and import](checklists/checklist-data.md), [Standalone pages](pages/standalone-pages.md), [Class and dungeon pages](pages/class-and-dungeon-pages.md) and [Quest guide rewards](data/guide-rewards.md).
- **Media**: R2 or disk, chosen by environment. See [Media storage](media/storage.md).
- **Operations**: `GET /api/health` (liveness, never touching the database) and `GET /api/ready` (with the database), the legacy URL redirects in `src/proxy.ts`, `/sitemap.xml`, the search index at `GET /api/search/guides`, the panel's `GET /api/dofusdb-values/:source/:id`, the admin-only `POST /api/game-data/refresh`, a public dev environment that is never indexed, server-side Sentry, Railway infrastructure as code, and GitHub workflows for CI, dev smoke tests and production releases. See the operations pages.
- **Quality**: unit, integration, E2E (including axe WCAG 2.2 AA on every public page type and on the panel, and a layout review of every public page type at four widths), dev environment and smoke suites; Lighthouse CI performance budgets, split in two shards, on the home page, a seeded guide, a seeded achievement page, `/metalogros`, `/guias-dofus`, `/checklists`, a seeded Dofus guide and a seeded checklist; lint, format, types and dependency audit in CI; git hooks for formatting, linting, AI review and commit messages; and `pnpm review:release`, an AI review of everything entering the next release. See [Test suites](testing/test-suites.md), [Performance budgets](testing/performance-budgets.md) and [Release review](workflows/release-review.md).

## What is planned

AGENTS.md describes the target layout and rules. Not yet in the code:

- The other editorial collections: classes and dungeon guides (`src/collections/`).
- The navigation and announcement bar globals in `src/globals/`, and the dialogue block in `src/blocks/`.
- Members with Better Auth, per-member progress in Drizzle tables, entitlement checks, premium themes and view modes.
- The rest of the Squarespace import (`scripts/import/`): the review queue and the other page types.
- Postgres full-text search and the Twitch live state. Derived checklist data has started in `src/lib/derive/`, computed from stored quests at render time.

When a rule names a path that does not exist yet, create it with that name.

## How the pieces connect

```
Browser ──▶ Railway container (Node 24)
              └─ Next.js
                   ├─ proxy.ts ─ legacy URL redirects and 410s; noindex header (dev only)
                   ├─ (frontend) routes ─ server components ─ Payload local API
                   ├─ (payload) routes ─ /admin, REST, GraphQL, /api/health, /api/ready
                   └─ instrumentation ─ Sentry
              ├──▶ Neon Postgres (pooled URL; direct URL for migrations)
              └──▶ Cloudflare R2 (uploads; public CDN URLs)
```

One build serves both environments. Everything that differs between dev and production is read from environment variables at runtime. See [Request pipeline](architecture/request-pipeline.md) and [Environment configuration](architecture/configuration.md).

## Where the rules live

| File | What |
|---|---|
| `AGENTS.md` | The contract for anyone changing the repo: workflow, language, stack, layout, rules |
| `DESIGN.md` | Visual language and tokens |
| `README.md` | Development, scripts, deploys, hooks, CI |
| `openwiki/` | This generated wiki, the only generated documentation. A daily scheduled task outside the repo refreshes it with the `openwiki` skill in `update` mode and opens a docs PR; feature PRs leave it alone |
| `docs/legacy/` | The hand-written plan, infrastructure and dependency-security docs this wiki replaced, kept for decisions and infrastructure state the code does not show |
| `docs/research/` | Research notes, such as the visual study behind `DESIGN.md` |

## Related pages

- [Quickstart](quickstart.md)
- [Request pipeline](architecture/request-pipeline.md)
- [Deployment and releases](operations/deployment.md)
- [DofusDB game data refresh](data/dofusdb-refresh.md)
- [Torre corrections to DofusDB data](data/torre-corrections.md)
- [Standalone pages](pages/standalone-pages.md)
- [Site settings, index texts and navigation](cms/site-copy.md)
- [Class and dungeon pages](pages/class-and-dungeon-pages.md)
- [Public quest guide page](frontend/guide-page.md)
- [Collections and access](cms/collections.md)
- [Achievement data model](achievements/achievement-data.md)
- [Site header, footer and search](frontend/site-shell-and-search.md)
- [Writing a quest guide](cms/guide-authoring.md)
- [Guide body blocks](cms/blocks.md)
- [Design system components](frontend/design-system-components.md)
- [Performance budgets](testing/performance-budgets.md)
