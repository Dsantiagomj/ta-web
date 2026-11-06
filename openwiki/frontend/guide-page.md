---
type: system
title: Public quest guide page
description: How a published quest guide renders at /<slug> (guide page v4) - loading and caching the guide, its quest and the quest giver, turning the stored body into the header, introduction, numbered steps and closing, the "Pasos" side list, draft preview from the panel, and revalidation on save.
tags: [frontend, guides, routing, caching, preview]
verified:
  - by: openwiki/0.4.3
    at: 2026-11-06T15:25:11.354Z
sources:
  - id: openwiki-source-5070cf9485858a3914a90ea6
    resource: repo://src/app/(frontend)/%5Bslug%5D/data.ts
  - id: openwiki-source-57a1bcccb8c49e3210958ed7
    resource: repo://src/app/(frontend)/%5Bslug%5D/LivePreviewRefresh.tsx
  - id: openwiki-source-cb49e3c4d1015b8673e71275
    resource: repo://src/app/(frontend)/%5Bslug%5D/page.tsx
  - id: openwiki-source-00ef910a3b02718360ab3a7d
    resource: repo://src/app/(frontend)/%5Bslug%5D/PreviewBar.tsx
  - id: openwiki-source-78958b9431f22ab5b15fe28e
    resource: repo://src/app/(frontend)/vista-previa/route.ts
  - id: openwiki-source-f92b640ca9942c667019d58b
    resource: repo://src/app/(frontend)/vista-previa/salir/route.ts
  - id: openwiki-source-4f2e53306895c158accd92ec
    resource: repo://src/collections/revalidate-guides.ts
  - id: openwiki-source-5439148ebc92dee697c9d9aa
    resource: repo://src/lib/guides/cache.ts
  - id: openwiki-source-09ec39f59a9916ea0a2bf2d6
    resource: repo://src/lib/guides/page.ts
  - id: openwiki-source-8ed39edff3cde5d6dec00a2b
    resource: repo://src/lib/guides/queries.ts
  - id: openwiki-source-7c8d27e389afcc66bc579a2f
    resource: repo://src/lib/guides/step-nav.ts
  - id: openwiki-source-15d81576125ffd9d62dc8605
    resource: repo://tests/e2e/app-server.ts
  - id: openwiki-source-870648cc3288ecf5c87bb3a4
    resource: repo://tests/e2e/guia.spec.ts
  - id: openwiki-source-c1a763f1b73857b38a438dd8
    resource: repo://tests/integration/guide-page-queries.test.ts
  - id: openwiki-source-d0bb03e37a11a0837dbc448a
    resource: repo://tests/unit/guide-page-data.test.ts
  - id: openwiki-source-aa555d49f397d3197f9524fc
    resource: repo://tests/unit/guide-step-nav.test.ts
  - id: openwiki-source-bf9fb1ff7357ca38b1ad1283
    resource: repo://tests/unit/revalidate-guides.test.ts
generated: { by: "claude-code", at: "2026-11-06T15:25:11.354Z" }
---

# Public quest guide page

Quest guides are served at the site root, `/<slug>`, the same flat Spanish slugs as the old torrentearcano.com (`/seis-pies-bajo-tierra`). The route is `src/app/(frontend)/[slug]/page.tsx`. It is a server component that loads one guide and renders the v4 layout from DESIGN.md (Quest guide): a flat page with the quest header (the NPC who gives the quest, title, subtitle, and the "Prerrequisitos", "Necesitarás" and "Recompensas" columns), the introduction, the numbered steps and the closing, with the "Pasos" side list next to it from 1152 px. What the guide does not store is not rendered.

```
GET /<slug>
  └─ page.tsx (server)            generateMetadata + QuestGuidePage
       └─ loadGuidePage(slug)      [slug]/data.ts, React cache: once per request
            ├─ draft mode + panel session → readGuide(slug, { preview })   no cache
            └─ otherwise → readPublishedGuide(slug)   unstable_cache, tag guide-pages
                 findGuideBySlug         depth 2, overrideAccess false
                 findPublishedGuideLinks prerequisites that have a published guide
                 findQuestGiver          npcs by DofusDB ID, renders populated
       ├─ questHeaderProps / guideContent / stepNav / guideSeo   src/lib/guides/ (pure)
       └─ QuestHeader, GuideBody, GuideSteps, StepTracker, PageEnhancements
```

## Loading the guide

`src/lib/guides/queries.ts` holds the three Payload local API queries. All of them pass `overrideAccess: false`, so they run with the viewer's permissions and an anonymous visitor only ever receives published guides (see [Collections and access](../cms/collections.md#quest-guides-editorial-guides-with-drafts)).

