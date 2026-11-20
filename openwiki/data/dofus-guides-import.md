---
type: workflow
title: Importing Torre's Dofus guides
description: How pnpm import:dofus-guides reads each Dofus page of Torre's Squarespace site, links its achievements, quests and items, fetches missing items and video posters, and creates or updates the dofus-guides collection without overwriting what Torre changed in the panel.
tags: [import, dofus-guides, squarespace, dofusdb, media, scripts]
sources:
  - id: openwiki-source-5b54a58d1b51cd490b0e7162
    resource: repo://package.json
  - id: openwiki-source-f7d84855aad8bdfb59c0ef1e
    resource: repo://scripts/import/dofus-guides/catalog.ts
  - id: openwiki-source-9eabd2ef0ee39f79a722d607
    resource: repo://scripts/import/dofus-guides/game-items.ts
  - id: openwiki-source-6f669a13c3ec0c8888a74fdc
    resource: repo://scripts/import/dofus-guides/item-match.ts
  - id: openwiki-source-f5dea83b5bd0492c2fc34a39
    resource: repo://scripts/import/dofus-guides/load.ts
  - id: openwiki-source-37e439f86aa0a43e8b3ed81e
    resource: repo://scripts/import/dofus-guides/normalize-needs.ts
  - id: openwiki-source-ac018711da128fc07514c33a
    resource: repo://scripts/import/dofus-guides/parse.ts
  - id: openwiki-source-57afd4807f2f9a6a8043ebd7
    resource: repo://scripts/import/dofus-guides/site-links.ts
  - id: openwiki-source-61bf1eddda640c1ead1a37b6
    resource: repo://scripts/import/dofus-guides/video-poster.ts
  - id: openwiki-source-d669905ebde3b9714d879fbc
    resource: repo://scripts/import/import-dofus-guides.ts
  - id: openwiki-source-1abfe5162d75a295de07293c
    resource: repo://scripts/import/live-slugs.ts
  - id: openwiki-source-5405923907e430198e1340e6
    resource: repo://scripts/import/media-by-url.ts
  - id: openwiki-source-0d7ee8b23c7e115457b05c3b
    resource: repo://src/lib/site/site-links.ts
  - id: openwiki-source-aca8c5eca0bb9faed8b02eb3
    resource: repo://tests/integration/import-dofus-guides.test.ts
  - id: openwiki-source-97156998ae416ce7b748cfeb
    resource: repo://tests/integration/import-dofus-items.test.ts
generated: { by: "claude-code", at: "2026-11-20T11:20:16.585Z" }
verified:
  - by: openwiki/0.4.3
    at: 2026-11-20T11:20:16.585Z
---

# Importing Torre's Dofus guides

`pnpm import:dofus-guides` (`scripts/import/import-dofus-guides.ts`) seeds the `dofus-guides` collection and the intro of the `dofus-guides-index` global from Torre's current site. It reads one page per Dofus, turns it into fields and blocks, links what it can to existing records, and creates or updates each guide. It can run again later: a field Torre edited in the panel since the last run is left alone. The collection itself is described in [Dofus guide data model](../dofus-guides/dofus-guide-data.md).

```sh
pnpm import:dofus-guides                       # dry run against the local database: counts and warnings only
pnpm import:dofus-guides --apply               # writes
pnpm import:dofus-guides --from <dir> --apply  # reads <dir>/<slug>.html instead of downloading
```

