---
type: feature
title: Home page
description: The home page at / - its sections, the counts it shares with the header, the simulated live state, the hero quest search island that loads its engine and index on first focus, the static art pipeline, and how it stays inside its JavaScript and render-blocking CSS budget.
tags: [frontend, home, search, islands, performance, images]
sources:
  - id: openwiki-source-08041eccd454d12ff003046d
    resource: repo://scripts/build-home-images.ts
  - id: openwiki-source-aafaf952c3fb594c6ce91656
    resource: repo://src/app/(frontend)/page.tsx
  - id: openwiki-source-e662deaf5fc4b6bc8b7128a5
    resource: repo://src/app/(frontend)/site-data.ts
  - id: openwiki-source-382f77fb14b472e2e42a644e
    resource: repo://src/components/home/Areas.tsx
  - id: openwiki-source-4cfa2dcb380905ec07fd173f
    resource: repo://src/components/home/art.ts
  - id: openwiki-source-229ea5c967502d568eac1202
    resource: repo://src/components/home/data.ts
  - id: openwiki-source-95f1b099d38d8d5d29e37405
    resource: repo://src/components/home/GuideTour.tsx
  - id: openwiki-source-f20b6ec2f60075e58ffb94c7
    resource: repo://src/components/home/Hero.tsx
  - id: openwiki-source-8aa1cfd34110191b3c1c376c
    resource: repo://src/components/home/HeroResults.tsx
  - id: openwiki-source-b2dcc3b69dbff1da922eb36e
    resource: repo://src/components/home/HeroSearch.tsx
  - id: openwiki-source-8d7561f0048965bae272d02d
    resource: repo://src/components/home/home.css
  - id: openwiki-source-39afe86b52965c905da37bef
    resource: repo://src/components/site/nav.ts
  - id: openwiki-source-66bf87151b29d7c77f7b681f
    resource: repo://src/components/site/search.ts
  - id: openwiki-source-bf8e9f6d6570c9b0df47bfe1
    resource: repo://src/lib/site/counts.ts
  - id: openwiki-source-e917033cef40494d844249a6
    resource: repo://src/lib/site/live.ts
  - id: openwiki-source-1ad069df7a453770f4cdef35
    resource: repo://tests/e2e/inicio.spec.ts
  - id: openwiki-source-3e3179409ea49f06dbda4ea5
    resource: repo://tests/unit/home-hero.test.tsx
  - id: openwiki-source-f5bb52b30eff93118a46d132
    resource: repo://tests/unit/home-sections.test.tsx
generated: { by: "claude-code", at: "2026-11-12T11:00:44.802Z" }
verified:
  - by: openwiki/0.4.3
    at: 2026-11-12T11:00:44.802Z
---

# Home page

`src/app/(frontend)/page.tsx` renders the home page (DESIGN.md, Layout: Home). It is a server component; its only client island is the hero's quest search. Its styles are in `src/components/home/home.css`.

## Sections

In order:

| Section | Component | What it shows |
|---|---|---|
| Live strip | `LiveStrip` | Only while Torre is live: the first thing under the header, one line on phones so the search stays on the first screen. Nothing otherwise |
| Hero | `Hero` | The name and what it is, a lead sentence, Torre asking which quest you are doing over the quest search, and the Krosmoz island with the six primordial Dofus around it, the main image on phones |
| What you will find | `Areas` | First a full-width missions card, four NPCs on the Astrub square with the counts of published guides and achievements; then Dofus guides, Checklists, Classes and Dungeons, in 2 × 2 with only the title on phones. Each card is one link, the text of its `h3`, with an `::after` covering the card; the sentence describes it through `aria-describedby`. Cards link where the header menu links, so the Dofus guides card goes to `/guias-dofus` (see [Dofus guides index and menu](../dofus-guides/dofus-guides-index.md)). Classes and Dungeons have no pages yet (`soon` on their section in `nav.ts`): their cards are plain `li.area--soon` with no link, the «Próximamente» tag (`Soon`) after the title, the art in grayscale at 55 percent and no hover effect |
| One guide per quest | `GuideTour` | Four points next to the real "Seis pies bajo tierra" guide in miniature, with the same numbers on each part. Where scroll-driven animations exist (`home.css`), the point crossing the middle of the screen frames its part, and so does hovering a point; with reduced motion, only the numbers |
| Checklists | `ChecklistsSection` | The three checklists of the menu, each with its egg and its figure |
| The author | `Author` | Torre's portrait, his sentence, one invitation (Discord) and whether he is live. Without a live, a small note about his channels; live, a headline with the link. The home page footer therefore does not repeat him or his channels |

## Data

- **Counts.** `loadSiteCounts()` (`src/app/(frontend)/site-data.ts`) is the same cached read the header uses, so the two never disagree. `countSiteGuides` (`src/lib/site/counts.ts`) counts, as a visitor (`overrideAccess: false`), published quest guides and achievement pages that are published and in state `published`, the same ones the metalogros index links. The read is cached with the `guide-pages` tag and the guide pages' 600-second `revalidate`.
- **Checklist figures.** `CHECKLIST_FIGURES` (`src/components/home/data.ts`) are copied by hand from the separate `silvestre-checklist` repo (100 and 70 steps, 337 souls) until the checklists move into the app.
- **Live state.** `liveState` (`src/lib/site/live.ts`) does not read Twitch yet, so Torre is never live. In development or the dev environment, `?directo=1` simulates it to see the page in that state; in production it does nothing.

