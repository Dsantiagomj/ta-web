---
type: operations
title: Legacy redirects, sitemap and robots.txt
description: How old Squarespace URLs are answered with a 301, 307 or 410 by src/proxy.ts from one validated table, how the generated stubs section is rebuilt, what /sitemap.xml lists and how it is cached, and what robots.txt says in each environment.
tags: [seo, redirects, proxy, sitemap, robots, cutover]
sources:
  - id: openwiki-source-7ad9a198e69c253980868284
    resource: repo://scripts/redirects/build-stub-redirects.ts
  - id: openwiki-source-fafd2870de82b70071978944
    resource: repo://scripts/redirects/stub-map.ts
  - id: openwiki-source-394f592b7129d91f3031a0e2
    resource: repo://scripts/redirects/stubs.ts
  - id: openwiki-source-14ca87abed0f0ffc69067570
    resource: repo://src/app/(frontend)/%5Bslug%5D/redirect-data.ts
  - id: openwiki-source-e662deaf5fc4b6bc8b7128a5
    resource: repo://src/app/(frontend)/site-data.ts
  - id: openwiki-source-90182fdeabeb5c115ecbd1e9
    resource: repo://src/app/sitemap.ts
  - id: openwiki-source-9b463f6e95f19dbe107025a0
    resource: repo://src/collections/Redirects.ts
  - id: openwiki-source-a93f1ff2ed8916a30885274d
    resource: repo://src/collections/root-slug.ts
  - id: openwiki-source-a3a5ee234cca72cd23e5a201
    resource: repo://src/collections/slug-redirects.ts
  - id: openwiki-source-d7f7bf5d3e0f69a0ae70820b
    resource: repo://src/lib/admin/slug.ts
  - id: openwiki-source-2ce84534e6026072681beb8b
    resource: repo://src/lib/dev-gate/robots.ts
  - id: openwiki-source-5b8e10db0e9c77418822b1a4
    resource: repo://src/lib/redirects/cache.ts
  - id: openwiki-source-ccfbe498557680796b2d7513
    resource: repo://src/lib/redirects/gone-page.ts
  - id: openwiki-source-c60c97b53b228e22a84074aa
    resource: repo://src/lib/redirects/legacy-urls.json
  - id: openwiki-source-4d67b0f7b982e950838bad5a
    resource: repo://src/lib/redirects/queries.ts
  - id: openwiki-source-2d620fc50059960f72ea2ef8
    resource: repo://src/lib/redirects/slug-redirects.ts
  - id: openwiki-source-ad90cd8e9adaf3420039eb76
    resource: repo://src/lib/redirects/strings.ts
  - id: openwiki-source-d1e24e2e789285adcf1d4076
    resource: repo://src/lib/redirects/table.ts
  - id: openwiki-source-1f3c0b7c0356b68e08b7c0ea
    resource: repo://src/lib/seo/read-sitemap.ts
  - id: openwiki-source-f2cbd23a46d400c9ec031b6b
    resource: repo://src/lib/seo/sitemap.ts
  - id: openwiki-source-d7984cca81aea65b0b072b91
    resource: repo://src/lib/site/live-slugs.ts
  - id: openwiki-source-2e24cfbb628a19f71e2bf154
    resource: repo://src/lib/site/origin.ts
  - id: openwiki-source-0d7ee8b23c7e115457b05c3b
    resource: repo://src/lib/site/site-links.ts
  - id: openwiki-source-f34ac1e549d94dc3ac475ae4
    resource: repo://src/proxy.ts
  - id: openwiki-source-a976bd3068a0e57bcc18a4a6
    resource: repo://tests/e2e/redirecciones.spec.ts
  - id: openwiki-source-a1af73d9f0a035c2bd1e32e3
    resource: repo://tests/integration/slug-redirects.test.ts
  - id: openwiki-source-ce5bd0fd9f05fa81040e778e
    resource: repo://tests/unit/legacy-redirects-proxy.test.ts
  - id: openwiki-source-0c8031c037c760eff8d2923b
    resource: repo://tests/unit/redirect-table.test.ts
  - id: openwiki-source-299f708a96902b808ff05ee6
    resource: repo://tests/unit/robots.test.ts
  - id: openwiki-source-7d83132159a0b5463b4737b0
    resource: repo://tests/unit/sitemap.test.ts
  - id: openwiki-source-903f34c0649a5042a4e32af3
    resource: repo://tests/unit/slug-redirects.test.ts
  - id: openwiki-source-bdd83d0bfa58ad00bbe25676
    resource: repo://tests/unit/stub-redirects.test.ts
