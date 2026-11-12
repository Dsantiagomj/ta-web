---
type: system
title: Public quest guide page
description: How a published quest guide renders at /<slug> (guide page v5) - loading and caching the guide, its quest, the quest giver, the next quest and its achievement page, turning the stored body into the breadcrumb, header, introduction, steps, closing and next quest card, draft preview from the panel, and revalidation on save.
tags: [frontend, guides, routing, caching, preview]
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
generated: { by: "claude-code", at: "2026-11-12T11:00:44.802Z" }
verified:
  - by: openwiki/0.4.3
    at: 2026-11-12T11:00:44.802Z
---

# Public quest guide page

Quest guides are served at the site root, `/<slug>`, the same flat Spanish slugs as the old torrentearcano.com (`/seis-pies-bajo-tierra`). The route is `src/app/(frontend)/[slug]/page.tsx`. It is a server component that loads one guide and renders the v5 layout from DESIGN.md (Quest guide): a single centred reading column of 880 px with the breadcrumb to the guide's achievement, the quest header (the NPC who gives the quest, title, subtitle, and the "Prerrequisitos", "Necesitarás" and "Recompensas" columns, with the reward items in the rewards bag), the introduction, the steps separated by a line, the closing and the next quest card. What the guide does not store is not rendered. When no guide has the slug, the same route renders an achievement page instead, and then a Dofus guide (see [Achievement page](../achievements/achievement-page.md) and [Dofus guide page](../dofus-guides/dofus-guide-page.md)).

```
GET /<slug>
  └─ page.tsx (server)            generateMetadata + SlugPage → QuestGuideView
       └─ loadGuidePage(slug)      [slug]/data.ts, React cache: once per request
            ├─ draft mode + panel session → readGuide(slug, { preview })   no cache
            └─ otherwise → readPublishedGuide(slug)   unstable_cache, tag guide-pages
                 findGuideBySlug         depth 2, overrideAccess false
                 then, in parallel:
                 findPublishedGuideLinks prerequisites that have a published guide
                 findQuestGiver          npcs by DofusDB ID, renders populated
                 findNextQuest           next quest of the achievement + its guide
                 findGuideAchievement    its achievement page: breadcrumb, "Misión 2 de 3"
       ├─ guideBreadcrumb / questHeaderProps / guideContent / guideStart /
       │  nextQuestCard / guideSeo                       src/lib/guides/, src/lib/achievements/ (pure)
       └─ Breadcrumb, QuestHeader, GuideBody, GuideSteps, NextQuestCard, PageEnhancements
```

## Loading the guide

