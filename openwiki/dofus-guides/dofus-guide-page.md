---
type: feature
title: Dofus guide page
description: How /<slug> renders a published Dofus guide - the route order, what readDofusGuide loads and hides from visitors, the cached loader and draft preview, the dofusGuideView view model (counts, Necesitarás, parts, video, checklist, previous and next) and the components that draw it.
tags: [dofus-guides, frontend, page, cache, preview]
sources:
  - id: openwiki-source-416f8fbc8990e6277cc33995
    resource: repo://src/app/(frontend)/%5Bslug%5D/dofus-data.ts
  - id: openwiki-source-a139cba41ecfce162ffa7efc
    resource: repo://src/app/(frontend)/%5Bslug%5D/DofusGuideView.tsx
  - id: openwiki-source-cb49e3c4d1015b8673e71275
    resource: repo://src/app/(frontend)/%5Bslug%5D/page.tsx
  - id: openwiki-source-4d5101e22a43d90e5f3610c9
    resource: repo://src/components/dofus/DofusGuideParts.tsx
  - id: openwiki-source-af2465572edd8138ad48c4b8
    resource: repo://src/lib/dofus-guides/page.ts
  - id: openwiki-source-103e36851b256d561f7bbe2b
    resource: repo://src/lib/dofus-guides/queries.ts
  - id: openwiki-source-0541138ab33ba7b069dd2d9c
    resource: repo://tests/e2e/guias-dofus.spec.ts
  - id: openwiki-source-aa30c412faf864bf6cc7181a
    resource: repo://tests/integration/dofus-guide-queries.test.ts
  - id: openwiki-source-dfcb2081da061b860bb5cf7e
    resource: repo://tests/unit/dofus-guide-page.test.ts
generated: { by: "claude-code", at: "2026-11-14T11:00:46.827Z" }
verified:
  - by: openwiki/0.4.3
    at: 2026-11-14T11:00:46.827Z
---

# Dofus guide page

A published Dofus guide (see [Dofus guide data model](dofus-guide-data.md)) renders at `/<slug>`, the same route as quest guides and achievement pages. It is one centered reading column: the breadcrumb, a header with the egg, the checklist card, Torre's intro, Necesitarás, the optional step-by-step body, the achievements and quests in order, the closing, the video and the previous and next Dofus.

## Route

`src/app/(frontend)/[slug]/page.tsx` tries, in order, a quest guide, an achievement page, a Dofus guide and a checklist; slugs never collide across them. `loadDofusGuide(slug)` runs only when neither of the first two exists; when it returns null the route tries a checklist and then calls `notFound()` (see [Checklist page and index](../checklists/checklist-page.md)). `generateMetadata` uses the same order: for a Dofus guide the title and description come from `dofusPageStrings.seo` with the guide name, the canonical URL is `/<slug>`, Open Graph type is `article`, and a preview sets `robots: { index: false, follow: false }`.

A guide in state `preparing` has no page: the query filters it out for visitors, so the route returns 404.

## Loading

`loadDofusGuide` (`src/app/(frontend)/[slug]/dofus-data.ts`) is wrapped in React `cache`, so the page and its metadata share one read per request.

- **Visitors** read through `unstable_cache` under the `dofus-guides` tag with a 600-second `revalidate`.
- **Preview**: with Next's draft mode on and a valid panel session it reads the latest draft without the cache, `preparing` guides included. Draft mode without a session falls back to the published read.

`unstable_cache` stores JSON, so the loader's four maps (achievement pages, quest guides, guide by quest, quest givers) travel as arrays of pairs and become `Map`s again. The loader adds `SITE_URL` for the breadcrumb's JSON-LD.

`readDofusGuide` (`src/lib/dofus-guides/queries.ts`) always runs with the viewer's permissions (`overrideAccess: false`):

1. Return null for a reserved or malformed slug (`isGuideSlug`), before any query.
2. Find the guide by slug at depth 2, populating only the Dofus item's name and image and the Necesitarás items. A visitor gets `draft: false` and `state: published` only; a preview reads drafts as the panel user.
3. Collect the IDs of the achievement pages and quest guides its parts link, and load them **as a visitor**, even in preview: an unpublished achievement page or quest guide does not appear. Achievement pages come with their quests (name, minimum level, start positions) and the achievement icon; quest guides with their slug, title and quest.
4. Find the published quest guide of every quest of those achievements, keyed by quest.
5. Load the NPCs that start those quests, and the quests of loose quest guides, for their right-facing render.
6. Read the list of all Dofus with `readDofusList`, for previous and next.

