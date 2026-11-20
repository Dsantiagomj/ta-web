---
type: feature
title: Achievement page
description: How the shared /<slug> route renders a published achievement page, what it loads and caches, how the view model builds the header, the side sheet with «Necesitarás en total», the quest list and breadcrumb, and how a guide shows its achievement in its breadcrumb and "Misión N de M".
tags: [achievements, nextjs, routing, caching, breadcrumb, frontend]
sources:
  - id: openwiki-source-acca2e871fe004f24b362dc3
    resource: repo://src/app/(frontend)/%5Bslug%5D/achievement-data.ts
  - id: openwiki-source-6a9f262dafd7786ce50a74e8
    resource: repo://src/app/(frontend)/%5Bslug%5D/AchievementView.tsx
  - id: openwiki-source-cb49e3c4d1015b8673e71275
    resource: repo://src/app/(frontend)/%5Bslug%5D/page.tsx
  - id: openwiki-source-14ca87abed0f0ffc69067570
    resource: repo://src/app/(frontend)/%5Bslug%5D/redirect-data.ts
  - id: openwiki-source-c7403ffa805d074d48baea6e
    resource: repo://src/app/(frontend)/%5Bslug%5D/seo-data.ts
  - id: openwiki-source-4f2e53306895c158accd92ec
    resource: repo://src/collections/revalidate-guides.ts
  - id: openwiki-source-10b98fc83fb5e49b777c3566
    resource: repo://src/components/achievement/achievement.css
  - id: openwiki-source-f22b7bdcf1597ce881ef1073
    resource: repo://src/components/achievement/AchievementParts.tsx
  - id: openwiki-source-7ba3e6f5057719fdf70c6941
    resource: repo://src/components/game/game.css
  - id: openwiki-source-2c139f34b50dd107e988159d
    resource: repo://src/components/game/PageEnhancements.tsx
  - id: openwiki-source-2a67994ef743619f0decb35a
    resource: repo://src/components/site/Breadcrumb.tsx
  - id: openwiki-source-014c13a445f559e314d219dd
    resource: repo://src/lib/achievements/cache.ts
  - id: openwiki-source-6c5141b803eb1f150eb8e36d
    resource: repo://src/lib/achievements/page.ts
  - id: openwiki-source-e73131df56ebe53f18c77bc5
    resource: repo://src/lib/achievements/queries.ts
  - id: openwiki-source-af2465572edd8138ad48c4b8
    resource: repo://src/lib/dofus-guides/page.ts
  - id: openwiki-source-d118161b5d38ff2095848286
    resource: repo://src/lib/game-data/correction.ts
  - id: openwiki-source-9e58d800f77e4c8aeaa3ca2e
    resource: repo://src/lib/guides/dungeon-bosses.ts
  - id: openwiki-source-e103be6c7e1a74cdcb0bea91
    resource: repo://src/lib/guides/dungeons.ts
  - id: openwiki-source-0ea598c55dee67445d1c39bb
    resource: repo://src/lib/zones/background.ts
  - id: openwiki-source-1f65cb688406ef2eb6ebe494
    resource: repo://tests/e2e/logro.spec.ts
  - id: openwiki-source-cc77052249edc8dcdc9064fb
    resource: repo://tests/unit/achievement-page.test.ts
generated: { by: "claude-code", at: "2026-11-20T11:20:16.585Z" }
verified:
  - by: openwiki/0.4.3
    at: 2026-11-20T11:20:16.585Z
---

# Achievement page

An achievement page (`achievement-pages`, see [Achievement data model](achievement-data.md)) renders at `/<slug>`, the same route as quest guides, Dofus guides, standalone pages and checklists. Slugs never collide across those collections, so the route tries one after another.

## Route and metadata

`src/app/(frontend)/[slug]/page.tsx`:

