---
type: feature
title: Standalone pages
description: The `pages` collection for Torre's loose pages (emotes, how-tos, the legal pages), how `/<slug>` renders them or sends an «En preparación» page to Squarespace, their SEO, breadcrumb, cache and footer links, and `pnpm import:pages`, which brings them from Squarespace.
tags: [pages, payload, frontend, squarespace, import, seo]
verified:
  - by: openwiki/0.4.3
    at: 2026-11-16T11:00:16.891Z
sources:
  - id: openwiki-source-5b54a58d1b51cd490b0e7162
    resource: repo://package.json
  - id: openwiki-source-8d7caf59736b532597a45b23
    resource: repo://scripts/import/import-pages.ts
  - id: openwiki-source-6a5170585430535d3f294553
    resource: repo://scripts/import/pages/catalog.ts
  - id: openwiki-source-6cbfecb8c24fef3368e51d8e
    resource: repo://scripts/import/pages/convert.ts
  - id: openwiki-source-88197bfd87b02251ea3cb861
    resource: repo://scripts/import/pages/load.ts
  - id: openwiki-source-85326c2edd09ecaf8cb69ad7
    resource: repo://src/app/(frontend)/%5Bslug%5D/page-data.ts
  - id: openwiki-source-cb49e3c4d1015b8673e71275
    resource: repo://src/app/(frontend)/%5Bslug%5D/page.tsx
  - id: openwiki-source-033c6b075349ca47608b1252
    resource: repo://src/app/(frontend)/%5Bslug%5D/SitePageView.tsx
  - id: openwiki-source-85b41a41ce498767de963f3a
    resource: repo://src/collections/Pages.ts
  - id: openwiki-source-4f2e53306895c158accd92ec
    resource: repo://src/collections/revalidate-guides.ts
  - id: openwiki-source-39afe86b52965c905da37bef
    resource: repo://src/components/site/nav.ts
  - id: openwiki-source-e7ac5638d0daef0f6b0a6cf6
    resource: repo://src/lib/pages/cache.ts
  - id: openwiki-source-272a461bdaef1661029831c3
    resource: repo://src/lib/pages/page.ts
  - id: openwiki-source-af4106cf9cee172fa9209bee
    resource: repo://src/lib/pages/queries.ts
  - id: openwiki-source-fb8279296835a1a58ec3f427
    resource: repo://src/lib/site/legacy.ts
generated: { by: "claude-code", at: "2026-11-16T11:00:16.891Z" }
---

# Standalone pages

Torre's site has a handful of pages that are not a quest, an achievement, a Dofus guide or a checklist: the emote pages, how to reach a place, and the legal texts. The `pages` collection (`src/collections/Pages.ts`) holds them, and they render at `/<slug>` with the quest guide's blocks and flat layout (DESIGN.md, Site page).

## The collection

| Field | Notes |
|---|---|
| `title` | Required, localized |
| `slug` | Required, unique and indexed, validated like a quest guide's slug. It shares the root slug space with the other `/<slug>` collections: `rejectSharedSlug('pages')` refuses one another collection already uses |
| `state` | «Publicada» or «En preparación», the same field as achievement pages |
| `legacyHref` | «Enlace en Squarespace», a sidebar field shown only while the page is «En preparación»; must be a valid URL when set |
| `parent` | «Página superior», a relationship to another page (never itself), used only for the breadcrumb |
| `body` | Rich text, image, video, callout, fight and step blocks, in the «Contenido» tab |
| `seo` | `metaTitle` and `metaDescription` (at most 160 characters), localized, in the «SEO» tab |
| `importSnapshot` | Hidden JSON with what the last import wrote; cleared on duplicate |

Access follows the other editorial collections: anyone reads published pages and the panel reads everything (`readPublishedOrAll`), a panel account creates and updates, and an imported page can be deleted only by an administrator (`adminOrNotImported('importSnapshot')`). Pages keep drafts and up to 50 versions, have live preview and the «En la web» line, and sit in the panel's «Contenido» group.

Hooks: `trackSlugMove('pages')` and `applySlugMove('pages')` record a changed slug in `redirects`, so the old address answers with a 308 (see [Legacy redirects, sitemap and robots.txt](../operations/redirects-and-seo.md)); `revalidatePagesAfterChange` and `revalidatePagesAfterDelete` expire the `pages` cache tag.

## How `/<slug>` serves a page

The `[slug]` route tries, in order, a quest guide, an achievement page, a Dofus guide, a standalone page and a checklist (see [Request pipeline](../architecture/request-pipeline.md)). For a page:

1. `loadSitePage` (`src/app/(frontend)/[slug]/page-data.ts`) reads it once per request. With Next's draft mode and a panel session it reads the latest draft as that user, uncached; otherwise it reads the published version through `unstable_cache` under the `pages` tag with a 600-second `revalidate` (`src/lib/pages/cache.ts`). `readSitePage` (`src/lib/pages/queries.ts`) always reads with `overrideAccess: false`, returns a page in any state, and populates only the title, slug and state of the parent.
2. `sitePageRoute` applies `legacyRoute` (`src/lib/site/legacy.ts`), the same rule as checklists: a published page, or any page in preview, renders; a page «En preparación» redirects to its `legacyHref`, unless that link is missing, invalid or points at this same site, which answers 404.
3. `SitePageView` renders the quest guide's reading column: the breadcrumb, the title as the `h1` and the body through `GuideSections`, with `PageEnhancements` as the only client island and the preview bar and live preview refresh in draft mode. No quest header, next quest card or progress.

`sitePageSeo` (`src/lib/pages/page.ts`) gives the metadata: Torre's SEO title and description when written; otherwise the page title, and the first text of the body (rich text, callout or a step's text) clipped at a word to 160 characters, or the title when the body has no text. Open Graph adds the site name and share image from «Ajustes del sitio» (see [Site settings and index texts](../cms/site-copy.md)). A draft in preview is never indexed.

`sitePageBreadcrumb` gives «Inicio», then the parent page only when it is populated and published, then the page itself.

## Links from the rest of the site

`readPageNav` reads the published pages by title, as a visitor. `pageNavItems` turns each into a link: its own page when «Publicada», its Squarespace page when «En preparación» with a `legacyHref`, and no link otherwise. Those links feed:

- The footer's legal links (`legalLinks` in `src/components/site/nav.ts`): the privacy, cookies and legal notice pages link to their page here when it exists and has a link, and to the Squarespace page with the same slug when it does not.
- The search: the header dialog finds published pages through the menu it already has, and the home page search through the `content` rows of the search index (see [Site header, footer and search](../frontend/site-shell-and-search.md)).

`/sitemap.xml` lists the published pages (see [Legacy redirects, sitemap and robots.txt](../operations/redirects-and-seo.md)).

## Importing from Squarespace: `pnpm import:pages`

`scripts/import/import-pages.ts` brings the pages in `scripts/import/pages/catalog.ts` into the collection: the emotes index and two emote pages under it, the Wukin and Wukang access page, «Camino a Stim Power», the Weyes Magos gift page, and the three legal pages. The legal pages arrive «En preparación», because they mention ads and a cookie banner that no longer apply and Torre rewrites them. The «Dar un beso» emote is not in the catalog: it is already a quest guide.

`pnpm import:pages [--from <dir>] [--apply] [--remote] [--production]`:

- It downloads each page from the Squarespace site, or reads `<dir>/<slug>.html` with `--from`.
- `convertPage` (`pages/convert.ts`) keeps Torre's text, screenshots and videos in his order and drops empty spacer paragraphs. The first heading becomes the title only when the catalog title is that heading with other capitals; otherwise the heading stays in the body and is reported. Links to his own site stay relative only where this site serves the path. The Squarespace SEO title and description are kept when he wrote them.
- `loadSitePages` (`pages/load.ts`) creates the missing pages in the catalog's state (the legal pages with their `legacyHref`), never changes `state`, rewrites only a field that still holds what the last import wrote (`importSnapshot`), leaves alone a page with an unpublished draft, and skips a slug another collection already uses. Screenshots go to Media once, reused by their source URL.
- Without `--apply` it only counts and reports. It refuses a remote database without `--remote` and production without `--production`.

## Tests

- `tests/unit/pages-collection.test.ts`: fields, access, hooks.
- `tests/unit/site-pages.test.ts`: the route rule, SEO, breadcrumb and nav links.
- `tests/unit/import-pages-convert.test.ts`: the conversion, with fixtures in `tests/fixtures/pages/`.
- `tests/integration/pages.test.ts` and `tests/integration/import-pages.test.ts`: reads and the import against a real database.
- `tests/e2e/paginas.spec.ts`: the rendered page, Torre's SEO and the fallback, the redirect of a page «En preparación», the footer links, the header search, the sitemap and axe WCAG 2.2 AA, with seed data in `tests/e2e/seed/pages.ts`.