`readDofusList` returns every Dofus guide a visitor can read, sorted by `order` then `name`, with the Dofus item's image (the egg) and counts of achievements and quests. The counts only include what a visitor can read: an achievement page counts when it has a published version, with its number of quest rows, and a loose quest counts when its guide has one. The index and the header menu use the same list (see [Dofus guides index and menu](dofus-guides-index.md)).

## View model

`dofusGuideView` (`src/lib/dofus-guides/page.ts`) is pure code that turns the loaded documents into what the components render.

- **Header**: the egg, the name, the color (the glow behind the egg), the tag label and the meta line "N logros - N misiones - Nivel N", built by `dofusMeta`, which leaves out a zero count or a missing level. The counts are of what the page actually shows.
- **Necesitarás**: groups with their rows. An item row takes the linked item's name and icon, or the typed name when no item is linked; a row with neither is dropped. A group with no rows is dropped, and with no groups the section is not rendered. The title is the guide's own or "Necesitarás".
- **Parts**, in Torre's order:
  - An achievement shows its name, icon, a meta line (quests, level range, points) and its quest cards, built by the achievement page's `questRows` and `questCards` (see [Achievement page](../achievements/achievement-page.md)): each with the giver NPC's render, the level and the title, linked when the quest has a published guide. An achievement page that is not `published` is shown disabled, without a link, with "En preparación".
  - A metalogro is numbered ("Metalogro 1", in the order metalogros appear) and lists its achievements the same way.
  - Loose quests and a single quest are cards of their quest guides, with Torre's note.
  - A note is Torre's rich text.
  - A part whose achievement page or quest guide the visitor cannot see is not rendered; a metalogro or loose-quest list left empty is dropped.
- **Video**: the YouTube ID, the guide name as title and the poster from Media.
- **Checklist**: a card only when both the name and the URL are set.
- **Previous and next**: the neighbours of the current guide among the published Dofus of the list, each with its egg and meta line.
- **Breadcrumb**: "Guías de Dofus" (`/guias-dofus`) as the only parent; the guide itself goes only in the `BreadcrumbList` JSON-LD.

## Components

`DofusGuideView` (`src/app/(frontend)/[slug]/DofusGuideView.tsx`) lays out the column; the parts are in `src/components/dofus/DofusGuideParts.tsx`. They reuse the achievement page's styles (`achievement.css`, classes `logro`, `lhead`, `lnav`) and the guide components:

- `DofusHeader`: the egg (`Picture` with `priority`, the LCP image), the title, the meta line with the tag pill, and the Prerrequisitos and Recompensas columns, Torre's rich text with its links.
- `DofusChecklist`: the checklist card with the egg.
- `DofusNeeds`: one block per group; in each, the item rows in columns (icon well, "N ×" and the name) and then the notes, each in Torre's order. Every item name is a `CopyName`, which copies it to search in the game.
- `DofusBody`: the step-by-step body through the quest guide's `GuideBody`.
- `DofusParts`: the metalogro and the achievement are headings and the quests a ruled list, with no boxes inside boxes. A quest without a published guide shows "Sin guía todavía".
- `DofusVideo`: the guides' `VideoFacade`, which loads YouTube only on click.
- `DofusNav`: previous and next as cards, like the next-quest card of a guide.

The only client island is the guides' `PageEnhancements` (copy buttons, the video and the screenshots); `LivePreviewRefresh` renders only in preview.

## Tests

- `tests/unit/dofus-guide-page.test.ts`: the header meta, Necesitarás groups and title, achievement and metalogro parts with their quest cards, loose quests and notes, hidden parts, the video and checklist, previous and next, the breadcrumb.
- `tests/integration/dofus-guide-queries.test.ts`: the guide with its published achievements, quests, guides and givers; a `preparing` guide hidden from visitors but visible in preview; no query for a non-guide slug; the list in Torre's order with its counts.
- `tests/e2e/guias-dofus.spec.ts` (guide part): breadcrumb, header with the egg, prerequisites, checklist and intro; Necesitarás items that copy their name and render in columns with the notes after them; achievement quests from the achievement page and the loose quest's note; one column with the previous Dofus; 404 for a `preparing` Dofus; axe (WCAG 2.2 AA) in both modes.