generated: { by: "claude-code", at: "2026-11-20T11:20:16.585Z" }
verified:
  - by: openwiki/0.4.3
    at: 2026-11-20T11:20:16.585Z
---

# Legacy redirects, sitemap and robots.txt

On cutover day every URL of Torre's Squarespace site must either render or redirect (backlog B-03 to B-08). Most old slugs keep working because the new pages use the same flat slugs at `/<slug>` (see [Public quest guide page](../frontend/guide-page.md)). The URLs that have no page of their own live in one table, and the proxy answers them before Next renders anything. The same work added a sitemap and pointed `robots.txt` at it. Separately, when Torre changes the slug of a published page in the panel, the old address keeps working through the `redirects` collection (below).

## The table: `src/lib/redirects/legacy-urls.json`

Each top-level key is a section:

| Field | Meaning |
|---|---|
| `description` | Where its URLs come from: the backlog item and who keeps it |
| `moved` | Old path → new path on this site, with an anchor if needed |
| `gone` | Old paths with no replacement: `410` |
| `permanent` | `false` makes the section's redirects `307`; without it they are `301` |

Today there are three sections:

- **`hubs`** (B-06, kept by hand): old hubs such as `/home`, `/index` and `/inicio-20` go to `/`, and `/logros` goes to `/metalogros`. The data pages behind the old embeds (`/checklist-silvestre-datos`, `/checklist-hielos-datos`, `/checklist-nebuloso-datos`) held the whole checklist and now go to their checklist. Test copies (`/wip`, `/hielos-test`, `/pruebas`), `/cart` and `/subscribe` answer `410`; `/subscribe` stays gone until member accounts exist (D-01).
- **`metalogros`** (B-05, kept by hand): each `/metalogro-<x>` goes to the anchor of its panel on the metalogros index, `/metalogros#<x>`. `/metalogro-alineamiento-misiones` also goes to `#alineamiento`, and `/metalogro-misiones-principales`, which Torre links from his guides, goes to the world quests, `#misiones-de-mundo`. `/metalogro-krosmoz` joins when that metalogro exists (S-08).
- **`stubs`** (B-04, generated, `permanent: false`): Squarespace's empty stub pages, sent to their achievement page or answered with `410`. See [The stubs section](#the-stubs-section).

The rules, also in AGENTS.md (Redirects):

- **301 for what is stable, 307 for what still changes.** Browsers and crawlers keep a 301 for good, so a section a script still rewrites answers 307.
- **410 only for what is gone for good.** A URL whose page will exist later gets no row and answers 404 until the page is published.
- **Do not redirect what is still on Squarespace.** Classes, dungeons, legal pages, tools, `/metalogro-krosmoz` and the checklists not yet ported stay out of the table until their section is ported or Torre drops them. When a section is ported (B-08), its URLs whose slug changes get a new section with a 301 each; a URL whose slug stays the same needs no entry.

## Validation: `src/lib/redirects/table.ts`

`buildLegacyTable` merges the sections into one `Map` from path to rule and throws on:

- a source that is not `/<slug>` with a valid slug, or is a reserved route of the site (`isGuideSlug`), so the table never hides the panel, the API or an index;
- the same source in two sections;
- a target that leaves the site: it must start with a single `/`, contain no backslash, whitespace or control character (a browser reads `/\other.com` as `//other.com`), and resolve to the same origin;
- a chain: a target whose path is itself a source in the table, which would mean two hops or a 301 to a 410.

