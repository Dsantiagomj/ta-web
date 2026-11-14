---
type: feature
title: Achievement page
description: How the shared /<slug> route renders a published achievement page, what it loads and caches, how the view model builds the header, quest cards, metalogro column and breadcrumb, and how a guide shows its achievement in its breadcrumb and "Misión N de M".
tags: [achievements, nextjs, routing, caching, breadcrumb, frontend]
sources:
  - id: openwiki-source-acca2e871fe004f24b362dc3
    resource: repo://src/app/(frontend)/%5Bslug%5D/achievement-data.ts
  - id: openwiki-source-6a9f262dafd7786ce50a74e8
    resource: repo://src/app/(frontend)/%5Bslug%5D/AchievementView.tsx
  - id: openwiki-source-cb49e3c4d1015b8673e71275
    resource: repo://src/app/(frontend)/%5Bslug%5D/page.tsx
  - id: openwiki-source-4f2e53306895c158accd92ec
    resource: repo://src/collections/revalidate-guides.ts
  - id: openwiki-source-f22b7bdcf1597ce881ef1073
    resource: repo://src/components/achievement/AchievementParts.tsx
  - id: openwiki-source-2a67994ef743619f0decb35a
    resource: repo://src/components/site/Breadcrumb.tsx
  - id: openwiki-source-014c13a445f559e314d219dd
    resource: repo://src/lib/achievements/cache.ts
  - id: openwiki-source-f09b43593b4e26ac43d24662
    resource: repo://src/lib/achievements/dungeons.ts
  - id: openwiki-source-6c5141b803eb1f150eb8e36d
    resource: repo://src/lib/achievements/page.ts
  - id: openwiki-source-e73131df56ebe53f18c77bc5
    resource: repo://src/lib/achievements/queries.ts
  - id: openwiki-source-af2465572edd8138ad48c4b8
    resource: repo://src/lib/dofus-guides/page.ts
  - id: openwiki-source-1f65cb688406ef2eb6ebe494
    resource: repo://tests/e2e/logro.spec.ts
generated: { by: "claude-code", at: "2026-11-14T11:00:46.827Z" }
verified:
  - by: openwiki/0.4.3
    at: 2026-11-14T11:00:46.827Z
---

# Achievement page

An achievement page (`achievement-pages`, see [Achievement data model](achievement-data.md)) renders at `/<slug>`, the same route as quest guides, Dofus guides and checklists. Slugs never collide across those collections, so the route tries one after another.

## Route and metadata

`src/app/(frontend)/[slug]/page.tsx`:

1. `loadGuidePage(slug)`: if a guide exists, render the guide (see [Guide page](../frontend/guide-page.md)).
2. Otherwise `loadAchievementPage(slug)`: if found, render `AchievementView`.
3. Otherwise `loadDofusGuide(slug)`: if found, render the Dofus guide (see [Dofus guide page](../dofus-guides/dofus-guide-page.md)).
4. Otherwise `loadChecklist(slug)`: if found, render the checklist or redirect to its legacy page (see [Checklist page and index](../checklists/checklist-page.md)).
5. None of them: `notFound()`.

`generateMetadata` follows the same order through `slugSeo`. For an achievement the title and description come from `achievementPageStrings.seo` with the page name and its number of quests; the canonical URL is `/<slug>` and Open Graph uses type `article`. A preview sets `robots: { index: false, follow: false }`.

An achievement page in state `preparing` has no public page: the query filters it out for visitors, so the route returns 404.

## Loading and caching

`loadAchievementPage` (`src/app/(frontend)/[slug]/achievement-data.ts`) is wrapped in React `cache`, so the page and its metadata share one read per request.

- **Visitors** read through `unstable_cache` with the `achievement-pages` tag and a 600-second `revalidate` (`src/lib/achievements/cache.ts`).
- **Preview**: with Next's draft mode on and a valid panel session, it reads the latest draft without the cache, including pages in `preparing`. Draft mode without a session falls back to the published read.

