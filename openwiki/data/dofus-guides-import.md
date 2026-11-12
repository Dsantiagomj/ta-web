---
type: workflow
title: Importing Torre's Dofus guides
description: How pnpm import:dofus-guides reads each Dofus page of Torre's Squarespace site, links its achievements, quests and items, fetches missing items and video posters, and creates or updates the dofus-guides collection without overwriting what Torre changed in the panel.
tags: [import, dofus-guides, squarespace, dofusdb, media, scripts]
verified:
  - by: openwiki/0.4.3
    at: 2026-11-12T11:00:44.802Z
sources:
  - id: openwiki-source-5b54a58d1b51cd490b0e7162
    resource: repo://package.json
  - id: openwiki-source-f7d84855aad8bdfb59c0ef1e
    resource: repo://scripts/import/dofus-guides/catalog.ts
  - id: openwiki-source-9eabd2ef0ee39f79a722d607
    resource: repo://scripts/import/dofus-guides/game-items.ts
  - id: openwiki-source-f5dea83b5bd0492c2fc34a39
    resource: repo://scripts/import/dofus-guides/load.ts
  - id: openwiki-source-ac018711da128fc07514c33a
    resource: repo://scripts/import/dofus-guides/parse.ts
  - id: openwiki-source-61bf1eddda640c1ead1a37b6
    resource: repo://scripts/import/dofus-guides/video-poster.ts
  - id: openwiki-source-d669905ebde3b9714d879fbc
    resource: repo://scripts/import/import-dofus-guides.ts
  - id: openwiki-source-aca8c5eca0bb9faed8b02eb3
    resource: repo://tests/integration/import-dofus-guides.test.ts
  - id: openwiki-source-97156998ae416ce7b748cfeb
    resource: repo://tests/integration/import-dofus-items.test.ts
generated: { by: "claude-code", at: "2026-11-12T11:00:44.802Z" }
---

# Importing Torre's Dofus guides

`pnpm import:dofus-guides` (`scripts/import/import-dofus-guides.ts`) seeds the `dofus-guides` collection and the intro of the `dofus-guides-index` global from Torre's current site. It reads one page per Dofus, turns it into fields and blocks, links what it can to existing records, and creates or updates each guide. It can run again later: a field Torre edited in the panel since the last run is left alone. The collection itself is described in [Dofus guide data model](../dofus-guides/dofus-guide-data.md).

```sh
pnpm import:dofus-guides                       # dry run against the local database: counts and warnings only
pnpm import:dofus-guides --apply               # writes
pnpm import:dofus-guides --from <dir> --apply  # reads <dir>/<slug>.html instead of downloading
```