`loadLegacyTable` wraps that for the running app. A table that fails validation is logged ("Redirecciones desactivadas: …") and replaced by an empty map, so one bad row leaves the site without redirects, not down, and `/api/health` keeps answering. `tests/unit/redirect-table.test.ts` runs the validation on the real file, so a bad row fails CI before it can reach production. `LEGACY_URLS` is built once when the module loads.

`legacyKey` normalizes a path for lookup: lowercased, without a trailing slash, and `null` for anything with a sub-path, since the table holds only first-level URLs. `lookupLegacyUrl(pathname)` returns the rule or `null`; `isLegacySource(slug)` says whether a slug is a source.

## How the proxy answers

`src/proxy.ts` runs on every request (no `matcher`). `legacyResponse` looks the path up:

- **Moved (301 or 307).** A redirect to the target on the public origin, `siteUrl(process.env, request.nextUrl.origin)` from `src/lib/site/origin.ts`, because behind Railway's proxy the request only knows the internal host. The old query string is dropped; the target keeps its anchor.
- **Gone (410).** A short Spanish HTML page written by `gonePage(mode, theme)` (`src/lib/redirects/gone-page.ts`): «Esta página ya no existe», a line saying the address belonged to the old site, and «Volver a la portada» as the filled primary button. It is left aligned with the site's side margins, not a centered column, and uses the system fonts. The proxy writes it without going through Next, so it is standalone HTML with its CSS inline and no stylesheet, font or script. Its colors (`GONE_COLORS`: background, ink, secondary ink, button and button ink) are those of the visitor's free theme and mode, read from the `ta-theme` and `ta-mode` cookies: Amakna dark without cookies, and Amakna for an Ocre cookie, as on the rest of the site without the entitlement. `tests/unit/legacy-redirects-proxy.test.ts` checks they still match each free theme in `theme.css`.
- **Not in the table.** The request continues to its page.

In the dev environment the proxy then adds the `noindex` header to every response, redirects and 410s included (see [Dev environment: public, never indexed](dev-gate.md)). The lookup is one `Map` read per request and never touches the database.

## No shadowing

A page whose slug is a table source would never be seen, because the proxy answers first. So:

- The root-slug hook (`src/collections/root-slug.ts`) rejects saving a quest guide, achievement page, Dofus guide, checklist or standalone page whose slug is in the table, and the slug field's validator (`src/lib/admin/slug.ts`) shows Torre `legacySlugStrings.taken`: the address is in the redirect table, the page would never show, and he should ask for the row to be removed. Metalogros are exempt: their slug is the anchor of their panel on `/metalogros`, not a page. See [Admin panel](../cms/admin-panel.md).
- `/sitemap.xml` never lists a table source.

## The stubs section

The 2026-11-02 crawl found 166 empty stub pages (`CRAWLED_STUBS` in `scripts/redirects/stubs.ts`), each titled with an achievement or quest name. Torre has since filled some of them with whole quest guides: those are listed in `FILLED_STUBS`, are imported by `pnpm import:delta` (see [Inventory and delta import](../data/delta-import.md)) and are no longer stubs, so they get no row and the guide answers. `LEGACY_STUBS` is the crawled list minus the filled ones. `pnpm redirects:stubs` (`scripts/redirects/build-stub-redirects.ts`) rewrites only the `stubs` section:

1. It reads the public REST API of a deployed site as a visitor, without credentials: dev by default, `--from <origin>` for production.
2. `mapStubs` (`scripts/redirects/stub-map.ts`) derives the slugs a title could have produced (no accents, with or without the ñ) and matches them against achievement names and the names of their quests, using the DofusDB data ta-web already holds. Each stub ends up as one of:
   - `moved`: to the achievement page, when a visitor can open it; `STUB_OVERRIDES` sends a few Dofus stubs to their Dofus guide;
   - `pending`: the page exists but is «En preparación», so no row and a 404 until it is published;
   - `gone`: an achievement with no page to wait for, a quest that no achievement of ta-web asks for, or a name that matches nothing, so `410`; the report gives each reason its own group;
   - `ambiguous`: the name matches several achievements, so no row and a report naming the candidates, for Torre to pick one in `STUB_OVERRIDES`;
   - `skipped`: the slug is already a ta-web document or is in another section.