`unstable_cache` stores JSON, so the quest givers, the note items and the dungeon bosses travel as arrays of pairs and become `Map`s again after the read. The loader adds `SITE_URL` (`src/lib/site/origin.ts`, from `NEXT_PUBLIC_SITE_URL`) for the absolute URLs of the JSON-LD.

`readAchievementPage` (`src/lib/achievements/queries.ts`) always runs with the viewer's permissions (`overrideAccess: false`):

1. Return null for a reserved or malformed slug (`isGuideSlug`).
2. Find the page by slug at depth 2. A visitor gets `draft: false` and `state: published` only.
3. Load the pages of the same metalogro, sorted by `order` then `name`, with only the achievement icon and quest `levelMin` populated.
4. Load the published guides of the page's quests and of their prerequisites, with each guide's "Necesitarás" items, notes and dungeon picks.
5. Load the NPCs that start each quest, keyed by DofusDB ID.
6. Read the game items whose exact name a note uses (`readNoteItems`) and the boss image of each dungeon note (`readDungeonBosses`).

### Revalidation

`src/collections/revalidate-guides.ts` expires the tags from every side, because each page type shows the others:

- Saves and deletes of `quest-guides` and `media` expire `guide-pages`, `achievement-pages`, `dofus-guides` and `checklists`. A published guide makes its quest card a link on the achievement page, on the Dofus guide and on the checklist, and a media file is an icon or a render on all of them.
- Saves and deletes of `achievement-pages` and `achievement-groups` expire the same four tags: a guide shows its achievement page in its breadcrumb and "Misión 2 de 3", a Dofus guide lists each achievement's quests, and a checklist links each achievement.

Outside a Next request (scripts, the import, tests) `revalidateTag` throws a "static generation store missing" invariant; `expire` ignores that one error and rethrows any other. Writes made outside the server show within the 10-minute `revalidate`.

## The view model

`achievementPageView` (`src/lib/achievements/page.ts`) is pure code: it turns the loaded documents into what the components render and never invents a missing value.