1. `loadGuidePage(slug)`: if a guide exists, render the guide (see [Guide page](../frontend/guide-page.md)).
2. Otherwise `loadAchievementPage(slug)`: if found, render `AchievementView`.
3. Otherwise `loadDofusGuide(slug)`: if found, render the Dofus guide (see [Dofus guide page](../dofus-guides/dofus-guide-page.md)).
4. Otherwise `loadSitePage(slug)`: if found, render the standalone page or redirect to its legacy page (see [Standalone pages](../pages/standalone-pages.md)).
5. Otherwise `loadChecklist(slug)`: if found, render the checklist (`SoulsView` for a souls checklist, `ChecklistView` otherwise) or redirect to its legacy page (see [Checklist page](../checklists/checklist-page.md) and [Souls checklist](../checklists/souls-checklist.md)).
6. None of them: `redirectOrNotFound(slug)` (`redirect-data.ts`) answers a 308 to the page's new address when Torre changed its slug, and otherwise `notFound()` (see [Redirects, sitemap and robots](../operations/redirects-and-seo.md)).

Before rendering, the route passes the loaded data through `withSiteLinks` (`src/lib/site/site-links.ts`), so Torre's links to his own site become relative where this site serves the path (see [Legacy redirects, sitemap and robots.txt](../operations/redirects-and-seo.md)). Each found page also renders `ArticleData`, the page's Article JSON-LD.

`generateMetadata` and `ArticleData` follow the same order through `slugSeo` (`src/app/(frontend)/[slug]/seo-data.ts`). For an achievement the title and description come from `achievementPageStrings.seo` with the page name and its number of quests; the canonical URL is `/<slug>` and Open Graph uses type `article` with the site name from «Ajustes del sitio» (`openGraphDefaults`, see [Site settings and index texts](../cms/site-copy.md)). The share image is the page's own card, `/<slug>/og`, drawn with the achievement's name over its zone background, and Twitter gets `summary_large_image` (see [Share cards, JSON-LD and update dates](../operations/share-cards-and-structured-data.md)). A preview sets `robots: { index: false, follow: false }`.

An achievement page in state `preparing` has no public page: the query filters it out for visitors, so the route returns 404.

## Loading and caching

`loadAchievementPage` (`src/app/(frontend)/[slug]/achievement-data.ts`) is wrapped in React `cache`, so the page and its metadata share one read per request.

- **Visitors** read through `unstable_cache` with the `achievement-pages` tag and a 600-second `revalidate` (`src/lib/achievements/cache.ts`).
- **Preview**: with Next's draft mode on and a valid panel session, it reads the latest draft without the cache, including pages in `preparing`. Draft mode without a session falls back to the published read.

`unstable_cache` stores JSON, so the quest givers, the note items and the dungeon bosses travel as arrays of pairs and become `Map`s again after the read. The loader adds `SITE_URL` (`src/lib/site/origin.ts`, from `NEXT_PUBLIC_SITE_URL`) for the absolute URLs of the JSON-LD.

`readAchievementPage` (`src/lib/achievements/queries.ts`) always runs with the viewer's permissions (`overrideAccess: false`):

1. Return null for a reserved or malformed slug (`isGuideSlug`).
2. Find the page by slug at depth 2. A visitor gets `draft: false` and `state: published` only.
3. Load the pages of the same metalogro, sorted by `order` then `name`, with only the achievement icon, quest `levelMin` and their Torre corrections populated.
4. Load the published guides of the page's quests and of their prerequisites, with each guide's "Necesitarás" items, notes and dungeon picks.
5. Load the NPCs that start each quest, keyed by DofusDB ID.
6. Read the game items whose exact name a note uses (`readNoteItems`) and the boss image of each dungeon note (`readDungeonBosses` in `src/lib/guides/dungeon-bosses.ts`), passing Torre's dungeon picks from the guides.
7. Resolve the zone background with `readZoneBackground`: the page's own `background` wins, otherwise the subarea of the first quest in its list (`achievementZoneQuest` in `src/lib/zones/background.ts`). It runs inside the cached read, so a visit costs no extra query (see [Zone background](../frontend/zone-background.md)). A cache entry stored before the field existed has no `zoneBackground` and renders without one.