3. `stubsSection` writes the redirects with `permanent: false` (307), plus the 410s, and prints a report of what went where. `--dry-run` writes nothing.

Rerun it after Torre publishes achievement pages. On cutover day it runs against production with `--cutover`, which drops `permanent: false` so the stub redirects become 301. `tests/unit/stub-redirects.test.ts` covers the matching, the outcomes, the section and the report.

## Torre's links to his own site

Torre's rich text, written for Squarespace, links his own pages as `https://www.torrentearcano.com/<path>` or `/<path>`. Before the cutover some of those paths are served here and some are not. `siteLinkHref` (`src/lib/site/site-links.ts`) decides what each link renders:

- `ownSitePath` reads the path of a link to Torre's site, absolute (with or without `www`) or relative; a link to another site, an anchor or a non-address is left alone.
- `servedPath` says what this site answers there: an own route (the home page, a reserved slug), a legacy table row (`redirect`, or `gone` for a 410), a page whose slug is live, or nothing.
- When this site serves the path (and it is not a 410), the link becomes relative. Otherwise it points at Squarespace, which still has the page; a relative link is made absolute there. So a link never leads to a 404 here, and a 410 path stays on Squarespace for `pnpm links:legacy` to list.

`readLiveSlugs` (`src/lib/site/live-slugs.ts`) gives the live slugs as an anonymous visitor sees them: published quest guides, and achievement pages, Dofus guides, standalone pages and checklists in the Publicada state, plus the slugs Torre changed. `loadLiveSlug` caches them under every page's cache tag. The `/<slug>` route passes each loaded page through `withSiteLinks`, which rewrites every Lexical link and autolink node with a written URL, anywhere in the data, without touching the cached original. The Dofus guide import applies the same rule when it stores links (see [Importing Torre's Dofus guides](../data/dofus-guides-import.md)). The read-only reports that check what is left before cutover are in [Legacy link reports and URL map](legacy-links.md).

## Changed slugs: the `redirects` collection

The legacy table is code; slugs Torre changes after cutover live in data. When a published page of a collection with its own page (`SLUG_REDIRECT_COLLECTIONS` in `src/lib/redirects/slug-redirects.ts`: quest guides, achievement pages, Dofus guides, checklists, standalone pages, and the class and dungeon pages, whose public pages are still to come; not metalogros, whose slug is an anchor) gets a new slug, `/<old>` answers a 308 to `/<new>`.

- **Recording a move.** Each of those collections runs `trackSlugMove` (`beforeChange`) and `applySlugMove` (`afterChange`) from `src/collections/slug-redirects.ts`. `trackSlugMove` reads the stored row, which holds the published version (saving a draft only writes versions), and `slugMove` reports a move only when the save publishes with a slug different from the one that was published; a draft or a page never published has no address to keep. `applySlugMove`, after a publish, deletes any row whose `from` is the page's new slug (a page that publishes an old address takes it back) and, for a move, creates or updates the row `from: old, to: new` with `auto: true`. An old address that can no longer redirect (now a site route, or answered first by the legacy table) is skipped and never blocks publishing.
- **The collection.** `redirects` (`src/collections/Redirects.ts`, «Redirecciones» in «Ajustes») lets Torre see and edit the rows; anyone reads it, panel accounts write it. `validateRow` lowercases both slugs, rejects an invalid slug or one the legacy table owns (`redirectProblem`), rejects a loop, rejects a `from` that a published page still uses (the page would always win), and shortens the target to the end of any chain (`chainEnd`: A → B with B → C is saved as A → C). `collapseChains` then points rows that led to this row's `from` at its `to`, so the table has no chains. Every change expires the `redirects` cache tag.
- **Answering.** `/[slug]` consults the table last, only when nothing published has that slug: `redirectOrNotFound` (`src/app/(frontend)/[slug]/redirect-data.ts`) reads all rows as a visitor through `unstable_cache` under the `redirects` tag (600-second `revalidate`), follows the chain with `redirectTarget` (null on a loop), and calls `permanentRedirect` (308) to `/<target>`, or `notFound()`. So an old row never hides a page. See [Request pipeline](../architecture/request-pipeline.md).