Run it after `pnpm data:refresh` and `pnpm import:achievements`: it links achievement pages and quest guides that must already exist (see [DofusDB game data refresh](dofusdb-refresh.md) and [Importing Torre's achievement pages](achievements-import.md)).

## Database guard and dry run

Before Payload starts, the script checks `databaseScriptRefusal` (`src/lib/db/script-guard.ts`), the same guard as the achievement import: a remote `DATABASE_URL` needs `--remote` and production needs `--production`. An empty `DATABASE_URL` means the embedded `pnpm db:dev` database. `--from` without a folder prints the usage and exits with 1.

Without `--apply` nothing is written: no guide, no media file, no item. The item finder returns the negated DofusDB ID for an item it would import, and the media lookup returns 0 for a file it would upload; neither value is ever saved. The report still counts what would be created and updated.

## Pipeline

1. **Catalog.** `DOFUS_CATALOG` (`scripts/import/dofus-guides/catalog.ts`) lists every Dofus of Torre's `/guias-dofus` page in her order: slug (the same as on her site), name, whether her site has a page, tag (`primordial`, `event` or none), level, color, the DofusDB item ID of the Dofus, optional aliases and an optional checklist. It was copied from the guides embed manifest of silvestre-checklist. After the import, all of it is edited in the panel. `DOFUS_INDEX_INTRO` is the intro text of her index page.
2. **Download and parse.** For each entry with a page, the script fetches `https://www.torrentearcano.com/<slug>` (30 s timeout) or reads the local file, and `parseDofusGuide` (`scripts/import/dofus-guides/parse.ts`) turns the HTML into data: prerequisites, the Necesitarás groups (quantity, name and note per row, with the rows nested under another row), the intro, the achievements, metalogros and quests in order with the notes between them, the rewards, the YouTube video, the checklist banner and, for step-by-step guides such as the Piñata de pino, the body paragraphs and screenshots. Bold text and links are kept as segments. A page with no content returns null, and the Dofus stays `preparing`.

   The parser drops nothing Torre wrote. A Necesitarás row without «1 x» still keeps its name and note («Varita pitusa.»). A row with links (emotes, quests) is never an item. A second list inside a list item, whose title was lost on Torre's page (the Dorigami's «Combates:»), goes after the item at its level instead of under a heading that is not its own. In a quest list, a line that is neither a quest nor a link is kept as a note in its place and reported; a quest without a guide stays in the list without a link and is reported too.
3. **Game data for the groups.** Before loading, the script fetches DofusDB's job names and the achievements that «Logro:» rows name, so Necesitarás rows can be classified (below).
4. **Load.** `loadDofusGuides` (`scripts/import/dofus-guides/load.ts`) builds the guide's data and writes it (below). `loadDofusIndexIntro` writes Torre's intro into the global only when the global's intro is still empty.

## Matching

Names are compared after `fold`: lowercase, no accents, punctuation turned into spaces.

- **Quest guides**: by the slug Torre links, otherwise by folded title. For a set of alternatives the first one that matches wins.
- **Achievement pages**: by linked slug, otherwise by folded name. A matched achievement becomes a `dofusAchievement` part with `pageQuests: false` and `ownQuests`: the quest rows as Torre wrote them, in his order, each with its title (`rowTitle`: the text up to its last link, without his step number or final full stop), the guides it links (several when he joins alternatives) and its note. What is not a quest (how to do the achievement) goes after it as a note. The part keeps `link`, his link to the achievement, for when its page is «En preparación». When his list differs from the quests of the achievement page, the report lists both under "Misiones distintas".
- An achievement with no matching page does not lose its quests: it becomes a `dofusQuests` part titled with the achievement's name.
- **Quest lists** (`questBlocks`): quests with a guide become rows of a `dofusQuests` part in Torre's order; a line that links something that is not a quest stays as a row with its link; a line with neither becomes a `dofusNote` in its place and splits the list («Hazla antes de la siguiente:»).
- **Links to his own site** (`siteHref` in `scripts/import/dofus-guides/site-links.ts`, which applies the same rule the pages use at render time, `siteLinkHref` in `src/lib/site/site-links.ts`, and only stores relative links): a link such as `/emote-soltar-los-gases` stays relative when this site already answers that path (a reserved route, a source of the legacy redirect table that does not answer 410, or a slug in `liveSiteSlugs`, `scripts/import/live-slugs.ts`: published quest guides and checklists, and published achievement pages, Dofus guides and standalone pages that are not «En preparación»). Otherwise it points at the same path on Torre's Squarespace site, so it never leads to a 404. A rerun after that page exists turns the link relative again, unless Torre changed the field.
- **Necesitarás rows**: a row with a name becomes a `needItem` when `matchItem` finds the item, and otherwise stays as a `needNote` with Torre's text. A row with a quantity is a sure item, so a failed lookup stops the import. A row without a quantity is an item (quantity 1) only when exactly one game item has that name; if the DofusDB lookup fails it stays a note and the report lists it.

### Necesitarás groups

A Dofus guide's Necesitarás groups are a fixed list (`NEED_GROUPS` in `src/lib/dofus-guides/need-groups.ts`, see [Dofus guide data model](../dofus-guides/dofus-guide-data.md)). `normalizeNeeds` (`scripts/import/dofus-guides/normalize-needs.ts`) places each row with data, never by guessing, and keeps Torre's order inside each group:

1. An item goes by its DofusDB supertype (`itemGroup`: resources, equipables, consumables).
2. A note under a heading of Torre's that is already a group («Combates») goes to that group.
3. Otherwise a note goes by the game data: an achievement («Logro: …», or a known achievement name), a dungeon (it says «Mazmorra» or «Llave», or a DofusDB dungeon name; a boss's name is a fight), a fight (the combat word, or a monster or boss name) or a job («oficio», or a DofusDB job name).
4. A «1 x …» row that did not match an item stays a note, in the group of the other rows of the same list of Torre's.
5. Anything else goes to «Otros», and the import lists it.

A row with rows under it («1 x Mazmorra:», «Dependiendo de tu nivel:») is a subtitle: its rows stay together, with the subtitle above them, in the group most of them belong to, or in «Otros» when no group has more than half. With nested subtitles, the inner one is the subtitle and each outer one goes above it on its own line, in the same group («1 x Mazmorra:» over «Dependiendo de tu nivel:»), and a subtitle whose rows fall in several groups is reported. A heading of Torre's that is not a group («Recursos y otras movidas») becomes the subtitle of the group that takes most of its rows. Torre's note over all of Necesitarás goes above the groups.

Everything that does not match is listed in the report as "Sin casar" with its kind (achievement, quest or item).

## Items from DofusDB

`gameItems` (`scripts/import/dofus-guides/game-items.ts`) provides two lookups backed by the `items` collection and the DofusDB client:

- `ensureItem(dofusId)` returns the stored item with that DofusDB ID, or fetches it from DofusDB and creates it with its icon. The Dofus item of each guide goes through it.
- `matchItem(name)` looks for the exact name in the database; if there is none, it asks DofusDB for the name ignoring case and accents (`itemNamePattern`, a `$regex` with every vowel's accented variants and the rest escaped), keeping only rows whose folded name matches exactly. If nothing matches, it tries the singular forms of the name (`singularForms`: «Bananaranjas» → «Bananaranja») with the same rule, and records the match for the report. With several results it takes the lowest ID only when they are the same item (same name and type, `sameItem`); otherwise it returns null and logs that it will not guess. `findItem` returns just the Payload ID; the checklist import uses it too.

The database only holds the items quests use, so most Dofus and many Necesitarás items are new. Each lookup is memoized as a promise, so two rows with the same item never create it twice. An item already stored without an image (the quest refresh imports icons only for what quests need) gets its icon here, once, and the run logs it. Icons go through the same `gameImageImporter` as the DofusDB refresh.

## Media

- **Screenshots** in a step-by-step body are looked up in `media` by `originalUrl` and uploaded once through the Squarespace image fetcher, via the shared `mediaByUrl` (`scripts/import/media-by-url.ts`) that the achievement prose import also uses. In a dry run nothing is uploaded.
- **Video posters**: the page never asks YouTube for anything (DESIGN.md, Video facade). The import copies the `hqdefault.jpg` thumbnail (`posterUrl` in `scripts/import/dofus-guides/video-poster.ts`) into `media` once and stores it as `videoPoster`. The fetcher accepts only a YouTube-shaped ID, refuses redirects (they could lead to another host) and rejects non-image responses. A poster whose download fails (`ImageDownloadError`) is logged and the guide is saved without one; any other error, such as a database error, stops the import.

## Creating and re-running

The fields the import owns are listed in `IMPORTED_FIELDS`: the Dofus item, name, order (the catalog position), state, level, tag, color, aliases, prerequisites, needs, rewards, intro, parts, body, video, video poster, checklist and original URL. Everything else, and the slug, belongs to Torre.

- **New guide**: created as published, with `state: published` when Torre's page had content and `preparing` otherwise. The data the import wrote is saved in the hidden `importSnapshot` field.
- **Existing guide** (found by slug, drafts included): each imported field is compared with what is stored, after `comparable` removes row IDs, empty values and the defaults that fields added later give to what was already stored (`ADDED_DEFAULTS`: «Misiones de su página de logro» checked and an empty own quest list, which are not Torre's edits), and sorts keys (Postgres stores rich text as jsonb, which reorders keys).
  - Equal: nothing to do.
  - Different, and the stored value still equals the snapshot: Torre has not touched it, so the import writes the new value.
  - Different, and the stored value no longer equals the snapshot: Torre changed it in the panel. The import keeps it and the report lists it under "Se respeta lo que cambió Torre".
- A guide with no changes counts as unchanged and is not saved, so a rerun creates no new versions.
- If Torre has an unpublished draft, the update goes into that draft and is not published.

## Output

The script prints one line per guide (created, updated with the changed fields, or would be), then the totals of created, updated and unchanged guides, and:

- the fields Torre changed that were kept, the unmatched names and the quest list differences;
- the rows without a quantity that became items and the rows matched in the singular, only when the stored guide did not have that item yet;
- lookups that failed and left a row as a note;
- guides whose Necesitarás Torre changed in the panel, so it was not normalized;
- Necesitarás after normalizing, group by group with subtitles, the subtitles with rows from several groups, where each row went and why, and the rows that went to «Otros»;
- the quest list lines that became notes.

On an error it destroys Payload and exits with 1.

## Tests

- `tests/unit/import-dofus-normalize-needs.test.ts`, `import-dofus-item-match.test.ts` and `import-dofus-fold.test.ts`: the group placement, the item name matching (accents, singulars, doubts) and `fold`.
- `tests/unit/import-dofus-guide-parse.test.ts`: the parser on the saved pages in `tests/fixtures/dofus-guides/` (prerequisites, needs with quantities and groups, achievements and metalogros, alternatives, notes, video, the checklist banner, a step-by-step body, an empty page).
- `tests/integration/import-dofus-guides.test.ts`: the dry run writes nothing; a guide is created with its links; a Dofus without content stays `preparing`; a rerun with no changes touches nothing; a rerun keeps Torre's edits and updates the rest; the index intro is set only when empty.
- `tests/integration/import-dofus-items.test.ts`: a missing Dofus is fetched with its icon and reused; the dry run creates nothing; a stored item without an image gets its icon once; unknown IDs; lookup by name in the database and then in DofusDB.
- `tests/unit/import-video-poster.test.ts`: the poster URL, the download, and rejecting bad IDs and non-image responses.