### Revalidation

`src/collections/revalidate-guides.ts` expires the tags from every side, because each page type shows the others:

- Saves and deletes of `quest-guides` and `media` expire `guide-pages`, `achievement-pages`, `dofus-guides`, `checklists` and `pages`. A published guide makes its quest card a link on the achievement page, on the Dofus guide and on the checklist, and a media file is an icon or a render on all of them and a screenshot on standalone pages.
- Saves and deletes of `achievement-pages` and `achievement-groups` expire the same four tags: a guide shows its achievement page in its breadcrumb and "Misión 2 de 3", a Dofus guide lists each achievement's quests, and a checklist links each achievement.

Outside a Next request (scripts, the import, tests) `revalidateTag` throws a "static generation store missing" invariant; `expire` ignores that one error and rethrows any other. Writes made outside the server show within the 10-minute `revalidate`.

## The view model

`achievementPageView` (`src/lib/achievements/page.ts`) is pure code: it turns the loaded documents into what the components render and never invents a missing value.

- **Header meta**: "N misiones", the level range of the quest rows when known (a row's level is the lowest `levelMin` of its alternatives), and the points when positive.
- **Facts** (reused from the guide's `QuestFacts` data): Prerrequisitos and Recompensas. They go in the side sheet with «Necesitarás en total», not in the header.
  - Prerequisites: the rows Torre wrote in the page's «Prerrequisitos», each linked to its guide when a visitor can see it. With no rows, the quests required by the page's quests that are not part of the achievement, deduplicated, each linked to its published guide when there is one.
  - Rewards: experience, kamas and items from the page's `rewards`.
- **Necesitarás en total** (`achievementNeeds`, below).
- **Quest cards**: one per quest row, built by the exported `questCards`, with its number, level, title and the NPC render of its giver. The title is the name Torre gave the row, or the quest's name when he left it empty. The card links to the guide only when the row has one quest and that quest has a published guide. The [Dofus guide page](../dofus-guides/dofus-guide-page.md) reuses `questRows`, `questCards` and `cardLevels` for the quests of each achievement it lists.
- **Metalogro list**: the metalogro's pages in order (`group.items`). The current one is marked; one that is not `published` is disabled, without a link. The page does not render this list; it only feeds previous and next.
- **Previous and next**: the neighbours of the current page in that list. A neighbour that is not published shows dimmed with "En preparación" and no link.
- **Counts for**: the game achievements that require this one, from the DofusDB achievement's `countsFor`.

Every game record the view model reads (quests, the achievement icon, NPC renders, items) goes through `shown`: `corrected` puts Torre's correction (name, level, image) on top, and a record he hid (`hiddenByTorre`) is dropped, so a hidden quest leaves its row and a hidden item leaves «Necesitarás en total», where its note stays as text (see [Torre corrections to DofusDB data](../data/torre-corrections.md)).

### Necesitarás en total

`achievementNeeds` gathers what the published guides of the single-quest rows ask for. Rows with alternatives are skipped, because nobody knows which class quest you will do. The same function feeds the dungeon report of `pnpm data:refresh` (see [Achievement data model](achievement-data.md#dungeon-report)), so the page and the report agree.

`totalNeeds` sorts everything into three groups (`AchievementNeeds`):

| Group | What goes in |
|---|---|
| «Objetos» | the items the guides link; a quantified note that names one of them ("2 x Dragopavo pelirrojo.") counts for it; a note whose text is the exact name of a game item becomes that item, with its icon |
| «Combates y mazmorras» | combat notes and dungeon notes; a dungeon note carries its boss image when one is known |
| «Otros» | every other note, as Torre wrote it |

Notes with a quantity ("1 x Combate (solo).") are summed by their normalised label; notes without one ("Hechizo Captura de almas.") show once even when several guides repeat them, so nothing Torre wrote is lost. A note with and without a quantity are separate rows. Matching ignores case, accents and extra spaces and happens after every guide is read, so the result does not depend on the order of the guides.

Item quantities are counted per guide first:

- **Same guide, linked and noted.** When one guide links an item and also writes it in a note ("25 x Esquíritu majestuoso." in a guide that links 25), that is the same request: `guideAsks` takes the larger of the two, never their sum.
- **Consumed items sum across guides.** Each guide's ask is added up.
- **Items you only hold count once.** `onlyHeld` treats an item as held when DofusDB groups it as equipment (`itemGroup(superTypeId) === 'equipables'`: gear, pets, Dofus, trophies) and no single-quest row of the achievement has a `bring` objective for it. A quest that checks you own a Dofus Turquesa does not keep it, so the total takes the largest single ask instead of summing. A `show` objective («Enséñale») is not a `bring`: the NPC gives the item back, so it counts once too. An item without a DofusDB ID cannot be checked and sums as before. `achievementNeeds` builds the set of brought item IDs from the stored quest objectives.

A dungeon note's boss image comes from `chooseDungeonBosses` (`src/lib/guides/dungeon-bosses.ts`, shared with quest guides and Dofus guides). If Torre picked a dungeon for that note in a quest guide's summary (`needs.dungeons`, «Mazmorras de las notas», see [Guide authoring](../cms/guide-authoring.md)), the pick wins; `dungeonPicks` joins the picks across guides by note key and drops a note whose guides picked different dungeons. Otherwise `dungeonChooser` (`src/lib/guides/dungeons.ts`) asks `dungeonMatches`, which runs up to three passes and stops at the first that finds anything:

1. Each part of the note (outside and inside parentheses) is compared, longest prefix first, with each dungeon's full name, then with its bosses' names, then with the endings of those names ("Mazmorra de Grunob" is the dungeon of Director Grunob). A one-word ending only counts when it is the whole part.
2. The same without filler words, in the note and in the names ("Mazmorra Ben Ripata").
3. Only for parts that say "Mazmorra" in the singular: a name variant (two or more words in order, at most one extra word and one typo, such as "Ring Eskarlata"), or else the given name of a single boss in the whole game.

A part that yields several dungeons is a doubt, and any doubt means the note does not match. The image is that of the boss the note matched by, when it has one, and otherwise the first boss of the dungeon with an image. A row with no dungeon or no boss image shows the generic dungeon icon. The same choice, with how each note matched, feeds the dungeon report of `pnpm data:refresh` and `pnpm data:dungeon-notes`.

## Components

`AchievementView` (`src/app/(frontend)/[slug]/AchievementView.tsx`) renders the breadcrumb, `AchievementHeader` (the achievement icon, title, "3 misiones - Niveles 15 a 25 - 10 puntos" and the «Actualizado el» date from `contentDate(page).modified`), `AchievementSheet`, and a `logro__body` with Torre's `intro`, `AchievementQuests` (the numbered quest list, only when the page has quest rows) or `AchievementObjectives`, his `outro`, `AchievementCountsFor` ("Cuenta para") and `AchievementNav` (previous and next, labelled "Logros de <metalogro>"). There is no list of the metalogro's pages. When the page has a zone background, `ZoneBackground` renders first inside the page wrapper, before `<main>`. The `<main>` carries `pageSection('misiones')`, which marks «Misiones» as the current section in the header. The parts live in `src/components/achievement/AchievementParts.tsx` and their styles in `achievement.css`, which the Dofus guide page shares (`logro`, `logro__main`, `logro__prose`). The page's section color is `--color-sec-logros`.

### An achievement without quests

Some achievements ask for no quest: the «Alineamiento» ones ask for an alignment rank or a level. DofusDB gives them no quest rows, so `pnpm achievements:alineamiento` creates their pages (see [Achievement prose import](../data/achievement-prose-import.md)). For a page with no quest rows, `achievementPageView` returns `objectives`: the achievement's DofusDB `description` and its objective names in order, or null when DofusDB gives none. `AchievementObjectives` renders them in place of the quest list as a plain list with no numbers or links, because the objectives are met together, not in steps. The header meta drops «0 misiones» and says how many objectives there are («2 objetivos»), and the previous and next cards of such a page count objectives instead of quests (`GroupItem.objectives`).

### Hues

Each list item takes one of the eight theme hues in order through `--v` (`--color-hue-1` to `--color-hue-8`, repeating every eight; the rules sit at the end of `achievement.css`): the quest rows (`.lq__item`), the objectives of an achievement without quests (`.lobj__item`), the «Necesitarás en total» rows, the «Cuenta para» achievements (`.metas`), the Dofus guide's quest lists and the previous and next cards. A quest's number sits in a filled diamond of its hue (`.lq__n::before`, rotated 45 degrees) with the number in `--color-on-hue`. The previous and next cards (`.lnav__card`) take a 2px border and an eyebrow in their hue; on hover the eyebrow turns to ink, because a deep light-mode hue drops under 4.5:1 on `--color-raised`. The sheet's part titles take the same hues as the guide header's parts (`game.css`): Prerrequisitos `--color-hue-5`, «Necesitarás en total» `--color-hue-1` and the rewards `--color-hue-2`. Checklists never use hues.

The rules between the sheet's parts, under the header and along the quest list use `var(--zone-rule, var(--color-line))`, so over a zone background they stay at 3:1 against the landscape.

### The sheet

`AchievementSheet` is the page's "ficha" (option C of the compact achievement design in `DESIGN.md`). It holds, in this order:

1. «Prerrequisitos», foldable.
2. «Necesitarás en total», foldable, with its groups.
3. «Recompensas del logro», always visible, last.

An empty part is not rendered; with nothing to show there is no sheet (`hasSheet`), and the page stays one column. When the sheet exists, the main element gets `logro--sheet`:

- **From 64rem (desktop)** the sheet is a 20rem column against the right gutter, and the quest column takes the rest and grows with the window, so a wide screen leaves no empty strip on the right. The quests sit right under the title. The CSS shows its parts open, and `PageEnhancements` sets every `details[data-sheet]` open and stops a click on its summary from folding it, so the open state is also what assistive tech reads.
- **Below 64rem (phone and tablet)** the sheet sits between the header and the rest of the page, with Prerrequisitos and «Necesitarás en total» as one collapsed row each that opens on tap. The rewards stay visible at the end.

The folds are `<details>` elements closed in the HTML, so the page works without JavaScript.

Inside «Necesitarás en total», each non-empty group has its title. Items and combats keep an icon slot aligned with the first line of text, a matched dungeon shows its boss, and a quantity renders as a bold "3 ×" before the text. «Otros» has no icons. Item names use `CopyName`, so a click copies the name for the game's search.

The intro and outro render through `GuideRichText`, so a «Vídeo» block in Torre's prose shows as the video facade that loads YouTube only on click.

The page's only client island is the guide's `PageEnhancements`, here for the rewards bag, copying names and the sheet's open state; `LivePreviewRefresh` renders only in preview.

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
- `tests/e2e/logro.spec.ts`: breadcrumb and header with the sheet beside the quests on desktop; on phone and tablet, Prerrequisitos and «Necesitarás en total» collapsed and the rewards last and visible; the sheet without JavaScript; fold animation and reduced motion; the three needs groups with «Otros» on one line; copying a name without layout shift; quest cards linking only published guides; quest numbers in diamonds of their hue, the sheet titles in their part's hue and the previous and next cards with their hue border; no metalogro list, with "Cuenta para" and previous/next in the quest column; Torre's prose with the video facade; a hand-picked dungeon showing its boss; 404 for a `preparing` page; the phone breadcrumb; axe (WCAG 2.2 AA) in both modes. The zone background on achievement pages is covered by `tests/e2e/fondo-zona.spec.ts`.