## Hero search

The hero's form is server-rendered by `Hero`: `role="search"`, its label and help text, and `action` pointing at the legacy site's search (`legacyHref('search')`). Without JavaScript, submitting goes to the search on torrentearcano.com.

`HeroSearch` (`src/components/home/HeroSearch.tsx`) is the client island: the field (placeholder "Una misión o un logro") of a WAI-ARIA combobox with a listbox whose results float under it, so opening it, typing or loading never moves the page. The results panel (`.cbx`) drops in and out like a menu (DESIGN.md, Motion): it fades and slides 6 px with a slight scale, entering with `@starting-style` and leaving through a `display` transition with `allow-discrete`.

- **Lazy loading.** The result rows (`HeroResults.tsx`) and the search engine (`src/components/site/search.ts`) arrive with `import()` the first time the field gets focus, never on page load. The search index (guides, achievement pages and metalogros) is fetched then too. The engine and the index are shared with the header's search dialog: one request per page between the two (see [Site header, footer and search](site-shell-and-search.md)).
- **Matching.** One letter asks for another; from two letters `heroResults` (in `search.ts`) ranks the quests, the published achievement pages and the metalogros that open, the same groups as the header dialog without the menu, with the matches in `<mark>`, as text, never as `innerHTML`. An achievement in «En preparación» has no page and is not found. The status line counts each group ("1 misión · 1 logro").
- **Groups.** The listbox is named "Resultados". With one group the options are listed directly; with more than one, `HeroOptions` (`HeroResults.tsx`) wraps each in a `role="group"` labelled by its title (Misiones, Logros, Metalogros), the ARIA APG grouped-options pattern. Option ids run on across groups, so the arrow keys walk every option in the order shown. Groups go from best match to worst, quests first on a tie.
- **Keyboard.** The arrows move the active option; Enter opens it, and Enter with nothing chosen opens the first result. Enter while a new list is still loading opens the first result for what was typed, not one from the old list. Esc closes, a second Esc clears, and a click outside closes. With Ctrl, Cmd or the middle button a result opens in a new tab.
- **Errors.** If the index fails to load, the panel says so and the next focus retries.
- **Header button.** While the field is visible, the header's search button steps aside (`html.hs-on`).
- **Mobile.** The field rises under the header and the panel fits in what is visible above the keyboard.

`hero-search-strings.ts` (the field and option ids) is small on purpose and rides with the island; the result strings stay in the lazy chunk.

## Art

`src/components/home/art.ts` lists the home page art: static files in `public/img/inicio`, already in AVIF and WebP at the widths the layout asks for, with `srcSet` lists per format. Icons and eggs come from `public/img/game`.

`scripts/build-home-images.ts` generates those files once from the approved prototype's art, which is not in the repo: the Krosmoz island, the Astrub square map from DofusDB cropped to remove its mark, five NPC renders from `renderer.dofusdb.fr` facing both ways, the last room of the Crocantería and its boss, the step 1 screenshot of "Seis pies bajo tierra", DofusDB item icons and Torre's avatar. A width larger than the source is an error, because the file name and its `w` descriptor would lie. Usage: `node scripts/build-home-images.ts <prototype img folder>`.

## Budget

The home page sits close to its 150 KB JavaScript budget (about 149,700 bytes of script on 2026-11-07, per AGENTS.md), so it keeps work out of the initial load:

- The search rows and engine load on first focus, as above.
- `GuideTour` draws its own static coordinates chip instead of importing `CoordinatesChip`, which would bring `game.css` in as a render-blocking stylesheet.
- `Amount`, used in the counts, takes its styles from `globals.css` rather than `ui.css`.
- The Krosmoz island is the main image on phones: it is sized `85vw` below 64rem (it is drawn at 112% with masked edges), and the six orbs load with `fetchPriority="low"` so they do not compete with it.

Lighthouse CI measures `/`; see [Performance budgets](../testing/performance-budgets.md).

## Tests

- `tests/unit/home-hero.test.tsx`: the hero and its search island markup, and `HeroOptions` with one group (no titles) and several (titled groups, option ids continuing across them).
- `tests/unit/home-sections.test.tsx`: the other sections, including the Classes and Dungeons cards rendered without a link and with «Próximamente».
- `tests/unit/site-live.test.ts`: `liveState`.
- `tests/integration/site-counts.test.ts`: the counts as a visitor.
- `tests/e2e/inicio.spec.ts`: the hero; no index request on load, only on focus; one letter versus two; no layout shift; arrows and Enter, including a key pressed while a new list arrives; Esc and outside clicks; a click opening a quest; the load error and retry; published achievements found in their own titled group, a preparing one not found, and the arrows crossing from one group to the next; the header button stepping aside; axe (WCAG 2.2 AA) in every search state; Torre not moving on focus; the field and panel on mobile; no horizontal overflow; the missions card matching the header count; each card one link going where the menu goes, and the Classes and Dungeons cards showing «Próximamente» with no link; the guide tour framing; the checklists; the author; the compact footer; every image loading; axe on the whole page in both modes; the 2 × 2 cards on mobile.
