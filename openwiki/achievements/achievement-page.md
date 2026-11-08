---
type: feature
title: Achievement page
description: How the shared /<slug> route renders a published achievement page, what it loads and caches, how the view model builds the header, quest cards, metalogro column and breadcrumb, and how a guide shows its achievement in its breadcrumb and "Misión N de M".
tags: [achievements, nextjs, routing, caching, breadcrumb, frontend]
verified:
  - by: openwiki/0.4.3
    at: 2026-11-08T11:00:21.339Z
sources:
  - id: openwiki-source-acca2e871fe004f24b362dc3
    resource: repo://src/app/(frontend)/%5Bslug%5D/achievement-data.ts
  - id: openwiki-source-6a9f262dafd7786ce50a74e8
    resource: repo://src/app/(frontend)/%5Bslug%5D/AchievementView.tsx
  - id: openwiki-source-cb49e3c4d1015b8673e71275
    resource: repo://src/app/(frontend)/%5Bslug%5D/page.tsx
  - id: openwiki-source-4f2e53306895c158accd92ec
    resource: repo://src/collections/revalidate-guides.ts
  - id: openwiki-source-2a67994ef743619f0decb35a
    resource: repo://src/components/site/Breadcrumb.tsx
  - id: openwiki-source-014c13a445f559e314d219dd
    resource: repo://src/lib/achievements/cache.ts
  - id: openwiki-source-6c5141b803eb1f150eb8e36d
    resource: repo://src/lib/achievements/page.ts
  - id: openwiki-source-e73131df56ebe53f18c77bc5
    resource: repo://src/lib/achievements/queries.ts
  - id: openwiki-source-1f65cb688406ef2eb6ebe494
    resource: repo://tests/e2e/logro.spec.ts
generated: { by: "claude-code", at: "2026-11-08T11:00:21.339Z" }
---

# Achievement page

An achievement page (`achievement-pages`, see [Achievement data model](achievement-data.md)) renders at `/<slug>`, the same route as quest guides. Slugs never collide across the two collections, so the route tries one and then the other.

## Route and metadata

`src/app/(frontend)/[slug]/page.tsx`:

1. `loadGuidePage(slug)`: if a guide exists, render the guide (see [Guide page](../frontend/guide-page.md)).
2. Otherwise `loadAchievementPage(slug)`: if found, render `AchievementView`.
3. Neither: `notFound()`.

`generateMetadata` follows the same order. For an achievement the title and description come from `achievementPageStrings.seo` with the page name and its number of quests; the canonical URL is `/<slug>` and Open Graph uses type `article`. A preview sets `robots: { index: false, follow: false }`.

An achievement page in state `preparing` has no public page: the query filters it out for visitors, so the route returns 404.

## Loading and caching

`loadAchievementPage` (`src/app/(frontend)/[slug]/achievement-data.ts`) is wrapped in React `cache`, so the page and its metadata share one read per request.

- **Visitors** read through `unstable_cache` with the `achievement-pages` tag and a 600-second `revalidate` (`src/lib/achievements/cache.ts`).
- **Preview**: with Next's draft mode on and a valid panel session, it reads the latest draft without the cache, including pages in `preparing`. Draft mode without a session falls back to the published read.

`unstable_cache` stores JSON, so the quest givers travel as an array of pairs and become a `Map` again after the read. The loader adds `SITE_URL` (`src/lib/site/origin.ts`, from `NEXT_PUBLIC_SITE_URL`) for the absolute URLs of the JSON-LD.

`readAchievementPage` (`src/lib/achievements/queries.ts`) always runs with the viewer's permissions (`overrideAccess: false`):

1. Return null for a reserved or malformed slug (`isGuideSlug`).
2. Find the page by slug at depth 2. A visitor gets `draft: false` and `state: published` only.
3. Load the pages of the same metalogro, sorted by `order` then `name`, with only the achievement icon and quest `levelMin` populated.
4. Load the published guides of the page's quests and of their prerequisites, with each guide's "Necesitarás" items.
5. Load the NPCs that start each quest, keyed by DofusDB ID.

