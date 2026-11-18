---
type: feature
title: Checklists index
description: How /checklists renders every checklist as a row of posters (art from each checklist's index card, ink color checked for contrast, the «???» teaser from the checklists-index global), the one cached read it shares with the menu, and the island that tilts posters and loads the progress engine and the poster progress endpoint only when the browser has saved progress.
tags: [checklists, index, posters, progress, island, performance]
sources:
  - id: openwiki-source-095e24824745f80306ff1562
    resource: repo://scripts/import/checklists/cards.ts
  - id: openwiki-source-36d8bf7e37d841ba67a15d0b
    resource: repo://scripts/import/import-checklist-cards.ts
  - id: openwiki-source-5f0afecf4f0bcd886ec62fb5
    resource: repo://src/app/(frontend)/checklists/page.tsx
  - id: openwiki-source-e662deaf5fc4b6bc8b7128a5
    resource: repo://src/app/(frontend)/site-data.ts
  - id: openwiki-source-e6d5c185a004809eb4e5ff36
    resource: repo://src/components/checklists/ChecklistPostersIsland.tsx
  - id: openwiki-source-5bcfa4a2208e49c23a934507
    resource: repo://src/components/checklists/checklists-index.css
  - id: openwiki-source-4e414ad143c55ca67c07d9ae
    resource: repo://src/components/checklists/ChecklistsIndex.tsx
  - id: openwiki-source-4b044e40bee3b65d551e1038
    resource: repo://src/components/checklists/poster-progress-ui.ts
  - id: openwiki-source-901293d1995c83a143fd5fae
    resource: repo://src/components/checklists/posters-ui.ts
  - id: openwiki-source-6bf04cbb0aa0ee8a237c4b83
    resource: repo://src/components/ui/tilt.ts
  - id: openwiki-source-0dfc60e4771d54c856d97933
    resource: repo://src/globals/ChecklistsIndex.ts
  - id: openwiki-source-765af2a447d91c2278b95582
    resource: repo://src/lib/checklists/list.ts
  - id: openwiki-source-38db56cb34655c50212083db
    resource: repo://src/lib/checklists/poster-ink.ts
  - id: openwiki-source-39813c91618e811eb10dcd1b
    resource: repo://src/lib/checklists/poster-models.ts
  - id: openwiki-source-8a81a132ddb049223658da76
    resource: repo://src/lib/checklists/poster-progress.ts
  - id: openwiki-source-64cb67184a332f58fce45aeb
    resource: repo://src/lib/checklists/queries.ts
  - id: openwiki-source-82f7e2d5fa988b170f5dea19
    resource: repo://src/lib/dofus-guides/egg-line.ts
  - id: openwiki-source-2237e095c005029df3a25713
    resource: repo://src/lib/dofus-guides/egg.ts
  - id: openwiki-source-3bd66ce842612aa5530166a6
    resource: repo://tests/e2e/checklists-index.spec.ts
generated: { by: "claude-code", at: "2026-11-18T11:06:38.803Z" }
verified:
  - by: openwiki/0.4.3
    at: 2026-11-18T11:06:38.803Z
---

# Checklists index

`/checklists` lists every published checklist as a row of posters, in Torre's order, like the hub of his old Squarespace site. The header menu, the footer, the search and the home page show the same list. Each checklist's own page is covered in [Checklist page](checklist-page.md) and [Souls checklist](souls-checklist.md).

## One cached read

`loadChecklists` (`src/app/(frontend)/site-data.ts`) is one `unstable_cache` read under the `checklists` tag, shared by the index, the menu, the footer, the search and the home page. `loadChecklistNav` maps the same entries to menu items (`checklistNavItems`, with a 128px egg). `loadChecklistTeaser` reads the «???» poster under the same tag.

`readChecklists` (`src/lib/checklists/queries.ts`) reads as a visitor: every published checklist, «En preparación» included, ordered by `order` then `name`, without steps. In parallel it reads:

- the scene and NPC images of every index card in one Media query;
- the color and egg of each checklist's Dofus guide and of each guide in its card's `crown`, with `overrideAccess`, even when the guide is still a draft. The poster's egg is `dofusEgg` (`src/lib/dofus-guides/egg.ts`): the egg Torre uploaded on the guide, or else the Dofus item's image with his correction, or none if he hid the item. A crown egg is the crown guide's Dofus item image. They are game data, and nothing else is selected from the guide, so unpublished content never reaches a visitor.

`checklistEntries` (`src/lib/checklists/list.ts`) turns each document into an entry:

- **Link.** A published checklist links to `/<slug>`, one «En preparación» to its `legacyHref` marked as legacy, and one with no link to nothing.
- **Color.** The card's own color wins over the Dofus guide's color.
- **Ink.** `posterInk` (`src/lib/checklists/poster-ink.ts`) decides the name's color on the server: the egg color as is when it reaches 4.5:1 against the poster shade of each mode, otherwise mixed with white (dark mode) or black (light mode) just enough to reach it. The shades are the worst case of `.poster__shade` across the themes (`POSTER_SHADE`): the dark one is the lightest dark-theme background (Bonta) at 96 percent over white art, the light one the darkest light-theme surface (Ocre) at 92 percent over black art; `tests/unit/checklist-poster-ink.test.ts` derives them from `theme.css`. The mixing itself is `contrastedColor`, which takes the two grounds and a target ratio; the Dofus guides index reuses it for its egg-colored card borders at 3:1 (see [Dofus guides index](../dofus-guides/dofus-guides-index.md)).
- **Art.** The card's scene, NPC and the NPC framing (height, right and top offsets in percent), when set. A card with a `crown` (the rush, which gives every Dofus) gets the crown's eggs, each with its guide's color, instead of the NPC and the single egg.

## The page

`src/app/(frontend)/checklists/page.tsx` loads the entries, the teaser and the «Portada e índices» texts in parallel and renders `ChecklistsIndex` (`src/components/checklists/ChecklistsIndex.tsx`, styled in `checklists-index.css`): an eyebrow, a title, a lead and a list of posters. The eyebrow, title, lead, empty message and SEO title and description come from that global, and `generateMetadata` (`indexMetadata`) adds the site name and share image from «Ajustes del sitio» (see [Site settings and index texts](../cms/site-copy.md)); without the global the component uses `indexTextDefaults.checklists`. With no checklist it shows a message instead of an empty row. Nothing in the copy counts checklists.

The page uses the full frame width, left aligned: `.ck-index` pads its sides with `--frame-pad`, and the poster row bleeds to the gutter (`--gutter`) and starts at the left instead of centering. The eyebrow is `--color-accent` in Lexend (`--font-ui`) and the title Rowdies (`--font-title`) in capitals, like other page titles (see [Styles and layout shell](../frontend/styles-and-shell.md)). The `<main>` carries `pageSection('dofus')`, so the header marks the Dofus section as current.

Each poster (3:4) layers the scene, the NPC peeking in from the right, a shade, the Dofus egg, a holographic foil and the name in its ink color. A crown poster (`poster--crown`) layers the scene, the shade, the crown of eggs (the first large in the centre, the rest around it, each glowing in its color) and the foil instead. The poster's color and ink travel as CSS custom properties (`--egg`, `--egg-ink-dark`, `--egg-ink-light`), and the NPC framing as `--npc-h`, `--npc-r` and `--npc-t`.

- A poster with a link is an `<a>`. A preparing checklist with a Squarespace link is a poster like any other.
- A poster without a link is dimmed, `aria-disabled`, with the «En preparación» pill.
- A published checklist has a hidden progress ring in its corner, positioned absolutely so showing it moves nothing.
- The first two posters load their scene and egg with priority, because on a phone one of them can be the LCP image.

The last poster is the teaser from the `checklists-index` global (`src/globals/ChecklistsIndex.ts`): the next checklist Torre is preparing, in grey, with the egg as a black silhouette, no link and no tilt. `checklistTeaser` returns it only when it is enabled and has text. The global sits in the panel's «Contenido» group; anyone can read it, panel users update it, and saving it expires the `checklists` tag. It also keeps a hidden `importSnapshot` that only the card import reads.

`/sistema` renders the same `ChecklistPosters` component (see [Component catalog](../frontend/component-catalog.md)).

## The posters island

`ChecklistPostersIsland` is a client component that renders nothing. Without it the posters look the same, without tilt or percentage.

- **Tilt.** `startTilt`, the shared tilt of `src/components/ui/tilt.ts` (also used by the Dofus guides index and the metalogros tiles), tilts each `[data-tilt]` poster toward the mouse pointer and moves the foil highlight with it (`--fx`, `--fy`), then resets on leave. It ignores touch and pen, and does nothing under reduced motion (see [Design system components](../frontend/design-system-components.md)).
- **Progress, only when there is some.** `hasProgress` checks whether `localStorage` has the `ta-web:progress` key. Only then does the island load `poster-progress-ui.ts` with `import()`. That module fetches `GET /api/checklists/poster-progress` once and paints each published checklist's percentage with the same engine as the checklist page. A visitor who never ticked anything downloads neither the engine nor the models. If progress appears later (another tab writes it, or the page comes back from the back-forward cache), the `storage` and `pageshow` listeners start it then.
- **Repaint.** Once started, it repaints on `storage` and `pageshow`. A percentage of 0 hides the ring; 100 marks it done.

## Poster progress models

`GET /api/checklists/poster-progress` (`src/endpoints/checklist-poster-progress.ts`, mounted on the `checklists` collection) returns one model per published checklist, in order:

- a steps checklist (`stepsPosterModel`): its steps with their quests and kinds, the weights, objective counts, prerequisites between its quests, generic rows and the quests that finish on their own, cut down from what its page's island receives;
- a souls checklist (`soulsPosterModel`): its souls.

`readPosterModels` (`src/lib/checklists/poster-models.ts`) builds them from `readPublishedChecklist`, the same cached read as the checklist page, so it repeats no work. The endpoint itself caches under the `checklists` tag, gzips the JSON when the browser accepts it, and lets the browser keep it for five minutes. `posterPct` (`src/lib/checklists/poster-progress.ts`) computes the percentage with `checklistModel` and `progressPct` for steps and `soulsPct` for souls (see [Checklist progress engine](progress.md)).

## Card art import

`pnpm import:checklist-cards --from <silvestre-checklist> [--apply] [--remote] [--production]` (`scripts/import/import-checklist-cards.ts`) brings the poster art of the old hub: the scene, NPC and framing of each catalog entry with a `card`, and the scene and egg of the teaser. It runs after `pnpm import:checklists`.

`loadChecklistCards` (`scripts/import/checklists/cards.ts`) uploads each image to Media once (keyed through `media.gameAsset`, like the checklist art) and fills the card fields. It imports a card `color` only for an entry without a Dofus guide (the rush's gold); otherwise the color stays empty and the poster uses the Dofus guide's. It writes the `crown` as the catalog's Dofus guide slugs resolved to IDs in order; if any of them is missing, it writes no crown and reports the missing guides, since half a crown would move the eggs. Lists compare by content and order when deciding whether Torre changed a field. It also sets the hub's name («Dofus Ocre») when the stored name is still the one `pnpm import:checklists` wrote.

Reruns follow the import rule: a field changes only while it still equals what the last import wrote (`importSnapshot`, `card` on the checklist and `teaser` on the global). A field that already had a value with nothing imported before is Torre's and stays. A checklist with a draft in progress is decided twice: the published version against the published values, and the draft against the draft, so Torre's unpublished edits are not published. Without `--apply` it only counts. It refuses remote and production databases without their flags.

## Tests

- `tests/unit/checklist-list.test.ts`, `checklist-poster-ink.test.ts` and `checklists-index.test.tsx`: the entries, the ink and the posters.
- `tests/unit/checklists-posters-ui.test.ts`, `tilt.test.ts`, `checklist-poster-progress.test.ts` and `checklist-poster-progress-endpoint.test.ts`: tilt, `hasProgress`, painting, the models and the endpoint.
- `tests/unit/checklists-index-global.test.ts`: the global.
- `tests/integration/checklist-list-queries.test.ts` and `import-checklist-cards.test.ts`: the queries with real access rules and the card import.
- `tests/e2e/checklists-index.spec.ts`: one poster per checklist in Torre's order with the teaser last, the card art and framing, color precedence, links, the dimmed poster, no gap above the footer, the footer portrait not being the phone LCP, priority loading, tilt and reduced motion, the percentage after ticking a step, axe in both modes, and the menu, footer and phone menu entries.
