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
  - id: openwiki-source-c7403ffa805d074d48baea6e
    resource: repo://src/app/(frontend)/%5Bslug%5D/seo-data.ts
  - id: openwiki-source-10b98fc83fb5e49b777c3566
    resource: repo://src/components/achievement/achievement.css
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
generated: { by: "claude-code", at: "2026-11-20T11:20:16.585Z" }
verified:
  - by: openwiki/0.4.3
    at: 2026-11-20T11:20:16.585Z
---

# Dofus guide page

A published Dofus guide (see [Dofus guide data model](dofus-guide-data.md)) renders at `/<slug>`, the same route as quest guides, achievement pages, standalone pages and checklists. It is one reading column, left aligned and as wide as the frame (`.logro` pads its sides with `--frame-pad`, see [Styles and layout shell](../frontend/styles-and-shell.md)): the breadcrumb, a header with the egg, the checklist card, Torre's intro, Necesitarás, the optional step-by-step body, the achievements and quests in order, the closing, the video and the previous and next Dofus.

## Route

`src/app/(frontend)/[slug]/page.tsx` tries, in order, a quest guide, an achievement page, a Dofus guide, a standalone page and a checklist; slugs never collide across them. `loadDofusGuide(slug)` runs only when neither of the first two exists; when it returns null the route tries the rest and finally answers a 308 to a changed slug's new address or 404 (see [Request pipeline](../architecture/request-pipeline.md)). `generateMetadata` uses the same order: for a Dofus guide the title and description come from `dofusPageStrings.seo` with the guide name, the canonical URL is `/<slug>`, Open Graph type is `article` with the site name from «Ajustes del sitio» and the page's own share card (`/<slug>/og`, the Dofus egg on the card), and a preview sets `robots: { index: false, follow: false }`. The route also renders the page's Article JSON-LD and passes the loaded guide and the live slugs to the view, so Torre's links to his own site become relative where this site serves the path (see [Share cards, JSON-LD and update dates](../operations/share-cards-and-structured-data.md)).

A guide in state `preparing` has no page: the query filters it out for visitors, so the route returns 404.

## Loading

`loadDofusGuide` (`src/app/(frontend)/[slug]/dofus-data.ts`) is wrapped in React `cache`, so the page and its metadata share one read per request.

- **Visitors** read through `unstable_cache` under the `dofus-guides` tag with a 600-second `revalidate`.
- **Preview**: with Next's draft mode on and a valid panel session it reads the latest draft without the cache, `preparing` guides included. Draft mode without a session falls back to the published read.

`unstable_cache` stores JSON, so the loader's maps (achievement pages, quest guides, guide by quest, quest givers and dungeon bosses) travel as arrays of pairs and become `Map`s again; a cache entry saved before the bosses existed gives an empty map. The loader adds `SITE_URL` for the breadcrumb's JSON-LD.

`readDofusGuide` (`src/lib/dofus-guides/queries.ts`) always runs with the viewer's permissions (`overrideAccess: false`):

1. Return null for a reserved or malformed slug (`isGuideSlug`), before any query.
2. Find the guide by slug at depth 2, populating only the Dofus item's name and image and the Necesitarás items. A visitor gets `draft: false` and `state: published` only; a preview reads drafts as the panel user.
3. Collect the IDs of the achievement pages and quest guides its parts link, including the guides of Torre's own quest rows, and load them **as a visitor**, even in preview: an unpublished achievement page or quest guide does not appear. Achievement pages come with their quests (name, minimum level, start positions) and the achievement icon; quest guides with their slug, title and quest.
4. Find the published quest guide of every quest of those achievements, keyed by quest.
5. Load the NPCs that start those quests, and the quests of loose quest guides, for their right-facing render.
6. Read the list of all Dofus with `readDofusList`, for previous and next.
7. Read the boss image of each dungeon note in «Necesitarás» (`readDungeonBosses`, matching by name or boss; Dofus guides have no hand-picked dungeons).
8. Find the first published checklist (in Torre's order) whose `dofusGuide` is this guide, for the checklist card.

`readDofusList` returns every Dofus guide a visitor can read, sorted by `order` then `name`, with the Dofus item's image (the egg) and counts of achievements and quests. The counts only include what a visitor can read: an achievement page counts when it has a published version, with its number of quest rows, and a loose quest counts when its guide has one. The index and the header menu use the same list (see [Dofus guides index and menu](dofus-guides-index.md)).

## View model

`dofusGuideView` (`src/lib/dofus-guides/page.ts`) is pure code that turns the loaded documents into what the components render.

- **Body** (`dofusBody`): the step-by-step body through the quest guide's `guideContent` (intro, steps and closing), without priority on its first screenshot because it sits below the header. A step with no blocks to render and no coordinates is dropped.
- **Header**: the egg (`dofusEgg`: Torre's own egg or the Dofus item's image with his correction), the name, the color (the glow behind the egg), the tag label and the meta line "N logros - N misiones - Nivel N", built by `dofusMeta`, which leaves out a zero count or a missing level. The counts are of what the page actually shows.
- **Necesitarás** (`needsView`): groups with their rows. An item row takes the linked item's name and icon (with Torre's correction; a hidden item is dropped), or the typed name when no item is linked; a row with neither is dropped. A note that is a dungeon note gets an icon slot with the boss of the dungeon it names, or the generic dungeon icon when it names no single one, as in «Necesitarás en total» on achievement pages. A group with no rows is dropped, and with no groups the section is not rendered. The title is the guide's own or "Necesitarás", and the guide's `note` goes above the groups.
  - When every group has a group from the fixed list (see [Dofus guide data model](dofus-guide-data.md)), groups with the same group are merged and sorted in the list's order, each shown with its Spanish name. Inside a group, each part keeps Torre's subtitle above its rows, and loose rows of the same group run together. A subtitle that only repeats the group name («Combates» under Combates) is hidden; one like «1 x Mazmorra» shows as «1 × Mazmorra:». A lone «Otros» group without subtitles shows without a title.
  - If any group has no fixed group (a migrated guide the import has not sorted yet), everything stays in its stored order, without moving rows.