- **Header meta**: "N misiones", the level range of the quest rows when known (a row's level is the lowest `levelMin` of its alternatives), and the points when positive.
- **Facts** (the guide's fact columns, reused from `QuestFacts`): Prerrequisitos and Recompensas. "Necesitarás" is not a header column on this page; it has its own zone.
  - Prerequisites: quests required by the page's quests that are not part of the achievement, deduplicated, each linked to its published guide when there is one.
  - Rewards: experience, kamas and items from the page's `rewards`.
- **Necesitarás en total** (`achievementNeeds`, below).
- **Quest cards**: one per quest row, built by the exported `questCards`, with its number, level, title and the NPC render of its giver. The card links to the guide only when the row has one quest and that quest has a published guide. The [Dofus guide page](../dofus-guides/dofus-guide-page.md) reuses `questRows`, `questCards` and `cardLevels` for the quests of each achievement it lists.
- **Metalogro list**: the metalogro's pages in order (`group.items`). The current one is marked; one that is not `published` is disabled, without a link. The page does not render this list as a column; it only feeds previous and next.
- **Previous and next**: the neighbours of the current page in that list. A neighbour that is not published shows dimmed with "En preparación" and no link.
- **Counts for**: the game achievements that require this one, from the DofusDB achievement's `countsFor`.

### Necesitarás en total

`achievementNeeds` gathers what the published guides of the single-quest rows ask for. Rows with alternatives are skipped, because nobody knows which class quest you will do. The same function feeds the dungeon report of `pnpm data:quests` (see [DofusDB refresh](../data/dofusdb-refresh.md)), so the page and the report agree.

`totalNeeds` sorts everything into three groups (`AchievementNeeds`):

| Group | What goes in |
|---|---|
| «Objetos» | the items the guides link, summed by item; a quantified note that names one of them ("2 x Dragopavo pelirrojo.") adds to it; a note whose text is the exact name of a game item becomes that item, with its icon |
| «Combates y mazmorras» | combat notes and dungeon notes; a dungeon note carries its boss image when one is known |
| «Otros» | every other note, as Torre wrote it |

Notes with a quantity ("1 x Combate (solo).") are summed by their normalised label; notes without one ("Hechizo Captura de almas.") show once even when several guides repeat them, so nothing Torre wrote is lost. A note with and without a quantity are separate rows. Matching ignores case, accents and extra spaces and happens after every guide is read, so the result does not depend on the order of the guides.

A dungeon note's boss image comes from `chooseDungeonBosses`. If Torre picked a dungeon for that note in a quest guide's summary (`needs.dungeons`, «Mazmorras de las notas», see [Guide authoring](../cms/guide-authoring.md)), the pick wins; `dungeonPicks` joins the picks across guides by note key and drops a note whose guides picked different dungeons. Otherwise `dungeonChooser` (`src/lib/achievements/dungeons.ts`) matches the note to a single dungeon by name, boss or name ending, and gives up when more than one could match. The image is the first boss of that dungeon that has one. A row with no dungeon or no boss image shows the generic dungeon icon.

## Components

`AchievementView` (`src/app/(frontend)/[slug]/AchievementView.tsx`) lays out one centered column: the breadcrumb, `AchievementHeader`, `AchievementNeeds`, Torre's `intro`, `AchievementQuests` (the numbered quest list), his `outro`, `AchievementCountsFor` ("Cuenta para") and `AchievementNav` (previous and next, labelled "Logros de <metalogro>"). There is no side list of the metalogro's pages. The parts live in `src/components/achievement/AchievementParts.tsx` and their styles in `achievement.css`, which the Dofus guide page shares (`logro`, `logro__main`, `logro__prose`). The page's section color is `--color-sec-logros`.

`AchievementNeeds` renders each non-empty group with its title; without any rows there is no zone. Items and combats keep a 44px icon slot, a matched dungeon shows its boss, and «Otros» has no icon. `needsLayout` asks `needsColumns` how to split the lists across up to three columns, giving extra columns to the tallest list. When a list splits, the main element gets `logro--needs-wide` and the zone widens to the site width; otherwise it stays in the reading column.

The intro and outro render through `GuideRichText`, so a «Vídeo» block in Torre's prose shows as the video facade that loads YouTube only on click.

The page's only client island is the guide's `PageEnhancements`, here for the rewards bag; `LivePreviewRefresh` renders only in preview.

## Breadcrumb

`Breadcrumb` (`src/components/site/Breadcrumb.tsx`) lists only the parents, because the `h1` below names the page; the current page goes only in the `BreadcrumbList` JSON-LD, with absolute URLs. On phones it shows only the direct parent, as a back link. The JSON-LD inside the `<script>` has `<` escaped so no name can close the tag.

An achievement page's parents are the index (`/metalogros`) and its metalogro, which is a panel of the index (`/metalogros#<slug>`).

### A guide's achievement

The guide loader calls `findGuideAchievement(payload, questId)` alongside its other reads. It finds the first published achievement page (by `order`, then `name`) whose quest rows contain the guide's quest, and returns the page, its metalogro, the row position and the number of rows.

- `guideBreadcrumb` builds "Metalogros / <metalogro> / <achievement page>" for the guide. If the achievement page is in `preparing` it has no public page, so the breadcrumb stops at the metalogro.
- The position and total feed the guide header's "Misión 2 de 3".

## Tests

- `tests/unit/achievement-page.test.ts`: the view model, including the needs groups.
- `tests/unit/achievement-dungeons.test.ts`: dungeon matching and Torre's picks.
- `tests/unit/achievement-components.test.tsx`: the parts.
- `tests/integration/achievement-page-queries.test.ts`: the queries with real access rules.
- `tests/e2e/logro.spec.ts`: breadcrumb and header with Prerrequisitos and Recompensas only; the «Necesitarás en total» zone with its three groups and columns; quest cards linking only published guides; one centered column with no metalogro side list, "Cuenta para" and the previous/next nav; Torre's prose with the video facade; a hand-picked dungeon showing its boss; 404 for a `preparing` page; the phone breadcrumb; axe (WCAG 2.2 AA) in both modes.
