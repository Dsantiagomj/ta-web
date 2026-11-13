# ta-web backlog

Date: 2026-11-13. One prioritized list built from three research reports written the same day:

- **squarespace**: what Torre's Squarespace site has that ta-web does not, cited by report section (§).
- **duffus**: gaps against duffus.fr, which now has a full Spanish version at `/es` and competes for the same audience, cited by gap number (#) and a sample URL.
- **panel-audit**: the Payload admin audit for Torre, 29 findings, cited by finding number (#).

The raw reports stay in the git-ignored `tmp/work/` of the main checkout. Decisions already taken come from `docs/legacy/plan.md` (cited as plan §).

One correction to the Squarespace report: it says Nebuloso is not on dev. It is. `pnpm import:checklists` loaded it on 2026-11-13 as a draft, and the public REST API the report queried hides drafts.

## How to read it

Each row has an ID, used for cross-references and in PR descriptions.

| Column | Values |
|---|---|
| Owner | **Torre (panel)**: content he enters once the structure exists. **data**: from DofusDB or an import script. **code**: a feature or fix. A plus sign joins them, main owner first |
| Size | S (under a day), M (a few days), L (a week or more) |
| Pri | P0 blocks the cutover. P1 next, P2 after that, P3 when there is room |
| Source | The report and item the row comes from. Several sources mean duplicates merged into one row |

Rows marked "In progress" already have a branch or a PR plan. The cutover is plan phase 3: the domain moves from Squarespace to ta-web, and Squarespace is cancelled 30 days later (plan §8.7 to §8.9). Every Squarespace URL must render or redirect on that day, so some content rows in section 3 are P0 too.

## 1. Cutover blockers

What must exist before the domain moves. The P0 rows of section 3 (checklists, achievements, classes, dungeons, emotes and how-tos) block it as well.

| ID | Item | What and why | Owner | Size | Pri | Source |
|---|---|---|---|---|---|---|
| B-01 | Links that point at torrentearcano.com | `src/lib/site/legacy.ts` sends checklists, legal pages and the hidden classes and dungeons to `https://www.torrentearcano.com/<slug>`. Once DNS moves, those links point at ta-web itself and 404. Each one needs its page or its removal | code | S | P0 | squarespace §12 |
| B-02 | `/sitemap.xml` | Answers 404 on dev. The plan wants a sitemap and canonical URLs from day one, for Search Console | code | S | P0 | squarespace §12; plan §8.8 |
| B-03 | Redirect table | ta-web has no redirect code (nothing in `next.config` or `src/proxy.ts`). One table of 301s and 410s that B-04 to B-06 and B-08 fill | code | S | P0 | squarespace §9, §12 |
| B-04 | 157 empty stubs | 301 to the stub's achievement page when one exists, 410 otherwise. Generate the map from DofusDB (quest to achievement) and give Torre the list | data | S | P0 | squarespace §9; plan §12.6 |
| B-05 | Metalogro URLs | The 33 `/metalogro-*` pages, plus `/metalogro-krosmoz` once S-08 exists, become 301s to `/metalogros#<anchor>`. On dev `/metalogro-astrub` answers 404 | code | S | P0 | squarespace §2 |
| B-06 | Old hubs, test pages and `/cart` | 301 `/home`, `/index` and `/inicio-20` to `/`, and `/logros` to `/metalogros`. 410 for `/wip`, `/hielos-test`, `/pruebas`, the three `-datos` pages and `/cart`. `/subscribe` needs a 410 or a redirect until S-20 ships | code | S | P0 | squarespace §4, §7, §8; plan §12.8 |
| B-07 | GitHub Pages redirect | `dsantiagomj.github.io/silvestre-checklist/**`, embed URLs included, redirects to the new domain. The change lives in the `silvestre-checklist` repo | code | S | P0 | squarespace §12; plan §8.8 |
| B-08 | Old URL to new page map | Each Squarespace URL maps to the page that replaces it. We fill the map as each section is ported, so it grows with the S- items and is complete on cutover day | code | S | P0 | squarespace §12 |
| B-09 | Generic pages collection | The legal pages, emotes, how-tos and articles (D-02) need a home. `AGENTS.md` already plans a `pages` collection with the guide blocks | code | M | P0 | squarespace §8; duffus #23 |
| B-10 | Legal pages rewrite | `/aviso-legal`, `/politica-de-cookies` and `/politica-de-privacidad` on B-09. The cookie policy still describes ads and a cookie banner, and the privacy policy has to cover accounts and payments | Torre (panel) | M | P0 | squarespace §8; plan §6 |
| B-13 | Fate of the inline tools | `/mascotas`, `/team-builder` and `/sets-y-clases` are HTML apps inside a code block. Torre decides which ones stay. Those get ported (S-13), the rest a 410 | Torre | S | P0 | squarespace §7 |

## 2. Payload panel for Torre

All of it is code, written for Torre. Wave 1 changes strings and admin config and needs no migration, except `name` on users. Wave 2 adds components, hooks and access rules. Rows marked "Needs the owner's yes" change access rules that the integration tests cover, so they wait for approval.

### Wave 1: quick wins

| ID | Item | What and why | Owner | Size | Pri | Source |
|---|---|---|---|---|---|---|
| A-01 | One «Estado», not two | The header shows Payload's «Publicado» and the sidebar shows Torre's `state` «En preparación» for the same record. Rename the field («Visible en la web»), translate Payload's draft words, and tell Torre that he also has to press «Publicar cambios» | code | S | P1 | panel-audit #1 |
| A-02 | Dates, editor placeholder, array labels | Dates read «noviembre 13º 2026, 11:08 AM». The editor placeholder uses «usted» and says «comandos». Arrays without `labels` show «Añadir Item». Fix the date format, the placeholder and every missing `labels` | code | S | P1 | panel-audit #2, #3, #4 |
| A-03 | Navigation order | Users and Media come first and Torre's guides last. Put the editorial collections first, group the six read-only game data collections under «Datos del juego (solo lectura)», and move users under «Ajustes» with a `name` field. Restricting user deletes waits for A-15 | code | S | P1 | panel-audit #5, #6, #7 |
| A-04 | Hide the API tab and the locale switch | Every edit view shows an API tab, and every page a language switch with one option. Hide both. Optionally turn off the Next dev indicator for clean local screenshots | code | S | P2 | panel-audit #8, #17 |
| A-05 | Media upload form | Alt text has no help, so Torre will type «imagen». Add a description with an example, hide `gameAsset` and `originalUrl` on manual uploads, and search by alt and file name | code | S | P1 | panel-audit #9 |
| A-06 | List search and columns | Search covers only the title. Search quest guides by slug and Dofus guides by their other names, drop the `slug` column, and show `_status` on metalogros | code | S | P1 | panel-audit #10 |
| A-07 | «Slug» becomes «Dirección en la web» | The most visible English word in the panel. Relabel it, show the full URL under the field, and give an empty slug its own message instead of a regex error cut off in the tooltip | code | S | P1 | panel-audit #11 |
| A-08 | Step ID out of the way | Every checklist step opens with a grey UUID box. Move it to a collapsed «Datos técnicos» at the bottom, with a copy button, until A-19 removes UUID typing | code | S | P1 | panel-audit #12 |
| A-09 | Row labels | Rows read «Paso 01» or «Misión 01», so Torre cannot find the Ganymede step among 40. Label each row with its text or its quest, and start long arrays collapsed | code | M | P1 | panel-audit #13 |
| A-10 | Site branding on the panel | The login and every page show the Payload logo and no favicon. Use the Lockup and the Emblem, a ` · Torrente Arcano` title suffix and a short welcome under the login form | code | S | P1 | panel-audit #14 |
| A-11 | Arcano colors | The panel is stock grey, and the disabled-looking «Publicar cambios» button reads as broken. Map Payload's CSS variables to Arcano light and dark and check AA contrast | code | M | P2 | panel-audit #15 |
| A-12 | `originalUrl` read-only | «URL original» sits next to the slug and invites edits that change nothing. Lock it once set, or move it into a collapsed import group | code | S | P2 | panel-audit #16 |

### Wave 2: later work

| ID | Item | What and why | Owner | Size | Pri | Source |
|---|---|---|---|---|---|---|
| A-13 | «Pendiente» dashboard | The dashboard is a grid of cards. Torre's question is what to work on today: unpublished drafts, pages «En preparación», Dofus guides without a checklist, recent changes and shortcuts | code | M | P2 | panel-audit #18 |
| A-14 | «Guía del panel» | A custom view with six to eight short sections on drafts, publishing, «En preparación», DofusDB data and version history (Torre's undo button), plus one line of description per collection. Written with Torre | code + Torre | M | P2 | panel-audit #19, #28 |
| A-15 | Roles | Every panel user can delete any guide, any image and any user. Add `admin` and `editor` roles. Editors create, edit and publish; only admins delete imported records and media or manage users. Needs the owner's yes | code | M | P2 | panel-audit #20, #7 |
| A-16 | Publish status in plain words | Showing a page takes two actions: `state` Publicada and «Publicar cambios». A sidebar field says the result in one line («En la web: visible», «Tienes cambios sin publicar»). The audit prefers this to a custom publish button | code | M | P1 | panel-audit #21 |
| A-17 | Block deletes of referenced records | Deleting an image or an achievement page leaves holes in guides with no warning. A `beforeDelete` hook counts references and refuses in Spanish («Esta imagen sale en 4 guías…»). Needs the owner's yes | code | M | P2 | panel-audit #22 |
| A-18 | Long checklists | Two empty steps are already 4,300 px tall. Split each step into tabs, collapse the rarely used fields, then add an outline view that reorders steps with buttons and the keyboard | code | L | P2 | panel-audit #23 |
| A-19 | Step and objective pickers | Torre types UUIDs and a 0-based objective index, the most error-prone part of the panel. Replace them with a select of the checklist's steps and a select of the quest's objectives by text | code | L | P2 | panel-audit #24 |
| A-20 | Live preview sizes | Only «Móvil» exists. Add «Tableta» (1024) and «Escritorio» (1440), and turn on checklist preview with the Nebuloso page (S-01) | code | S | P1 | panel-audit #25 |
| A-21 | Panel accessibility | Thin grey focus ring, help text near the 4.5:1 limit, drag handles with no keyboard path besides the row menu. After A-11, run axe on five admin pages in Playwright and fix what it finds | code | M | P3 | panel-audit #26 |
| A-22 | Tabs in long forms | The Dofus guide edit view is one 2,400 px column. Tabs for content, summary, «Necesitarás» and SEO, a «Ficha» row and a color picker for the glow color | code | M | P2 | panel-audit #27 |
| A-23 | Lock fields that break data | A checklist prerequisite `key`, `order` numbers and the DofusDB links break progress or the autofill when edited. Make `key` read-only after creation. Locking the DofusDB links for non-admins depends on A-15 and needs the owner's yes | code | M | P1 | panel-audit #29 |

## 3. Content still to port from Squarespace

Quest guides (1,271 of 1,272, the last one is now a Dofus guide) and Dofus guides (all 20) are ported. Rows marked P0 are Squarespace URLs that would otherwise 404 on cutover day.

### Checklists

| ID | Item | What and why | Owner | Size | Pri | Source |
|---|---|---|---|---|---|---|
| S-01 | Nebuloso checklist page | In progress (checklists PR 4). The page for the Nebuloso, the pilot imported on 2026-11-13 as a draft. Torre publishes it when the page ships, and `/misiones-nebuloso` gets a target for its checklist card | code + Torre (panel) | M | P0 | squarespace §3, §4 |
| S-02 | Progress, locking and weighted percentage | In progress (checklists PR 5). Ticks saved in the browser as on Squarespace, steps locked by their prerequisites, and a percentage weighted from quest data | code | L | P0 | squarespace §4 |
| S-03 | Checklist index and menu | In progress (checklists PR 6). `/checklists` and a header menu that links ta-web pages instead of `legacyHref` | code | M | P0 | squarespace §4 |
| S-04 | Silvestre, Hielos and La eterna cosecha | Their three documents exist as «En preparación». Extend the importer to their data, then Torre reviews and publishes each one | data + Torre (panel) | L | P0 | squarespace §4 |

### Achievements and metalogros

| ID | Item | What and why | Owner | Size | Pri | Source |
|---|---|---|---|---|---|---|
| S-05 | 16 pages still «En preparación» | They render on Squarespace and 404 on dev (`/novatada`, `/correccional`, `/formacion-practica`…). Torre reviews each and flips `state` | Torre (panel) | S | P0 | squarespace §2 |
| S-06 | 22 Alineamiento achievements | DofusDB lists no quests for them, and the refresh only creates pages for achievements with quests. Create them from Torre's lists (`/en-guardia`, `/poner-orden`…), then Torre reviews | data + Torre (panel) | M | P0 | squarespace §2 |
| S-07 | Torre's prose and 11 videos | `intro` and `outro` are empty on all 223 achievement pages, and 11 Squarespace pages end with a guide video (`/verde-esmeralda`…). The importer copies the trailing prose and video into `outro`, which needs a video block in that field | code + Torre (panel) | M | P0 | squarespace §2 |
| S-08 | Metalogro Krosmoz and three loose pages | Create the Krosmoz metalogro and attach its guides. `/logro-misiones-extra-de-vulkania`, `/el-guardian-del-puente-de-la-muerte` and `/el-caballero-negro-y-rosa` are not DofusDB achievements and need a shape, loose guide or quest guide | Torre (panel) | S | P0 | squarespace §2 |
| S-09 | «Necesitarás en total» fix | In progress. Dungeon boss icons and the layout of the section on achievement pages | code | S | P1 | in progress, not in the reports |

### Classes and dungeons

| ID | Item | What and why | Owner | Size | Pri | Source |
|---|---|---|---|---|---|---|
| S-10 | Classes | A collection (or B-09), the route and the `/clases-1` hub for 19 pages. 17 are build screenshots under PVM and PVP; `/yopuka-1` and `/selotrop` have long text. About 150 images. Decide whether the `-1` slugs stay or get a 301. Spell data comes later (D-07) | code + Torre (panel) | M | P0 | squarespace §5; duffus #10 |
| S-11 | Dungeons and bosses | A collection (or B-09), route and index. Six pages have content (`/mazmorra-templo-del-dios-kao`, `/mazmorra-crunchidor`, `/pikabeto`, `/mazmorras-de-nawidad`, `/gruente`, `/minotobola-de-nawidad`), five are 36-word placeholders. Monsters reuse the fight block; DofusDB stats come later (D-06) | code + Torre (panel) | M | P0 | squarespace §6; duffus #9 |

### Other pages

| ID | Item | What and why | Owner | Size | Pri | Source |
|---|---|---|---|---|---|---|
| S-12 | Emotes and how-tos | `/emotes-global`, `/emote-soltar-los-gases`, `/emote-sealar-con-el-dedo`, `/acceso-pandala-3` and `/camino-a-stim-power`, as generic pages (B-09) or guides without a quest. Check whether `/weyes-magos` duplicates `/ayudar-a-los-weyes-magos` | Torre (panel) | S | P0 | squarespace §7 |
| S-13 | Inline tools as native pages | The tools B-13 keeps become React islands, as plan §8.6 says. About M each, so L for all three | code | L | P1 | squarespace §7 |
| S-14 | 17 guides without a DofusDB quest | They get no summary from DofusDB. Link a quest where one exists; the how-to pages are expected to have none | Torre (panel) | S | P2 | squarespace §1 |
| S-15 | Golden-page import test | Nobody compared the guides block by block. The planned `pnpm test:import` checks 30 golden pages against Squarespace before the delta import | code | M | P1 | squarespace §1; plan §8.1 |

### Site-wide features

| ID | Item | What and why | Owner | Size | Pri | Source |
|---|---|---|---|---|---|---|
| S-16 | Site settings global and announcement bar | Navigation, socials, the Ko-fi URL (hard-coded as `KOFI_URL`) and the Twitch card are hard-coded. A global moves them to the panel and adds the announcement bar, which Squarespace shows with Torre's donation message | code + Torre (panel) | M | P1 | squarespace §10 |
| S-17 | Twitch live card | `src/lib/site/live.ts` is a stub that is never live. Call the existing Cloudflare Worker | code | S | P1 | squarespace §10 |
| S-18 | Analytics | Plausible or Umami, cookieless. Before cutover, so traffic can be compared with Squarespace | code | S | P1 | squarespace §10; plan §4 |
| S-19 | `og:image` and richer JSON-LD | Shared links show no image, and only breadcrumbs have JSON-LD. Add `og:image` and Article or HowTo data | code | S | P1 | squarespace §12 |
| S-20 | Newsletter | The plan names a newsletter but no provider. Pick one, then a form for `/subscribe`. There is no subscriber list to bring over | code + Torre | M | P2 | squarespace §10 |

## 4. New features inspired by duffus.fr

Duffus covers most of the game in machine-translated Spanish. What it lacks is Torre: a named author, videos, opinions and his checklists. These rows favor features that add to his guides over bulk data pages.

| ID | Item | What and why | Owner | Size | Pri | Source |
|---|---|---|---|---|---|---|
| D-01 | Member accounts and cloud progress | Plan phase 4. Google, Discord and magic link; one progress set per member, so a quest ticked anywhere shows done in guides, achievements, Dofus guides and checklists, with a percentage on the Dofus index cards. Offers to import the `localStorage` of the checklists (needs S-02) | code | L | P1 | duffus #1, #2 ([/es/guias](https://www.duffus.fr/es/guias)); squarespace §11; plan §6 |
| D-02 | Articles with a table block | Tutorials and event guides (duffus has a 146-row pets table) are Torre's natural format. B-09 plus a table block, then Torre writes | code + Torre (panel) | S | P1 | duffus #23 ([/tutoriels/familiers](https://www.duffus.fr/tutoriels/familiers)) |
| D-03 | «Actualizado el» date | Show when a guide last changed. Payload already stores `updatedAt`; it is a trust signal and helps SEO | code | S | P1 | duffus #25 |
| D-04 | Quest overlay | A Document Picture-in-Picture window that floats over the game with the steps, «Necesitarás» and coordinates. Chromium only, with a popup window elsewhere. The most distinctive idea in the duffus report; plan §6 lists overlay extras as a premium candidate | code | M | P2 | duffus #3 ([quest page](https://www.duffus.fr/es/mision/gobstination-dun-grobelin)) |
| D-05 | Quest list page | Find a quest by name, zone or achievement and filter by type. "Hide done" comes with D-01 | code + data | M | P2 | duffus #5 ([/es/misiones](https://www.duffus.fr/es/misiones)) |
| D-06 | Dungeon data | Position, recommended level, monsters, boss stats per grade and drops from DofusDB for every dungeon, under Torre's mechanic notes on S-11 pages | data + code | L | P2 | duffus #9 ([/donjon/chateau-ensable](https://www.duffus.fr/donjon/chateau-ensable)) |
| D-07 | Class spells | Every spell by level with cost, range and effects from DofusDB, on the S-10 class pages. The data is commodity; Torre's take is the difference | data | M | P2 | duffus #10 ([/es/clases](https://www.duffus.fr/es/clases)) |
| D-08 | Dofus guide counts and items tab | Counts of prerequisites, quests and dungeons on index cards, the level range and one aggregated «Necesitarás» | data + code | M | P2 | duffus #7 ([/guide/dofus-ocre](https://www.duffus.fr/guide/dofus-ocre)) |
| D-09 | Achievement page extras | Rewards with an "include quests" toggle and the resources the achievement needs | data + code | M | P2 | duffus #8 ([/es/logros/service-dans-la-milice](https://www.duffus.fr/es/logros/service-dans-la-milice)) |
| D-10 | Almanax | Today's offering and bonus, a calendar and a purchase list for a date range. A reason to visit daily | data + code | M | P2 | duffus #13 ([/almanax](https://www.duffus.fr/almanax)) |
| D-11 | Archmonster tracker | Per character, with soul stones and sort by zone, on top of La eterna cosecha (S-04) and accounts (D-01). Duffus also has an exchange board, which needs a community to work | code + data | L | P2 | duffus #11 ([/archimonstres](https://www.duffus.fr/archimonstres)) |
| D-12 | Site-wide search | Postgres full text, as planned, over guides, achievements, classes and dungeons, opened with Ctrl/⌘K | code | M | P2 | duffus #15; plan §4 |
| D-13 | Drop calculator | Base rate, prospecting and bonuses give the chance per fight and after N fights. Cheap | code | S | P2 | duffus #19 ([/es/calculadora-drop](https://www.duffus.fr/es/calculadora-drop)) |

## 5. Later or low priority

| ID | Item | What and why | Owner | Size | Pri | Source |
|---|---|---|---|---|---|---|
| L-01 | Compact mode | A denser quest page. `AGENTS.md` makes view modes a premium entitlement, so it waits for plan phase 5 | code | S | P3 | duffus #26 |
| L-02 | Game version stamp | «Datos: DOFUS 3.x» in the footer, taken from the last DofusDB refresh | data | S | P3 | duffus #27 |
| L-03 | Wanted posters | 82 posters with stats, mechanics and a captured flag. The `se-busca-*` stubs are redirected or gone after B-04 and could become these pages later | data + Torre (panel) + code | M | P3 | duffus #12 ([/avis-de-recherche/sam-sagaz](https://www.duffus.fr/avis-de-recherche/sam-sagaz)) |
| L-04 | Build library | Only worth it if Torre publishes builds. Editorial work for him | Torre (panel) + code | M | P3 | duffus #22 |
| L-05 | Craft shopping list | Pick items, get the resources they need | code + data | M | P3 | duffus #17 |
| L-06 | A page per DofusDB quest | Duffus wins on volume (627 generated quest pages). A generated summary per quest could link Torre's guide when one exists, but it risks thin-content SEO and dilutes his guides | data + code | L | P3 | duffus #4 |
| L-07 | Full progression guide | 1,092 quests by level band, with chapters and tips. A large editorial job for Torre, worth it once D-01 exists | Torre (panel) + code | L | P3 | duffus #6 ([/es/guia-completa](https://www.duffus.fr/es/guia-completa)) |
| L-08 | Item, monster and set pages | Useful as link targets from guides, but DofusDB already has them in Spanish | data + code | L | P3 | duffus #14 |
| L-09 | Comments | Empty on duffus, and moderation would land on Torre | code + Torre | M | P3 | duffus #24 |
| L-10 | Discord bot | Almanax reminders and news fit a bot better than the site | code | M | P3 | duffus #30 |
| L-11 | Theorycraft tools | World map, job XP simulator, breeding tracker, stuff builder and skinator. Other sites own these, and they stray from a guide site. Each is M to L | code + data | L | P3 | duffus #16, #18, #20, #21, #28 |

## 6. Dropped on purpose

These rows need no owner, size or priority. The redirects for their URLs are in section 1.

| Item | Why | Source |
|---|---|---|
| Ads: AdSense, Flower Ads, the AMP script, Seedtag | Removed; revenue comes from premium and Ko-fi (plan §6, §12.2). | squarespace §10 |
| Cookie banner | No ads and cookieless analytics need no consent banner (plan §4, Consent) | squarespace §10 |
| Store and `/cart` | The store was never live and is removed; `/cart` gets a 410 (plan §12.8) | squarespace §8, §10 |
| The three `-datos` pages and the daily guide sync | They feed the embeds, which retire at cutover (plan §2, Embeds; goal 2) | squarespace §4 |
| Test copies: `/hielos-test`, `/inicio-20`, `/pruebas` | Duplicates of the home, an embed and the team builder; redirected or gone (plan §8.8) | squarespace §4, §7 |
| `/index`, `/home`, `/logros`, `/wip` | Superseded by `/` and `/metalogros`, or placeholders (plan §8.8) | squarespace §8 |
| 157 empty stubs | Verified empty, not imported (plan §3, §12.6) | squarespace §9 |
| Standalone metalogro pages | A metalogro is a panel of `/metalogros` by design (`openwiki/achievements/achievement-page.md`); B-05 redirects the old URLs | squarespace §2 |
| French and English versions | Spanish only at launch, with localization ready for more (plan §12.7) | duffus #29 |