`src/lib/guides/queries.ts` holds the guide's Payload local API queries. All of them pass `overrideAccess: false`, so they run with the viewer's permissions and an anonymous visitor only ever receives published guides (see [Collections and access](../cms/collections.md#quest-guides-editorial-guides-with-drafts)).

- `findGuideBySlug(payload, slug, { preview })` returns `null` for anything that is not a guide slug (`isGuideSlug`: the slug format and not a reserved route), and otherwise finds the guide at depth 2: the guide, its quest, and what hangs off the quest (items and prerequisite quests). With `preview` it asks for the latest draft with that user; without it, `draft: false`.
- `findPublishedGuideLinks(payload, questIds)` returns `{ questId, slug }` for the published guides of the prerequisite quests, so prerequisites with a guide become links.
- `findQuestGiver(payload, npcDofusId)` finds the NPC by its DofusDB ID at depth 1, so both renders come populated. The ID is the `npcId` of the quest's first start position that has one (`questGiverId`).
- `findNextQuest(payload, achievement)` finds the quest at the next position of the same DofusDB achievement (the order stored on each quest) and its published guide at depth 1, so the guide's images come populated. Without an achievement or a next quest it returns `null`.
- `findGuideAchievement(payload, questId)` (`src/lib/achievements/queries.ts`) finds the published achievement page that lists the guide's quest, with its metalogro, the quest's row and the number of rows. See [Achievement page](../achievements/achievement-page.md#a-guides-achievement).

`readGuide` runs the last four in parallel once the guide is found.

`loadGuidePage(slug)` in `[slug]/data.ts` is wrapped in React's `cache`, so the page and `generateMetadata` share one load per request. When Next's draft mode is on and `payload.auth` finds a panel user in the request headers, it reads the latest draft without any cache and marks the result `preview: true`. Otherwise, even with the draft mode cookie set, it reads the published guide through `unstable_cache`.

An unknown slug, an unpublished guide and a malformed slug all end in `notFound()`. Next renders the Spanish 404 (`not-found.tsx`) and adds `noindex`. When no guide matches, the route tries an achievement page and then a Dofus guide before giving up. Top-level routes such as `/sistema`, `/admin`, `/vista-previa`, `/metalogros` and `/guias-dofus` win over `/[slug]`; the reserved slug list in `src/lib/guides/slug.ts` keeps a guide from taking one of them (see [Collections and access](../cms/collections.md#quest-guides-editorial-guides-with-drafts)).

## Caching and revalidation

The frontend layout reads the mode cookie, so every guide page is rendered per request. What is cached is the guide data read from Postgres: `readPublishedGuide` is an `unstable_cache` entry tagged `guide-pages` (`GUIDE_PAGES_TAG`), with `revalidate` set to `GUIDE_PAGES_REVALIDATE`, 600 seconds.

- **Saves from the panel.** `quest-guides` and `media` run their `afterChange` and `afterDelete` hooks, which call `revalidateTag('guide-pages', { expire: 0 })` and the same for `achievement-pages` and `dofus-guides`, since achievement pages and Dofus guides link the published guides. `achievement-pages` and `achievement-groups` expire all three too, because a guide shows its achievement page in its breadcrumb and "Misión 2 de 3". A saved or deleted Dofus guide expires `guide-pages` as well as its own tag: every page's menu lists the published Dofus. The next visit reads what is published. Drafts revalidate too: it is cheap and covers unpublishing. Media is included because guides render each image's alt text and size.
- **Writes outside the server.** The Squarespace import, `pnpm data:quests` and tests run outside a Next request, where `revalidateTag` throws a "static generation store missing" invariant. The hooks ignore that error and rethrow any other. Such writes show up after at most ten minutes.
- **Tests.** The E2E app server runs `scripts/clear-data-cache.ts` before `pnpm start`, so a cached guide from an earlier run never hides a freshly seeded database.

## From stored guide to page

`src/lib/guides/page.ts` is pure code with no Payload or React: it turns the depth-2 guide into the props the components need. It never invents data.

### Header

`questHeaderProps(guide, links, giver, place)` builds the `QuestHeader` data:

- **Subtitle.** The quest's `zone`, the level (`guideLevel`: the linked quest's `levelMin`) and "Misión k de n". `place` is the quest's row and the row count in its achievement page, counted as Torre counts them (a class quest with alternatives is one); without an achievement page, the DofusDB position and total stored on the quest. The subtitle has no link: the achievement page is in the breadcrumb above the title.
- **Quest giver.** Only when the NPC has a right-facing render. The left-facing render is used on phones when it exists. The name is the guide's `summary.startNpc`, else the NPC's name; the start coordinates come from `startX` and `startY`.
- **Prerrequisitos.** One row per line of `summary.prerequisites`, without the final full stop. A line that matches a prerequisite quest's name (ignoring accents, case and punctuation) gets the quest icon, and a link to that quest's guide when one is published.
- **Necesitarás.** The `summary.needs.items` list without quest items (supertype 14), plus one row per line of the notes. A note such as "1 x Combate (solo)" shows the quantity apart in bold, and a note about a fight gets the combat icon.
- **Recompensas.** From the linked quest: the XP as a range from `experienceMin` to `experience` when the minimum is lower, otherwise one figure; kamas; and the reward items in Torre's order, the reverse of DofusDB's, which the header shows in the rewards bag. With no DofusDB rewards, the lines Torre wrote in `summary.rewards`.
- **Item and monster icons.** `gameItem` uses the item's or monster's imported `image` from Media when the refresh has imported it; otherwise the well stays empty.

### Breadcrumb

`guideBreadcrumb(achievement, guide, SITE_URL)` (`src/lib/achievements/page.ts`) builds "Metalogros / <metalogro> / <achievement page>" from `findGuideAchievement`, stopping at the metalogro when the achievement page is still in preparation. A guide whose quest is in no achievement page has no breadcrumb. The guide itself goes only in the `BreadcrumbList` JSON-LD.

### Body

`guideContent(guide)` splits `body` into `{ intro, steps, outro }`:

- Blocks before the first step are the introduction; blocks after the last step are the closing. A loose block between two steps joins the end of the previous step, so the reading order never changes. A guide without step blocks is all introduction: the page never splits prose into steps itself.
- Each step keeps its own blocks, including fight blocks with their monsters' images, and its coordinates only when both X and Y are set. Steps have no title (see [Guide body blocks](../cms/blocks.md#step)).
- An image without a file is skipped; images with Payload's generated sizes get `srcset` (see [Media storage](../media/storage.md)). A video without a title gets one built from the guide's title (`guideStrings.page.videoTitle`).
- The first image in document order, whether an image block or an image uploaded inside a text or callout, inside a step or not, gets `priority`: no lazy loading and `fetchPriority="high"`, because it is the LCP candidate. Only that one.

The page renders the introduction and closing with `GuideBody`, and the steps with `GuideSteps`, which gives each the anchor `paso-N` and separates them with a line; they carry no visible number. Rich text becomes server-rendered HTML with coordinate chips, a warning callout renders as `Callout` and a tip as Torre's tips. See [Design system components](design-system-components.md).

### Step pin and the start sentence

`src/lib/guides/step-nav.ts` holds the step helpers:

- `stepAnchor(index)` is `paso-<n>`, the number a screen reader says from the `<ol>`.
- `stepPin(step)` returns the step's coordinates only when its text does not already name them; `GuideSteps` then shows them as a chip at the start of the step, so coordinates entered in the panel are never lost.
- `startSentenceNpc(step, start)` covers a step 1 left without text: the importer moves "Habla con Hupe Esse [7,-19] para empezar la misión." into the summary, so when step 1 has no prose and its coordinates are the start's, the page writes that sentence again (with the NPC from `guideStart(guide)`, the summary's start NPC and coordinates) instead of showing a lone pin.

The "Pasos" side list and its current-step tracking were removed with the v5 single column.

### Next quest card

`nextQuestCard(quest, guide)` builds the card at the end of the guide from `findNextQuest`, only when the next quest has a published guide. It carries the guide's title and link, the quest's minimum level, the first start position with an NPC name and its coordinates, and the first image of the next guide's body in reading order as art (an image block or an image inside a text or callout, inside steps too). What is missing is left out.

### Metadata

`generateMetadata` uses `guideSeo`: the guide's `seo.metaTitle` and `seo.metaDescription`, or, when empty, the same templates the autofill uses (title, level and XP). It sets the canonical URL to `/<slug>` and Open Graph (`article`, site name, `es_ES`). A preview adds `robots: noindex, nofollow`.

## Draft preview

Editors preview a draft from the panel without a secret in the URL; the Payload session protects it.

1. The collection's `preview` button and `livePreview` iframe point at `guidePreviewUrl(slug, origin)`: `/vista-previa?slug=…`, or nothing until the guide has a valid, non-reserved slug. The origin is `NEXT_PUBLIC_SITE_URL` when set, because behind Railway's proxy the request does not know the public domain and the live preview posts messages to that exact origin.
2. `GET /vista-previa` checks the slug (400 otherwise), authenticates the request with Payload (401 without a panel user) and finds the guide as that user, drafts included, or else the achievement page, or else the Dofus guide with that slug (404 if none). Only then does it enable Next's draft mode and redirect to `/<slug>`, never to any other address. Achievement pages and Dofus guides use the same preview URL. Error answers are `text/plain` with `Cache-Control: no-store`.
3. In draft mode with a session, the page shows the latest draft, a `PreviewBar` with a note and an exit button, and `LivePreviewRefresh`. That client component renders Payload's `RefreshRouteOnSave` with the browser's origin, so each save in the panel re-renders the page on the server. Both only render in draft mode, so their JavaScript never reaches visitors.
4. The exit button posts to `/vista-previa/salir`, which disables draft mode and answers `303` back to `/<slug>` (or `/` for a bad slug).

Without a panel session the draft mode cookie does nothing: the page shows what is published.

## Tests

- `tests/unit/guide-page-data.test.ts` covers `guideLevel`, `questHeaderProps` (subtitle parts with "Misión k de n" from the achievement page or DofusDB, the giver's renders and name, prerequisite rows and links, needs items and notes, the XP range, Torre's reward lines as a fallback), `questGiverId`, `prerequisiteQuestIds`, `guideContent` with and without steps (order, loose blocks, fight blocks, image priority in document order, skipped images, video titles, `srcset`), `nextQuestCard` and `guideSeo`.
- `tests/unit/guide-step-nav.test.ts` covers stable anchors and the pin rule.
- `tests/unit/guide-slug.test.ts`, `tests/unit/guide-preview.test.ts` and `tests/unit/revalidate-guides.test.ts` cover reserved slugs, preview URLs and origins, and the revalidation hooks.
- `tests/integration/guide-page-queries.test.ts` runs the queries against Postgres: the published guide with its quest and rewards populated; no draft-only guide for a visitor; no result for unknown, malformed or reserved slugs; the latest draft in preview with a user and none without; links only to published prerequisite guides; the NPC with its renders; the next quest and its published guide.
- `tests/e2e/guia.spec.ts` runs against the seeded guides (`pnpm seed:e2e`, `tests/e2e/seed/guides.ts`): the header with NPC, subtitle and columns; Prerrequisitos above Necesitarás, its items in columns and the note below; the left-facing NPC and the one-crumb breadcrumb on mobile; introduction, steps without numbers, titles or checkboxes, and closing; the fight block; the next quest card only when its guide is published; one 880 px reading column with the steps separated by a line; the rewards bag with the keyboard (Enter opens, Esc and tabbing out close), open in the page on mobile and visible without JavaScript; a guide without steps read as prose; SEO, canonical and Open Graph; 404 with `noindex`; site routes winning over `/[slug]`; the fullscreen viewer; the video facade at 390 px; copying a coordinates chip; axe WCAG 2.2 AA in Arcano dark and light with the bag open and closed; and preview (inactive without a session, the draft with `noindex` and an exit button with one, no preview JavaScript for visitors).
- Lighthouse CI measures `/seis-pies-bajo-tierra` next to the home page, an achievement page and `/metalogros`. See [Performance budgets](../testing/performance-budgets.md).

## Related pages

- [Writing a quest guide](../cms/guide-authoring.md)
- [Guide body blocks](../cms/blocks.md)
- [Collections and access](../cms/collections.md)
- [Design system components](design-system-components.md)
- [Achievement page](../achievements/achievement-page.md)
- [DofusDB game data refresh](../data/dofusdb-refresh.md)
- [Request pipeline](../architecture/request-pipeline.md)
- [Media storage](../media/storage.md)