- **Parts**, in Torre's order:
  - An achievement shows its name, icon, a meta line (quests, level range, points) and its quest cards. With `pageQuests` checked, the cards come from the achievement page's `questRows` and `questCards` (see [Achievement page](../achievements/achievement-page.md)). With it unchecked (`hasOwnQuests`), they are Torre's rows (`torreRowCard`): his text as the title, linked to the row's visible guide with its giver and level; a row that links several guides («La fatalidad - El destino - La rivalidad») splits its text on « - », « o » or « / » and links each piece to its guide, with the lowest level and no NPC, or links the whole text to the first guide when the pieces do not match. An achievement page that is not `published` is shown disabled with "En preparación"; its name links to Torre's old page when he gave a `link` (a site path, on his Squarespace origin), and otherwise has no link.
  - A metalogro is numbered ("Metalogro 1", in the order metalogros appear) and lists its achievements the same way.
  - Loose quests and a single quest are cards of their quest guides, titled with Torre's text when he wrote one and with his note. A guide the visitor cannot see leaves a row with Torre's text unlinked («Sin guía todavía»). A row that is a link and not a quest («Logro: Cazadores cazados») is a `kind: 'link'` card, without number, linked only through `siteOrWebHref`.
  - A note is Torre's rich text.
  - A part whose achievement page or quest guide the visitor cannot see is not rendered; a metalogro or loose-quest list left empty is dropped.
- **Video**: the YouTube ID, the guide name as title and the poster from Media.
- **Checklist**: a card when the guide has a checklist name and somewhere to link: the published checklist of this Dofus on this site, or else the guide's Squarespace checklist URL, made relative when this site serves its path (`ownLink`, which applies `siteLinkHref` to every link Torre wrote on the guide: the checklist URL and the loose link rows). Links to other sites open in a new tab (`SiteOrWebLink`).
- **Previous and next**: the neighbours of the current guide among the published Dofus of the list, each with its egg and meta line.
- **Breadcrumb**: "Guías de Dofus" (`/guias-dofus`) as the only parent; the guide itself goes only in the `BreadcrumbList` JSON-LD.

## Components

`DofusGuideView` (`src/app/(frontend)/[slug]/DofusGuideView.tsx`) lays out the column; the parts are in `src/components/dofus/DofusGuideParts.tsx`. They reuse the achievement page's styles (`achievement.css`, classes `logro`, `lhead`, `lnav`) and the guide components:

- `DofusHeader`: the egg (`Picture` with `priority`, the LCP image), the title, the meta line with the tag pill, the «Actualizado el» date (`UpdatedDate`, from `contentDate(guide).modified`), and the Prerrequisitos and Recompensas columns, Torre's rich text with its links.
- `DofusChecklist`: the checklist card with the egg.
- Hues: the section titles of the body (`.dg-sec > h2`) cycle through `--color-hue-2`, `--color-hue-5` and `--color-hue-8`; the quest rows of each achievement part (`.dg-ql__i`) take the eight hues in order like the achievement page's quest list; Prerrequisitos and Recompensas in the header take their part hues (see [Achievement page](../achievements/achievement-page.md#hues)). The video stays at `--width-video` however wide the column is.
- `DofusNeeds`: the title, the guide's note, then one block per group (`DofusNeedGroup`, also drawn alone by the `/sistema` catalog for the panel thumbnails) with its name; in each part, the subtitle and then the item rows in columns (icon well, "N ×" and the name) followed by the notes, each in Torre's order. Every item name is a `CopyName`, which copies it to search in the game. The notes sit in a grid of `auto-fit` columns at least 15rem wide, so a lone note takes the full row up to the text measure (`--width-prose`) instead of being squeezed into one column; a dungeon note's boss renders in its well with `kind="dungeon"`.
- `DofusBody`: the «Paso a paso» section, rendered with the quest guide's `GuideSections` at heading level 3; nothing when the body is empty.
- `DofusParts`: each part is a `DofusPart` (also drawn alone by `/sistema`). The metalogro and the achievement are headings and the quests a ruled list, with no boxes inside boxes. A quest without a published guide shows "Sin guía todavía"; a link row shows without its number.
- `DofusVideo`: the guides' `VideoFacade`, which loads YouTube only on click.
- `DofusNav`: previous and next as cards, like the next-quest card of a guide.

The only client island is the guides' `PageEnhancements` (copy buttons, the video and the screenshots); `LivePreviewRefresh` renders only in preview.

## Tests

- `tests/unit/dofus-guide-page.test.ts`: the header meta, Necesitarás groups and title, achievement and metalogro parts with their quest cards, loose quests and notes, hidden parts, the video and checklist, previous and next, the breadcrumb.
- `tests/integration/dofus-guide-queries.test.ts`: the guide with its published achievements, quests, guides and givers; a `preparing` guide hidden from visitors but visible in preview; no query for a non-guide slug; the list in Torre's order with its counts.
- `tests/e2e/guias-dofus.spec.ts` (guide part): breadcrumb, header with the egg, prerequisites, checklist and intro; Necesitarás items that copy their name and render in columns with the notes after them; a lone note reaching the text measure instead of one column; achievement quests from the achievement page and the loose quest's note; one column with the previous Dofus; the step-by-step body (prose, screenshot, step and closing); 404 for a `preparing` Dofus; axe (WCAG 2.2 AA) in both modes.