Run it after `pnpm data:quests` and `pnpm import:achievements`: it links achievement pages and quest guides that must already exist (see [DofusDB game data refresh](dofusdb-refresh.md) and [Importing Torre's achievement pages](achievements-import.md)).

## Database guard and dry run

Before Payload starts, the script checks `databaseScriptRefusal` (`src/lib/db/script-guard.ts`), the same guard as the achievement import: a remote `DATABASE_URL` needs `--remote` and production needs `--production`. An empty `DATABASE_URL` means the embedded `pnpm db:dev` database. `--from` without a folder prints the usage and exits with 1.

Without `--apply` nothing is written: no guide, no media file, no item. The item finder returns the negated DofusDB ID for an item it would import, and the media lookup returns 0 for a file it would upload; neither value is ever saved. The report still counts what would be created and updated.

## Pipeline

1. **Catalog.** `DOFUS_CATALOG` (`scripts/import/dofus-guides/catalog.ts`) lists every Dofus of Torre's `/guias-dofus` page in her order: slug (the same as on her site), name, whether her site has a page, tag (`primordial`, `event` or none), level, color, the DofusDB item ID of the Dofus, optional aliases and an optional checklist. It was copied from the guides embed manifest of silvestre-checklist. After the import, all of it is edited in the panel. `DOFUS_INDEX_INTRO` is the intro text of her index page.
2. **Download and parse.** For each entry with a page, the script fetches `https://www.torrentearcano.com/<slug>` (30 s timeout) or reads the local file, and `parseDofusGuide` (`scripts/import/dofus-guides/parse.ts`) turns the HTML into data: prerequisites, the Necesitarás groups (quantity, name and note per row), the intro, the achievements, metalogros and quests in order with the notes between them, the rewards, the YouTube video, the checklist banner and, for step-by-step guides such as the Piñata de pino, the body paragraphs and screenshots. Bold text and links are kept as segments. A page with no content returns null, and the Dofus stays `preparing`.
3. **Load.** `loadDofusGuides` (`scripts/import/dofus-guides/load.ts`) builds the guide's data and writes it (below). `loadDofusIndexIntro` writes Torre's intro into the global only when the global's intro is still empty.

## Matching

Names are compared after `fold`: lowercase, no accents, punctuation turned into spaces.

- **Quest guides**: by the slug Torre links, otherwise by folded title. For a set of alternatives the first one that matches wins.
- **Achievement pages**: by linked slug, otherwise by folded name. When the quest list Torre wrote for an achievement differs from the quests of its achievement page, the report lists both under "Misiones distintas". The page's own quests are what the public page shows.
- An achievement with no matching page does not lose its quests: it becomes a `dofusQuests` part titled with the achievement's name.
- **Necesitarás rows**: a row with a quantity and a name becomes a `needItem` when `findItem` finds the item; otherwise the row stays as a `needNote` with Torre's text. A row like "1 x Mazmorra:" with options under it becomes its own named group.

Everything that does not match is listed in the report as "Sin casar" with its kind (achievement, quest or item).

## Items from DofusDB

`gameItems` (`scripts/import/dofus-guides/game-items.ts`) provides two lookups backed by the `items` collection and the DofusDB client:

- `ensureItem(dofusId)` returns the stored item with that DofusDB ID, or fetches it from DofusDB and creates it with its icon. The Dofus item of each guide goes through it.
- `findItem(name)` looks for the exact name in the database (lowest DofusDB ID first), then asks DofusDB for the exact Spanish name, then for a case-insensitive exact match (`fetchWhere` with an escaped `$regex`). With several results it takes the lowest ID.

The database only holds the items quests use, so most Dofus and many Necesitarás items are new. Each lookup is memoized as a promise, so two rows with the same item never create it twice. An item already stored without an image (the quest refresh imports icons only for what quests need) gets its icon here, once, and the run logs it. Icons go through the same `gameImageImporter` as the DofusDB refresh.

## Media

- **Screenshots** in a step-by-step body are looked up in `media` by `originalUrl` and uploaded once through the Squarespace image fetcher.
- **Video posters**: the page never asks YouTube for anything (DESIGN.md, Video facade). The import copies the `hqdefault.jpg` thumbnail (`posterUrl` in `scripts/import/dofus-guides/video-poster.ts`) into `media` once and stores it as `videoPoster`. The fetcher accepts only a YouTube-shaped ID, refuses redirects (they could lead to another host) and rejects non-image responses. A poster that fails is logged and the guide is saved without one.

## Creating and re-running

The fields the import owns are listed in `IMPORTED_FIELDS`: the Dofus item, name, order (the catalog position), state, level, tag, color, aliases, prerequisites, needs, rewards, intro, parts, body, video, video poster, checklist and original URL. Everything else, and the slug, belongs to Torre.

- **New guide**: created as published, with `state: published` when Torre's page had content and `preparing` otherwise. The data the import wrote is saved in the hidden `importSnapshot` field.
- **Existing guide** (found by slug, drafts included): each imported field is compared with what is stored, after `comparable` removes row IDs and empty values and sorts keys (Postgres stores rich text as jsonb, which reorders keys).
  - Equal: nothing to do.
  - Different, and the stored value still equals the snapshot: Torre has not touched it, so the import writes the new value.
  - Different, and the stored value no longer equals the snapshot: Torre changed it in the panel. The import keeps it and the report lists it under "Se respeta lo que cambió Torre".
- A guide with no changes counts as unchanged and is not saved, so a rerun creates no new versions.
- If Torre has an unpublished draft, the update goes into that draft and is not published.

## Output

The script prints one line per guide (created, updated with the changed fields, or would be), then the totals of created, updated and unchanged guides, the fields kept, the unmatched names and the quest list differences. On an error it destroys Payload and exits with 1.

## Tests

- `tests/unit/import-dofus-guide-parse.test.ts`: the parser on the saved pages in `tests/fixtures/dofus-guides/` (prerequisites, needs with quantities and groups, achievements and metalogros, alternatives, notes, video, the checklist banner, a step-by-step body, an empty page).
- `tests/integration/import-dofus-guides.test.ts`: the dry run writes nothing; a guide is created with its links; a Dofus without content stays `preparing`; a rerun with no changes touches nothing; a rerun keeps Torre's edits and updates the rest; the index intro is set only when empty.
- `tests/integration/import-dofus-items.test.ts`: a missing Dofus is fetched with its icon and reused; the dry run creates nothing; a stored item without an image gets its icon once; unknown IDs; lookup by name in the database and then in DofusDB.
- `tests/unit/import-video-poster.test.ts`: the poster URL, the download, and rejecting bad IDs and non-image responses.