### Revalidation

`src/collections/revalidate-guides.ts` expires both tags from both sides, because each page type shows the other:

- Saves and deletes of `quest-guides` and `media` expire `guide-pages` and `achievement-pages`. A published guide makes its quest card a link, and a media file is an icon or a render on both.
- Saves and deletes of `achievement-pages` and `achievement-groups` expire both tags too: a guide shows its achievement page in its breadcrumb and "Misión 2 de 3".

Outside a Next request (scripts, the import, tests) `revalidateTag` throws a "static generation store missing" invariant; `expire` ignores that one error and rethrows any other. Writes made outside the server show within the 10-minute `revalidate`.

## The view model

`achievementPageView` (`src/lib/achievements/page.ts`) is pure code: it turns the loaded documents into what the components render and never invents a missing value.

- **Header meta**: "N misiones", the level range of the quest rows when known (a row's level is the lowest `levelMin` of its alternatives), and the points when positive.
- **Facts** (the guide's three columns, reused from `QuestFacts`):
  - Prerequisites: quests required by the page's quests that are not part of the achievement, deduplicated, each linked to its published guide when there is one.
  - Needs in total: the items and the quantified notes ("1 x Combate (solo).") of the published guides of single-quest rows, summed. A note without a quantity is a comment on that guide and is left out. Rows with alternatives are skipped, because nobody knows which class quest you will do.
  - Rewards: experience, kamas and items from the page's `rewards`.
- **Quest cards**: one per quest row, with its position, level, title and the NPC render of its giver. The card links to the guide only when the row has one quest and that quest has a published guide.
- **Metalogro column**: the metalogro's pages in order. The current one is marked; one that is not `published` is shown dimmed, without a link, and keeps its place in reading order. Each shows its icon, number of quests and level range.
- **Previous and next**: the neighbours of the current page in that list.
- **Counts for**: the game achievements that require this one, from the DofusDB achievement's `countsFor`.

## Components

`AchievementView` (`src/app/(frontend)/[slug]/AchievementView.tsx`) lays out the breadcrumb, `AchievementHeader`, Torre's `intro`, `AchievementQuests`, his `outro`, and `AchievementNav`; beside it (below on phones) `AchievementGroupList`. The parts live in `src/components/achievement/AchievementParts.tsx` and their styles in `achievement.css`. The page's section color is `--color-sec-logros`.

The page's only client island is the guide's `PageEnhancements`, here for the rewards bag; `LivePreviewRefresh` renders only in preview.

## Breadcrumb

`Breadcrumb` (`src/components/site/Breadcrumb.tsx`) lists only the parents, because the `h1` below names the page; the current page goes only in the `BreadcrumbList` JSON-LD, with absolute URLs. On phones it shows only the direct parent, as a back link. The JSON-LD inside the `<script>` has `<` escaped so no name can close the tag.

An achievement page's parents are the index (`/metalogros`) and its metalogro, which is a panel of the index (`/metalogros#<slug>`).

### A guide's achievement

The guide loader calls `findGuideAchievement(payload, questId)` alongside its other reads. It finds the first published achievement page (by `order`, then `name`) whose quest rows contain the guide's quest, and returns the page, its metalogro, the row position and the number of rows.

- `guideBreadcrumb` builds "Metalogros / <metalogro> / <achievement page>" for the guide. If the achievement page is in `preparing` it has no public page, so the breadcrumb stops at the metalogro.
- The position and total feed the guide header's "Misión 2 de 3".

## Tests

- `tests/unit/achievement-page.test.ts`: the view model.
- `tests/unit/achievement-components.test.tsx`: the parts.
- `tests/integration/achievement-page-queries.test.ts`: the queries with real access rules.
- `tests/e2e/logro.spec.ts`: breadcrumb, header and columns; quest cards linking only published guides; the dimmed `preparing` sibling; 404 for a `preparing` page; the phone breadcrumb; axe (WCAG 2.2 AA) in both modes.