- `findGuideBySlug(payload, slug, { preview })` returns `null` for anything that is not a guide slug (`isGuideSlug`: the slug format and not a reserved route), and otherwise finds the guide at depth 2: the guide, its quest, and what hangs off the quest (items and prerequisite quests). With `preview` it asks for the latest draft with that user; without it, `draft: false`.
- `findPublishedGuideLinks(payload, questIds)` returns `{ questId, slug }` for the published guides of the prerequisite quests, so prerequisites with a guide become links.
- `findQuestGiver(payload, npcDofusId)` finds the NPC by its DofusDB ID at depth 1, so both renders come populated. The ID is the `npcId` of the quest's first start position that has one (`questGiverId`).

`loadGuidePage(slug)` in `[slug]/data.ts` is wrapped in React's `cache`, so the page and `generateMetadata` share one load per request. When Next's draft mode is on and `payload.auth` finds a panel user in the request headers, it reads the latest draft without any cache and marks the result `preview: true`. Otherwise, even with the draft mode cookie set, it reads the published guide through `unstable_cache`.

An unknown slug, an unpublished guide and a malformed slug all end in `notFound()`. Next renders the Spanish 404 (`not-found.tsx`) and adds `noindex`. Top-level routes such as `/sistema`, `/admin` and `/vista-previa` win over `/[slug]`; the reserved slug list in `src/lib/guides/slug.ts` keeps a guide from taking one of them (see [Collections and access](../cms/collections.md#quest-guides-editorial-guides-with-drafts)).

## Caching and revalidation

The frontend layout reads the mode cookie, so every guide page is rendered per request. What is cached is the guide data read from Postgres: `readPublishedGuide` is an `unstable_cache` entry tagged `guide-pages` (`GUIDE_PAGES_TAG`), with `revalidate` set to `GUIDE_PAGES_REVALIDATE`, 600 seconds.

- **Saves from the panel.** `quest-guides` and `media` run `revalidateGuidePages` in their `afterChange` and `afterDelete` hooks, which calls `revalidateTag('guide-pages', { expire: 0 })`. The next visit reads what is published. Drafts revalidate too: it is cheap and covers unpublishing. Media is included because guides render each image's alt text and size.
- **Writes outside the server.** The Squarespace import, `pnpm data:quests` and tests run outside a Next request, where `revalidateTag` throws a "static generation store missing" invariant. `revalidateGuidePages` ignores that error and rethrows any other. Such writes show up after at most ten minutes.
- **Tests.** The E2E app server runs `scripts/clear-data-cache.ts` before `pnpm start`, so a cached guide from an earlier run never hides a freshly seeded database.

## From stored guide to page

`src/lib/guides/page.ts` is pure code with no Payload or React: it turns the depth-2 guide into the props the components need. It never invents data.

### Header

`questHeaderProps(guide, links, giver)` builds the `QuestHeader` data:

- **Subtitle.** The quest's `zone`, the level (`guideLevel`: the linked quest's `levelMin`) and, when the quest has an achievement with a name, slug and position, "Misión k del logro …" linking to the achievement page. Achievement pages still live on torrentearcano.com with the same slug, so the link is absolute (`ACHIEVEMENT_PAGES_ORIGIN`) until the app has its own.
- **Quest giver.** Only when the NPC has a right-facing render. The left-facing render is used on phones when it exists. The name is the guide's `summary.startNpc`, else the NPC's name; the start coordinates come from `startX` and `startY`.
- **Prerrequisitos.** One row per line of `summary.prerequisites`, without the final full stop. A line that matches a prerequisite quest's name (ignoring accents, case and punctuation) gets the quest icon, and a link to that quest's guide when one is published.
- **Necesitarás.** The `summary.needs.items` list without quest items (supertype 14), plus one row per line of the notes. A note such as "1 x Combate (solo)" shows the quantity apart in bold, and a note about a fight gets the combat icon.
- **Recompensas.** From the linked quest: the XP as a range from `experienceMin` to `experience` when the minimum is lower, otherwise one figure; kamas; and the reward items in Torre's order, the reverse of DofusDB's. With no DofusDB rewards, the lines Torre wrote in `summary.rewards`.

### Body

`guideContent(guide)` splits `body` into `{ intro, steps, outro }`:

- Blocks before the first step are the introduction; blocks after the last step are the closing. A loose block between two steps joins the end of the previous step, so the reading order never changes. A guide without step blocks is all introduction: the page never splits prose into steps itself.
- Each step keeps its own blocks, its coordinates only when both X and Y are set, and its title, which the page does not show (the title is panel-only, see [Guide body blocks](../cms/blocks.md#step)).
- An image without a file is skipped; images with Payload's generated sizes get `srcset` (see [Media storage](../media/storage.md)). A video without a title gets one built from the guide's title (`guideStrings.page.videoTitle`).
- The first image in document order, whether an image block or an image uploaded inside a text or callout, inside a step or not, gets `priority`: no lazy loading and `fetchPriority="high"`, because it is the LCP candidate. Only that one.

The page renders the introduction and closing with `GuideBody`, and the steps with `GuideSteps`, which numbers them and gives each the anchor `paso-N`. Rich text becomes server-rendered HTML with coordinate chips, a warning callout renders as `Callout` and a tip as Torre's tips. See [Design system components](design-system-components.md).

### Step pin and the "Pasos" side list

`src/lib/guides/step-nav.ts` builds the side list from the steps:

- `stepAnchor(index)` is `paso-<n>`, the same number the reader sees.
- `stepNav(steps)` gives one entry per step. The label is the first bold text in the step's prose (callouts and images are not read): an NPC or a place, the way Torre marks them, with any coordinates and the "en"/"a", punctuation and brackets around them removed. A bold run with no word left is skipped. Without a usable bold, the label is "Paso N". The coordinates are the step's own X and Y or, without them, the first `[x,y]` in its text.
- `stepPin(step)` returns the step's coordinates only when its text does not already name them; `GuideSteps` then shows them as a chip at the start of the step, so coordinates entered in the panel are never lost.

`StepTracker` renders the list as links. `PageEnhancements`, the page's only client island, marks the step being read (see [Design system components](design-system-components.md#the-client-island-pageenhancements)).

### Metadata

`generateMetadata` uses `guideSeo`: the guide's `seo.metaTitle` and `seo.metaDescription`, or, when empty, the same templates the autofill uses (title, level and XP). It sets the canonical URL to `/<slug>` and Open Graph (`article`, site name, `es_ES`). A preview adds `robots: noindex, nofollow`.

## Draft preview

Editors preview a draft from the panel without a secret in the URL; the Payload session protects it.

1. The collection's `preview` button and `livePreview` iframe point at `guidePreviewUrl(slug, origin)`: `/vista-previa?slug=…`, or nothing until the guide has a valid, non-reserved slug. The origin is `NEXT_PUBLIC_SITE_URL` when set, because behind Railway's proxy the request does not know the public domain and the live preview posts messages to that exact origin.
2. `GET /vista-previa` checks the slug (400 otherwise), authenticates the request with Payload (401 without a panel user) and finds the guide as that user, drafts included (404 if missing). Only then does it enable Next's draft mode and redirect to `/<slug>`, never to any other address. Error answers are `text/plain` with `Cache-Control: no-store`.
3. In draft mode with a session, the page shows the latest draft, a `PreviewBar` with a note and an exit button, and `LivePreviewRefresh`. That client component renders Payload's `RefreshRouteOnSave` with the browser's origin, so each save in the panel re-renders the page on the server. Both only render in draft mode, so their JavaScript never reaches visitors.
4. The exit button posts to `/vista-previa/salir`, which disables draft mode and answers `303` back to `/<slug>` (or `/` for a bad slug).

Without a panel session the draft mode cookie does nothing: the page shows what is published.

## Tests

- `tests/unit/guide-page-data.test.ts` covers `guideLevel`, `questHeaderProps` (subtitle parts, the giver's renders and name, prerequisite rows and links, needs items and notes, the XP range, Torre's reward lines as a fallback), `questGiverId`, `prerequisiteQuestIds`, `guideContent` with and without steps (order, loose blocks, image priority in document order, skipped images, video titles, `srcset`) and `guideSeo`.
- `tests/unit/guide-step-nav.test.ts` covers labels from the first bold text, the "Paso N" fallback, coordinate and punctuation stripping, ignoring callouts and images, coordinates from the step or its text, stable anchors, and the pin rule.
- `tests/unit/guide-slug.test.ts`, `tests/unit/guide-preview.test.ts` and `tests/unit/revalidate-guides.test.ts` cover reserved slugs, preview URLs and origins, and the revalidation hooks.
- `tests/integration/guide-page-queries.test.ts` runs the queries against Postgres: the published guide with its quest and rewards populated; no draft-only guide for a visitor; no result for unknown, malformed or reserved slugs; the latest draft in preview with a user and none without; links only to published prerequisite guides; the NPC with its renders.
- `tests/e2e/guia.spec.ts` runs against the seeded guides (`pnpm seed:e2e`, `tests/e2e/seed/guides.ts`): the header with NPC, subtitle and columns; the left-facing NPC on mobile; introduction, numbered steps and closing; the side list from 1152 px; a guide without steps read as prose; SEO, canonical and Open Graph; 404 with `noindex`; site routes winning over `/[slug]`; the fullscreen viewer; the video facade at 390 px; copying a coordinates chip; axe WCAG 2.2 AA in Arcano dark and light; and preview (inactive without a session, the draft with `noindex` and an exit button with one, no preview JavaScript for visitors).
- Lighthouse CI measures `/seis-pies-bajo-tierra` next to the home page. See [Performance budgets](../testing/performance-budgets.md).

## Related pages

- [Writing a quest guide](../cms/guide-authoring.md)
- [Guide body blocks](../cms/blocks.md)
- [Collections and access](../cms/collections.md)
- [Design system components](design-system-components.md)
- [DofusDB game data refresh](../data/dofusdb-refresh.md)
- [Request pipeline](../architecture/request-pipeline.md)
- [Media storage](../media/storage.md)