## `/sitemap.xml`

`src/app/sitemap.ts` is `force-dynamic`, like `robots.txt`: the build has no database. `sitemapEntries` (`src/lib/seo/sitemap.ts`, pure code) lists, with absolute URLs on `SITE_URL` and no duplicates:

- the home page, `/metalogros`, `/guias-dofus` and `/checklists`;
- every published quest guide, and every published achievement page, Dofus guide, checklist and standalone page in Torre's `published` state, whose slug is a valid page slug and not a table source.

Each page carries `lastModified` from its `updatedAt`. An index's date is the latest change among what it shows, its «En preparación» cards included because they appear on it (achievement pages count only when they belong to a metalogro; the Dofus index also counts its introduction global, `dofus-guides-index`). The home page's date is the latest of the guides and the three indexes. An index with nothing to show has no date.

`readSitemapData` (`src/lib/seo/read-sitemap.ts`) reads as an anonymous visitor (`overrideAccess: false`, `draft: false`, `_status: published`), selecting only slugs, dates, states and the achievement page's group. The read is wrapped in `unstable_cache` tagged `guide-pages`, `achievement-pages`, `dofus-guides`, `checklists` and `pages` with the guide pages' 600-second `revalidate`, so a publish in the panel expires it and writes outside the panel show within ten minutes. Drafts, the panel, the API, the `/sistema` catalog and the preview route are never listed.

## `robots.txt`

`robotsFor(env)` (`src/lib/dev-gate/robots.ts`, served by `src/app/robots.ts`) disallows everything in dev. Elsewhere it allows everything except `/admin` and points at `<public origin>/sitemap.xml`. In production `siteUrl` throws without `NEXT_PUBLIC_SITE_URL` instead of announcing localhost.

The home page also sets its canonical URL to `/`, without the query string.

## Tests

- `tests/unit/redirect-table.test.ts`: `buildLegacyTable` (301 and 410 merged across sections, 307 with `permanent: false`, repeated sources, chains, non-slug sources, reserved routes, off-site and backslash or whitespace targets), `loadLegacyTable` falling back to an empty table, `isLegacySource`, `legacyKey`, `lookupLegacyUrl`, and the real file: it builds, each section has a description, the hubs and metalogros go where expected with 301, the stubs use 307 or 410, a pending stub has no row, and pages still on Squarespace are not redirected.
- `tests/unit/legacy-redirects-proxy.test.ts`: the proxy's 301 without the query and with the public origin, the stub's 307, the metalogro anchor, case and trailing slash, the 410 page, pass-through, `noindex` on redirects in dev, and the 410 page's standalone markup, left alignment, system fonts, filled primary button and colors of each free theme in both modes, Amakna dark by default, following the visitor's theme and mode, and Amakna for Ocre.
- `tests/unit/stub-redirects.test.ts`: stub matching and the generated section.
- `tests/unit/slug-redirects.test.ts` and `tests/integration/slug-redirects.test.ts`: following chains and loops, row validation, when a save moves an address, and the hooks writing, updating and releasing rows on real publishes.
- `tests/unit/sitemap.test.ts`: the entries (home, indexes, published pages), drafts and «En preparación» left out, no panel or API, per-page and per-index dates, no table sources, no duplicates.
- `tests/unit/robots.test.ts`: `robotsFor` in and out of dev, the sitemap pointer and the production failure without `NEXT_PUBLIC_SITE_URL`.
- `tests/e2e/redirecciones.spec.ts`: a hub's 301, a metalogro landing on its panel, a published stub's 307, the 410 page, a stub with no page (410) and one whose page is in preparation (404), `/sitemap.xml` without drafts, the panel or the API, `robots.txt` pointing at the sitemap, the home page's canonical URL, and a changed slug answering a 308 to its new address, which opens its page.

## Related pages

- [Dev environment: public, never indexed](dev-gate.md)
- [Request pipeline](../architecture/request-pipeline.md)
- [Public quest guide page](../frontend/guide-page.md)
- [Admin panel](../cms/admin-panel.md)
- [Environment configuration](../architecture/configuration.md)
