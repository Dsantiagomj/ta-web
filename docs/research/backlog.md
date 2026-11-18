# ta-web backlog

Date: 2026-11-16. First written on 2026-11-13 as one prioritized list built from three research reports written that day:

- **squarespace**: what Torre's Squarespace site has that ta-web does not, cited by report section (§).
- **duffus**: gaps against duffus.fr, which now has a full Spanish version at `/es` and competes for the same audience, cited by gap number (#) and a sample URL.
- **panel-audit**: the Payload admin audit for Torre, 29 findings, cited by finding number (#).

The raw reports stay in the git-ignored `tmp/work/` of the main checkout. Decisions already taken come from `docs/legacy/plan.md` (cited as plan §).

On 2026-11-15 every row was checked against `main`, the merged PRs and the dev site (https://ta-web-dev.up.railway.app). Rows that are fully done moved to section 7 with their IDs; the others carry a status. On 2026-11-16 the rows were checked again after #151 to #180.

## How to read it

Each row has an ID, used for cross-references and in PR descriptions.

| Column | Values |
|---|---|
| Owner | **Torre (panel)**: content he enters once the structure exists. **data**: from DofusDB or an import script. **code**: a feature or fix. A plus sign joins them, main owner first |
| Size | S (under a day), M (a few days), L (a week or more) |
| Pri | P0 blocks the cutover. P1 next, P2 after that, P3 when there is room |
| Source | The report and item the row comes from. Several sources mean duplicates merged into one row |
| Status | Partly done, In progress (a branch is open), Not started, or Blocked on Torre (it waits for his decision or his content). The evidence follows: a PR number, a file, or what dev answers |

The cutover is plan phase 3: the domain moves from Squarespace to ta-web, and Squarespace is cancelled 30 days later (plan §8.7 to §8.9). Every Squarespace URL must render or redirect on that day, so some content rows in section 3 are P0 too.

## 1. Cutover blockers

What must exist before the domain moves. The open P0 rows of section 3 (achievements, classes and dungeons) block it as well.

| ID | Item | What and why | Owner | Size | Pri | Source | Status |
|---|---|---|---|---|---|---|---|
| B-01 | Links that point at torrentearcano.com | `src/lib/site/legacy.ts` sends checklists, legal pages and the hidden classes and dungeons to `https://www.torrentearcano.com/<slug>`. Once DNS moves, those links point at ta-web itself and 404. Each one needs its page or its removal | code | S | P0 | squarespace §12 | Partly done. Checklists and Dofus guides link the ta-web page once it is published (#97, #148). `src/components/site/nav.ts` still sends the classes hub and the dungeons to Squarespace, and the legal pages go there while they are «En preparación» (B-10). The home search form's no-JS `action` is `torrentearcano.com/search` (`src/components/home/Hero.tsx`), and ta-web has no `/search` route. Torre's links in guide text go to the old site while their page is missing (`GuideRichText.tsx`, #148). Each closes with its page: S-10, S-11, B-10 |
| B-04 | Empty stubs | 301 to the stub's achievement page when one exists, 410 otherwise. Generate the map from DofusDB (quest to achievement) and give Torre the list | data | S | P0 | squarespace §9; plan §12.6 | Partly done. `pnpm redirects:stubs` (#110) maps the 166 stubs it finds; today 40 redirect (307 until cutover) and 35 answer 410. The rest wait for their achievement page (S-05) or a `STUB_OVERRIDES` entry. Rerun after each publishing batch, and with `--cutover` against production on cutover day |
| B-06 | Old hubs, test pages and `/cart` | 301 `/home`, `/index` and `/inicio-20` to `/`, and `/logros` to `/metalogros`. 410 for `/wip`, `/hielos-test`, `/pruebas`, the three `-datos` pages and `/cart`. `/subscribe` needs a 410 or a redirect until S-20 ships | code | S | P0 | squarespace §4, §7, §8; plan §12.8 | Partly done. Everything except `/subscribe` ships in #110; dev answers 301 for `/home` and 410 for `/cart`. `/subscribe` still answers 404 and stays out of the table until S-20 or Torre drops it (`AGENTS.md`, Redirects) |
| B-07 | GitHub Pages redirect | `dsantiagomj.github.io/silvestre-checklist/**`, embed URLs included, redirects to the new domain. The change lives in the `silvestre-checklist` repo | code | S | P0 | squarespace §12; plan §8.8 | Not started. Cutover-day work. The old repo now also serves `/todos/` and `/cosecha/` (S-21, S-04), so the redirect covers them too |
| B-08 | Old URL to new page map | Each Squarespace URL maps to the page that replaces it. We fill the map as each section is ported, so it grows with the S- items and is complete on cutover day | code | S | P0 | squarespace §12 | Partly done. The table (#110) has the `hubs`, `metalogros` and `stubs` sections. Quest guides, achievement pages, Dofus guides and checklists keep their slugs and need no row. Pages in the `pages` collection keep their slugs too (#152). Classes, dungeons and tools add their section as each is ported |
| B-10 | Legal pages rewrite | `/aviso-legal`, `/politica-de-cookies` and `/politica-de-privacidad` on B-09. The cookie policy still describes ads and a cookie banner, and the privacy policy has to cover accounts and payments | Torre (panel) | M | P0 | squarespace §8; plan §6 | Blocked on Torre. The three pages are in `pages` with his old text, «En preparación» (#155); dev answers 307 to Squarespace for each. He rewrites and publishes them |
| B-13 | Fate of the inline tools | `/mascotas`, `/team-builder` and `/sets-y-clases` are HTML apps inside a code block. Torre decides which ones stay. Those get ported (S-13), the rest a 410 | Torre | S | P0 | squarespace §7 | Blocked on Torre. No decision yet; the three URLs answer 404 on dev |

## 2. Payload panel for Torre

All 23 rows (A-01 to A-23) are done; they are in section 7. Panel work since then comes from Torre's use of it, not from the audit. Merged since: block previews in the block picker (#151), DofusDB autofill only on create or on request (#165), «Corrección de Torre» on DofusDB data (#167), the missing fields so Torre can write everything (#168), reward fields that are his (#169, #175 to #180), redirects when a slug changes (#170), the weekly data refresh with its «Traer ahora» button (#172), and the «Ajustes del sitio» and «Portada e índices» globals (#173, #174).

| ID | Item | What and why | Owner | Size | Pri | Source | Status |
|---|---|---|---|---|---|---|---|
| P-01 | Navigation menu in the panel | The menu sections (name, description, order, hidden, «Próximamente») and the three featured Dofus are hard-coded in `src/components/site/nav.ts`. A «Navegación» global under «Ajustes» moves them to the panel. Keys, links, icons and colors stay in code | code | M | P1 | Owner request, 2026-11-16 | In progress on a branch |

## 3. Content still to port from Squarespace

Quest guides are ported: 1,271 of 1,272, and the last one is now a Dofus guide. All 30 Dofus guides are on dev, 9 of them «En preparación» (S-22). The four checklists are ported and published (S-01 to S-04, section 7). Rows marked P0 are Squarespace URLs that would otherwise 404 on cutover day.

### Checklists

| ID | Item | What and why | Owner | Size | Pri | Source | Status |
|---|---|---|---|---|---|---|---|
| S-21 | Rush de todos los Dofus | Added on 2026-11-15. The `silvestre-checklist` repo now has a fifth checklist: Sandglass's 200 steps through 26 Dofus up to the Vulbis, at `/todos/` there. Squarespace has no page for it yet (the old repo plans `/checklist-todos-dofus`). Add it to `scripts/import/checklists/catalog.ts` and check that its steps fit the schema | Torre (panel) | M | P1 | `silvestre-checklist` README | Blocked on Torre. The import (#158) and the page's road of Dofus and crown (#166) are merged. On dev it is a draft «En preparación» and `/checklist-todos-dofus` answers 404 until he reviews and publishes it. Its quests have no Bonta or Brâkmar side (`sides: null`), so the side switch of the old global guide is not needed |

### Dofus guides

| ID | Item | What and why | Owner | Size | Pri | Source | Status |
|---|---|---|---|---|---|---|---|
| S-22 | Nine Dofus guides «En preparación» | Added on 2026-11-15. Jyfus, Kalipto, Dolmanax, Dotruz, Dofzzbz, Forjalava, Centelleante, Pesadilla and Silvestre are empty shells on Squarespace. On dev they answer 404 and show as «En preparación» on `/guias-dofus`. Torre writes them, or decides what their old URLs answer on cutover day (B-08) | Torre (panel) | M | P1 | Dofus guides audit, 2026-11-15 | Blocked on Torre |

### Achievements and metalogros

| ID | Item | What and why | Owner | Size | Pri | Source | Status |
|---|---|---|---|---|---|---|---|
| S-05 | Pages still «En preparación» | They render on Squarespace and 404 on dev (`/novatada`, `/correccional`, `/formacion-practica`…). Torre reviews each and flips `state` | Torre (panel) | S | P0 | squarespace §2 | Blocked on Torre. On 2026-11-15, 19 of the 223 achievement pages are «En preparación» on dev; `/novatada`, `/correccional` and `/formacion-practica` answer 404. Each publishing batch lets B-04 redirect more stubs |
| S-06 | 22 Alineamiento achievements | DofusDB lists no quests for them, and the refresh only creates pages for achievements with quests. Create them from Torre's lists (`/en-guardia`, `/poner-orden`…), then Torre reviews | data + Torre (panel) | M | P0 | squarespace §2 | Not started. `/en-guardia` and `/poner-orden` have no page on dev |
| S-08 | Metalogro Krosmoz and three loose pages | Create the Krosmoz metalogro and attach its guides. `/logro-misiones-extra-de-vulkania`, `/el-guardian-del-puente-de-la-muerte` and `/el-caballero-negro-y-rosa` are not DofusDB achievements and need a shape, loose guide or quest guide | Torre (panel) | S | P0 | squarespace §2 | Not started. Dev has no Krosmoz achievement group and `/metalogro-krosmoz` answers 404. The shape of the three loose pages is Torre's call |

### Classes and dungeons

| ID | Item | What and why | Owner | Size | Pri | Source | Status |
|---|---|---|---|---|---|---|---|
| S-10 | Classes | A collection (or B-09), the route and the `/clases-1` hub for 19 pages. 17 are build screenshots under PVM and PVP; `/yopuka-1` and `/selotrop` have long text. About 150 images. Decide whether the `-1` slugs stay or get a 301. Spell data comes later (D-07) | code + Torre (panel) | M | P0 | squarespace §5; duffus #10 | In progress on a branch: the panel collection, an importer that brings each page as «En preparación», and menu links from the collection. The public page and the hub wait on a prototype. `/clases-1` and `/yopuka-1` answer 404 on dev, and the menu links Squarespace |
| S-11 | Dungeons and bosses | A collection (or B-09), route and index. Six pages have content (`/mazmorra-templo-del-dios-kao`, `/mazmorra-crunchidor`, `/pikabeto`, `/mazmorras-de-nawidad`, `/gruente`, `/minotobola-de-nawidad`), five are 36-word placeholders. Monsters reuse the fight block; DofusDB stats come later (D-06) | code + Torre (panel) | M | P0 | squarespace §6; duffus #9 | In progress on a branch: a page collection beside the DofusDB `dungeons` data (`src/collections/Dungeons.ts`, #98), an importer that brings each page as «En preparación», and menu links from the collection. The public page and the index wait on a prototype |

### Other pages

| ID | Item | What and why | Owner | Size | Pri | Source | Status |
|---|---|---|---|---|---|---|---|
| S-13 | Inline tools as native pages | The tools B-13 keeps become React islands, as plan §8.6 says. About M each, so L for all three | code | L | P1 | squarespace §7 | Blocked on Torre. Waits for B-13 |
| S-14 | 17 guides without a DofusDB quest | They get no summary from DofusDB. Link a quest where one exists; the how-to pages are expected to have none | Torre (panel) | S | P2 | squarespace §1 | Not started |
| S-15 | Golden-page import test | Nobody compared the guides block by block. The planned `pnpm test:import` checks 30 golden pages against Squarespace before the delta import | code | M | P1 | squarespace §1; plan §8.1 | In review (#211). `pnpm test:import` pins 30 golden pages across the six Squarespace converters, reviewed against the live site on 2026-11-18 (`tests/fixtures/import-golden/README.md`), and runs in CI as «Importación». `pnpm import:golden-refresh` re-downloads them before the delta import. The converter bugs it found are listed in its PR |

### Site-wide features

| ID | Item | What and why | Owner | Size | Pri | Source | Status |
|---|---|---|---|---|---|---|---|
| S-17 | Twitch live card | `src/lib/site/live.ts` is a stub that is never live. Call the existing Cloudflare Worker | code | S | P1 | squarespace §10 | Not started. `src/lib/site/live.ts` is still the stub |
| S-18 | Analytics | Plausible or Umami, cookieless. Before cutover, so traffic can be compared with Squarespace | code | S | P1 | squarespace §10; plan §4 | Site side done: self-hosted Umami, our own inline tracker, off until `UMAMI_HOST` and `UMAMI_WEBSITE_ID` are set in production (`AGENTS.md`, Analytics). Pending: the Umami service on Railway and the owner's one-time setup |
| S-19 | `og:image` and richer JSON-LD | Shared links show no image, and only breadcrumbs have JSON-LD. Add `og:image` and Article or HowTo data | code + Torre (panel) | S | P1 | squarespace §12 | Partly done. «Ajustes del sitio» has a share image field (#173), but dev has none uploaded, so pages still have no `og:image`. The only JSON-LD is the breadcrumb (`src/components/site/Breadcrumb.tsx`); Article or HowTo data is not started |
| S-20 | Newsletter | The plan names a newsletter but no provider. Pick one, then a form for `/subscribe`. There is no subscriber list to bring over | code + Torre | M | P2 | squarespace §10 | Not started |
| S-23 | Weekly game data refresh in production | `pnpm data:refresh` runs every Wednesday at 06:00 UTC on dev through the `game-data` cron service (#172; `railway config apply` on 2026-11-16). Production has no GitHub source, so its service has to come from the release workflow | code | S | P1 | #172 | In review. `.railway/railway.ts` declares `game-data` in production too and `release.yml` deploys it with `railway up` after the web, on the same tag. Waits for the owner's one-time `railway config apply --environment production` (`AGENTS.md`, Deploys) and the next release |

## 4. New features inspired by duffus.fr

Duffus covers most of the game in machine-translated Spanish. What it lacks is Torre: a named author, videos, opinions and his checklists. These rows favor features that add to his guides over bulk data pages.

| ID | Item | What and why | Owner | Size | Pri | Source | Status |
|---|---|---|---|---|---|---|---|
| D-01 | Member accounts and cloud progress | Plan phase 4. Google, Discord and magic link; one progress set per member, so a quest ticked anywhere shows done in guides, achievements, Dofus guides and checklists, with a percentage on the Dofus index cards. Offers to import the `localStorage` of the checklists (needs S-02) | code | L | P1 | duffus #1, #2 ([/es/guias](https://www.duffus.fr/es/guias)); squarespace §11; plan §6 | Not started. Better Auth is not installed yet |
| D-02 | Articles with a table block | Tutorials and event guides (duffus has a 146-row pets table) are Torre's natural format. B-09 plus a table block, then Torre writes | code + Torre (panel) | S | P1 | duffus #23 ([/tutoriels/familiers](https://www.duffus.fr/tutoriels/familiers)) | Not started. B-09 is done (#152); `src/blocks/` has no table block |
| D-03 | «Actualizado el» date | Show when a guide last changed. Payload already stores `updatedAt`; it is a trust signal and helps SEO | code | S | P1 | duffus #25 | Not started |
| D-04 | Quest overlay | A Document Picture-in-Picture window that floats over the game with the steps, «Necesitarás» and coordinates. Chromium only, with a popup window elsewhere. The most distinctive idea in the duffus report; plan §6 lists overlay extras as a premium candidate | code | M | P2 | duffus #3 ([quest page](https://www.duffus.fr/es/mision/gobstination-dun-grobelin)) | Not started |
| D-05 | Quest list page | Find a quest by name, zone or achievement and filter by type. "Hide done" comes with D-01 | code + data | M | P2 | duffus #5 ([/es/misiones](https://www.duffus.fr/es/misiones)) | Not started |
| D-06 | Dungeon data | Position, recommended level, monsters, boss stats per grade and drops from DofusDB for every dungeon, under Torre's mechanic notes on S-11 pages | data + code | L | P2 | duffus #9 ([/donjon/chateau-ensable](https://www.duffus.fr/donjon/chateau-ensable)) | Partly done. DofusDB dungeons with bosses and level are stored (`src/collections/Dungeons.ts`, #98). Position, boss stats and drops are not, and there is no page to show them (S-11) |
| D-07 | Class spells | Every spell by level with cost, range and effects from DofusDB, on the S-10 class pages. The data is commodity; Torre's take is the difference | data | M | P2 | duffus #10 ([/es/clases](https://www.duffus.fr/es/clases)) | Not started |
| D-08 | Dofus guide counts and items tab | Counts of prerequisites, quests and dungeons on index cards, the level range and one aggregated «Necesitarás» | data + code | M | P2 | duffus #7 ([/guide/dofus-ocre](https://www.duffus.fr/guide/dofus-ocre)) | Partly done. Dofus guide pages show Torre's «Necesitarás» in fixed groups (#135) with each dungeon's boss (#142). Counts and the level range on the index cards are not started |
| D-09 | Achievement page extras | Rewards with an "include quests" toggle and the resources the achievement needs | data + code | M | P2 | duffus #8 ([/es/logros/service-dans-la-milice](https://www.duffus.fr/es/logros/service-dans-la-milice)) | Partly done. Achievement pages show the rewards and «Necesitarás en total» across their quests (#88, #137, #139). The "include quests" toggle is not started |
| D-10 | Almanax | Today's offering and bonus, a calendar and a purchase list for a date range. A reason to visit daily | data + code | M | P2 | duffus #13 ([/almanax](https://www.duffus.fr/almanax)) | Not started |
| D-11 | Archmonster tracker | Per character, with soul stones and sort by zone, on top of La eterna cosecha (S-04) and accounts (D-01). Duffus also has an exchange board, which needs a community to work | code + data | L | P2 | duffus #11 ([/archimonstres](https://www.duffus.fr/archimonstres)) | Not started. The souls checklist (S-04) exists; a tracker per character needs D-01 |
| D-12 | Site-wide search | Postgres full text, as planned, over guides, achievements, classes and dungeons, opened with Ctrl/⌘K | code | M | P2 | duffus #15; plan §4 | Partly done. The header search opens with Ctrl/⌘K or `/` and covers quest guides, achievement pages and metalogros from a JSON index (`src/endpoints/search-index.ts`). Dofus guides, checklists and Postgres full text are not started |
| D-13 | Drop calculator | Base rate, prospecting and bonuses give the chance per fight and after N fights. Cheap | code | S | P2 | duffus #19 ([/es/calculadora-drop](https://www.duffus.fr/es/calculadora-drop)) | Not started |

## 5. Later or low priority

| ID | Item | What and why | Owner | Size | Pri | Source | Status |
|---|---|---|---|---|---|---|---|
| L-01 | Compact mode | A denser quest page. `AGENTS.md` makes view modes a premium entitlement, so it waits for plan phase 5 | code | S | P3 | duffus #26 | Not started |
| L-02 | Game version stamp | «Datos: DOFUS 3.x» in the footer, taken from the last DofusDB refresh | data | S | P3 | duffus #27 | Not started |
| L-03 | Wanted posters | 82 posters with stats, mechanics and a captured flag. The `se-busca-*` stubs are redirected or gone after B-04 and could become these pages later | data + Torre (panel) + code | M | P3 | duffus #12 ([/avis-de-recherche/sam-sagaz](https://www.duffus.fr/avis-de-recherche/sam-sagaz)) | Not started |
| L-04 | Build library | Only worth it if Torre publishes builds. Editorial work for him | Torre (panel) + code | M | P3 | duffus #22 | Not started |
| L-05 | Craft shopping list | Pick items, get the resources they need | code + data | M | P3 | duffus #17 | Not started |
| L-06 | A page per DofusDB quest | Duffus wins on volume (627 generated quest pages). A generated summary per quest could link Torre's guide when one exists, but it risks thin-content SEO and dilutes his guides | data + code | L | P3 | duffus #4 | Not started |
| L-07 | Full progression guide | 1,092 quests by level band, with chapters and tips. A large editorial job for Torre, worth it once D-01 exists | Torre (panel) + code | L | P3 | duffus #6 ([/es/guia-completa](https://www.duffus.fr/es/guia-completa)) | Not started |
| L-08 | Item, monster and set pages | Useful as link targets from guides, but DofusDB already has them in Spanish | data + code | L | P3 | duffus #14 | Not started |
| L-09 | Comments | Empty on duffus, and moderation would land on Torre | code + Torre | M | P3 | duffus #24 | Not started |
| L-10 | Discord bot | Almanax reminders and news fit a bot better than the site | code | M | P3 | duffus #30 | Not started |
| L-11 | Theorycraft tools | World map, job XP simulator, breeding tracker, stuff builder and skinator. Other sites own these, and they stray from a guide site. Each is M to L | code + data | L | P3 | duffus #16, #18, #20, #21, #28 | Not started |

## 6. Dropped on purpose

These rows need no owner, size or priority. The redirects for their URLs are in section 1.

| Item | Why | Source |
|---|---|---|
| Ads: AdSense, Flower Ads, the AMP script, Seedtag | Removed; revenue comes from premium and Ko-fi (plan §6, §12.2). | squarespace §10 |
| Announcement bar | Dropped by the owner on 2026-11-16: the new site has no ads (was part of S-16) | squarespace §10 |
| Cookie banner | No ads and cookieless analytics need no consent banner (plan §4, Consent) | squarespace §10 |
| Store and `/cart` | The store was never live and is removed; `/cart` gets a 410 (plan §12.8) | squarespace §8, §10 |
| The three `-datos` pages and the daily guide sync | They feed the embeds, which retire at cutover (plan §2, Embeds; goal 2) | squarespace §4 |
| Test copies: `/hielos-test`, `/inicio-20`, `/pruebas` | Duplicates of the home, an embed and the team builder; redirected or gone (plan §8.8) | squarespace §4, §7 |
| `/index`, `/home`, `/logros`, `/wip` | Superseded by `/` and `/metalogros`, or placeholders (plan §8.8) | squarespace §8 |
| 157 empty stubs | Verified empty, not imported (plan §3, §12.6) | squarespace §9 |
| Standalone metalogro pages | A metalogro is a panel of `/metalogros` by design (`openwiki/achievements/achievement-page.md`); B-05 redirects the old URLs | squarespace §2 |
| French and English versions | Spanish only at launch, with localization ready for more (plan §12.7) | duffus #29 |

## 7. Done

Rows finished since 2026-11-13, with the PR that closed each one. Stacked PRs closed without merging; the PR named first is the one that brought the commits to `main`.

| ID | Item | Owner | Done in |
|---|---|---|---|
| B-02 | `/sitemap.xml` | code | #110. Dev answers 200 and lists the published checklists |
| B-03 | Redirect table | code | #110. `src/lib/redirects/legacy-urls.json`, read once by `src/proxy.ts` |
| B-05 | Metalogro URLs | code | #110. On dev `/metalogro-astrub` answers 301 to `/metalogros#astrub`. `/metalogro-krosmoz` joins the table when S-08 creates that metalogro |
| A-01 | One «Estado», not two | code | #112 |
| A-02 | Dates, editor placeholder, array labels | code | #112 |
| A-03 | Navigation order | code | #112 |
| A-04 | Hide the API tab and the locale switch | code | #112 |
| A-05 | Media upload form | code | #112 |
| A-06 | List search and columns | code | #112 |
| A-07 | «Slug» becomes «Dirección en la web» | code | #112 |
| A-08 | Step ID out of the way | code | #112 |
| A-09 | Row labels | code | #112 |
| A-10 | Site branding on the panel | code | #112 |
| A-11 | Arcano colors | code | #112 |
| A-12 | `originalUrl` read-only | code | #112 |
| A-13 | «Pendiente» dashboard | code | #124 (stacked #116) |
| A-14 | «Guía del panel» | code + Torre | #124 (stacked #118) |
| A-15 | Roles | code | #117, approved by the owner on 2026-11-13 |
| A-16 | Publish status in plain words | code | #124 (stacked #114) |
| A-17 | Block deletes of referenced records | code | #117. Known gap: an image inside rich text outside achievement pages is not counted |
| A-18 | Long checklists | code | #125 (stacked #123) |
| A-19 | Step and objective pickers | code | #125 |
| A-20 | Live preview sizes | code | #124 (stacked #114) |
| A-21 | Panel accessibility | code | #124. axe passes with no exceptions on the five pages, light and dark |
| A-22 | Tabs in long forms | code | #124 (stacked #120) |
| A-23 | Lock fields that break data | code | #117 |
| S-01 | Nebuloso checklist page | code + Torre (panel) | #96. Published; `/checklist-nebuloso` answers 200 on dev |
| S-02 | Progress, locking and weighted percentage | code | #109 (engine, page, migration of the old `localStorage`), #125 (Silvestre progress) |
| S-03 | Checklist index and menu | code | #97, then the poster row in #134, #136 and #138 |
| S-04 | Silvestre, Hielos and La eterna cosecha | data + Torre (panel) | Silvestre and Hielos in #125; La eterna cosecha is the Ocre souls checklist, `/lista-ocre` (#127, #131, #147). All four checklists are published on dev on 2026-11-15; on 2026-11-16 `/checklist-silvestre` and `/checklist-dofus-de-los-hielos` answer 200 |
| S-07 | Torre's prose and 11 videos | code + Torre (panel) | #111 (`pnpm import:achievement-prose`); 30 pages have an `outro` on dev. Left for Torre: the dungeon rows with a generic icon that `pnpm data:quests` lists |
| S-09 | «Necesitarás en total» fix | code | #98, #104, #129, #137; the same bosses on Dofus guides in #142 |
| B-09 | Generic pages collection | code | #152 (collection and public page), #155 (`pnpm import:pages`) |
| S-12 | Emotes and how-tos | Torre (panel) | #155. The five pages and `/weyes-magos` are published on dev and answer 200; whether `/weyes-magos` duplicates `/ayudar-a-los-weyes-magos` is still unchecked |
| S-16 | Site settings global | code + Torre (panel) | #173, #174: share image, footer, socials and the Ko-fi link in «Ajustes del sitio», home and index texts in «Portada e índices». The menu moved to P-01, the Twitch card is S-17, and the announcement bar was dropped (section 6) |
