---
type: operations
title: Share cards, JSON-LD and update dates
description: How each page gets its own share image drawn on the server with next/og, which Article and WebSite JSON-LD the site emits, and how contentUpdatedAt records when Torre last published a content change for the «Actualizado el» line and dateModified.
tags: [seo, share-card, og-image, json-ld, content-date, next]
verified:
  - by: openwiki/0.4.3
    at: 2026-11-20T11:20:16.585Z
sources:
  - id: openwiki-source-9f8dd5dda3040f346fabae9c
    resource: repo://src/app/(frontend)/%5Bslug%5D/og/route.ts
  - id: openwiki-source-c7403ffa805d074d48baea6e
    resource: repo://src/app/(frontend)/%5Bslug%5D/seo-data.ts
  - id: openwiki-source-3d7e89cc738ee796619fcc12
    resource: repo://src/app/(frontend)/og/route.ts
  - id: openwiki-source-b5ebd1b0d78d15bedec5d16c
    resource: repo://src/collections/content-date.ts
  - id: openwiki-source-1db4b916866998b5e5a79c8b
    resource: repo://src/components/site/JsonLd.tsx
  - id: openwiki-source-6c0a1d7da5ae3b7b9951765f
    resource: repo://src/lib/content-date/format.ts
  - id: openwiki-source-355927ee171fe71b0786ac63
    resource: repo://src/lib/content-date/rule.ts
  - id: openwiki-source-caf5d92ed3c44e218b23bbca
    resource: repo://src/lib/seo/json-ld.ts
  - id: openwiki-source-b8fb3f7f74646a64ef65d7f9
    resource: repo://src/lib/seo/share-card-art.ts
  - id: openwiki-source-ef420efe50fc16c57ab74ae5
    resource: repo://src/lib/seo/share-card-image.tsx
  - id: openwiki-source-4e5045b8b8f6c766f38d8a57
    resource: repo://src/lib/seo/share-card.ts
  - id: openwiki-source-70a68757393f697687fb55e0
    resource: repo://src/lib/site-copy/metadata.ts
  - id: openwiki-source-6c075afc076ebc8f82b84f46
    resource: repo://tests/integration/content-date.test.ts
  - id: openwiki-source-7d5e395999231b69b86cce6a
    resource: repo://tests/unit/content-date.test.ts
  - id: openwiki-source-ea19e1bc3b06dfe7c697a7b9
    resource: repo://tests/unit/json-ld.test.ts
  - id: openwiki-source-bc8086c1a449a6fce3b8bba2
    resource: repo://tests/unit/share-card-image.test.ts
  - id: openwiki-source-83e585f1b55d4116590df9be
    resource: repo://tests/unit/share-card.test.ts
generated: { by: "claude-code", at: "2026-11-20T11:20:16.585Z" }
---

# Share cards, JSON-LD and update dates

Three pieces of backlog S-19 and D-03 make a shared link and a search result look like the page: a share image per page, structured data, and the date Torre last changed the content.

## The share card

A link pasted in WhatsApp or Discord shows the page's own card, 1200 × 630 (`SHARE_CARD_SIZE`), drawn in the default theme's colors (Amakna dark, `SHARE_CARD_COLORS`, which `tests/unit/share-card.test.ts` compares with `theme.css`).

- **What it shows** (`ShareCard` in `src/lib/seo/share-card.ts`): the kind of page («Misión», «Logro», «Guía de Dofus», «Checklist», «Página», from `shareStrings` in `src/lib/seo/strings.ts`), the title in Rowdies capitals and the site's lockup. A quest guide or achievement page puts its zone landscape behind, under a flat veil of the background color at 74 percent, lighter than the page's own veil because the text is large and short and still passes 4.5:1 over a white map. A Dofus guide puts its egg beside the title. The title takes the largest size, of 88, 76, 66 and 56 px, that keeps it within three lines (`shareTitleSize`), narrower with the egg.
- **Where the data comes from**: `slugSeo` (`src/app/(frontend)/[slug]/seo-data.ts`), the same read the page and its metadata use. Quest guides and achievement pages pass their zone background's URL, Dofus guides their egg (`dofusEgg`), and standalone pages and checklists none.
- **Drawing it** (`src/lib/seo/share-card-image.tsx`): `next/og` renders the card on the server with Rowdies and Lexend TTF files from `src/styles/fonts/share-card/` (it cannot read woff2). `readShareArt` (`src/lib/seo/share-card-art.ts`) fetches the landscape or egg file wherever Media keeps it (public URL, bucket or disk, through the media regeneration's `originalReader`) and waits at most 5 seconds; a missing or slow file gives the plain card, so a page never loses its image. A card with a landscape is a JPEG, at the best quality of 82, 74, 66 or 58 that stays under 200 KB; a plain card or one with an egg is a palette PNG. Its inline styles are the one exception to the "inline styles only pass data" rule (see [Design system components](../frontend/design-system-components.md)), because `next/og` has no stylesheets.
- **Routes**: `/<slug>/og` (`src/app/(frontend)/[slug]/og/route.ts`) is `force-static` with a 600-second `revalidate`: it is drawn on the first request and kept as a static page. No card is built at build time (`generateStaticParams` returns none, the build has no database). A draft never reaches it, since a static route has no draft mode, and a slug with no page answers 404. `/og` (`src/app/(frontend)/og/route.ts`) is the brand card («Torrente Arcano» and «Guías de Dofus en español»), drawn at build time without reading the database. `og` is a reserved slug.
- **URLs**: `shareCardImage` gives a page's `og:image` as `/<slug>/og?v=<version>`, relative so `metadataBase` makes it absolute, with its alt text and type. The version is a short hash of the card's kind, title, art and content date (`shareCardVersion`), because WhatsApp and Discord keep an image by its URL: when what the card draws changes, the URL changes and they fetch the new one.

Every `/<slug>` page uses its own card for Open Graph and a `summary_large_image` Twitter card, never the «Ajustes del sitio» image. The home page and the three indexes use Torre's image from «Ajustes del sitio» when he uploaded one, and the brand card otherwise (`siteShareImage`, see [Site settings, index texts and navigation](../cms/site-copy.md)).

## JSON-LD

`src/lib/seo/json-ld.ts` builds the structured data and `JsonLd` (`src/components/site/JsonLd.tsx`) renders it in a `<script type="application/ld+json">` with every `<` escaped (`jsonForScript`), so no name can close the tag.

- **Article**, on every quest guide, achievement page, Dofus guide and standalone page (`ArticleData` in `src/app/(frontend)/[slug]/page.tsx`; not on checklists). It carries the headline (the page's `h1`, cut to 110 characters as Google asks), the description, the share card as image, `datePublished` and `dateModified` from the content dates, `inLanguage: 'es'`, the page URL as `mainEntityOfPage`, Torre as author with his site and his social links from «Ajustes del sitio» as `sameAs`, and the site as publisher with its 512 px logo (`/img/marca/logo.png`, from `scripts/build-icons.ts`). Every URL is absolute. No `HowTo`: Google dropped its rich results.
- **WebSite**, on the home page, with a `SearchAction` whose target is `/buscar?q={search_term_string}`, the search results page that works without JavaScript (see [Site header, footer and search](../frontend/site-shell-and-search.md)).
- **BreadcrumbList**, rendered by the breadcrumb itself (see [Achievement page](../achievements/achievement-page.md)).

## «Actualizado el»: the content date

`updatedAt` moves on every write, scripts and imports included, so it cannot say when Torre changed what a page shows. Quest guides, achievement pages, Dofus guides, checklists and standalone pages carry a hidden `contentUpdatedAt` date (`contentDateField` in `src/collections/content-date.ts`) that only a person moves:

- `trackContentDate`, a `beforeChange` hook on each of the five collections, runs only on a save with `_status: published`; a draft changes nothing the site shows.
- It compares the published row before the save with the document after it, through `editorialFingerprint` (`src/lib/content-date/rule.ts`), which ignores the dates, the status, `importSnapshot`, the slug and the SEO, treats an empty value like a missing one, and counts a populated relation as its ID.
- A save by a panel user (`req.user`) sets the date to now when the content changed or the document is published for the first time, and keeps the published date otherwise. A save with no user (a script, an import, the seed) never moves it, except when it writes the date on purpose while creating a document (the E2E seed).
- A duplicate starts without the date and takes its own when published.

`contentDate` (`src/lib/content-date/format.ts`) turns a document into its two dates: published is the creation date and modified the content date, or the creation date when there is none (a page a script published that nobody changed since); a content date earlier than the creation date (a seed that writes it) moves the publication back, so the JSON-LD never says a page changed before it was published. `formatContentDate` writes «18 de noviembre de 2026» and the `YYYY-MM-DD` day for `<time datetime>`, in Torre's time zone (Madrid), the panel's. `UpdatedDate` renders «Actualizado el …» under the header of each page; see [Design system components](../frontend/design-system-components.md).

The `20261118_173121_content_updated_at` migration gave existing published documents a starting date (see [Database and migrations](../data/database.md)).

## Tests

- `tests/unit/share-card.test.ts`: the card version (stable, and changing with the title, the art or the content date), the `og:image` path, size, alt and type, the kinds' names, the settings image winning over the brand card, title sizes, and the colors against `theme.css`.
- `tests/unit/share-card-image.test.ts`: a quest guide card with its landscape as JPEG under the veil, a Dofus guide card with its egg as PNG, the plain card without the file, a very long title and the brand card.
- `tests/unit/json-ld.test.ts`: the Article's type, language, absolute URLs, author and publisher, dates (and none invented), the 110-character headline, Google's recommended fields, the home page's WebSite with its `SearchAction`, and the escaped JSON.
- `tests/unit/content-date.test.ts`: the Spanish date in Madrid time, `contentDate`, `editorialFingerprint` and `contentDateOnSave` (drafts, scripts, the seed writing the date, Torre publishing a change, publishing without one, the first publication).
- `tests/integration/content-date.test.ts`: the hook against a database (a new guide published by Torre, a script that publishes a change, a script that creates a published guide, Torre publishing a content change, and publishing without one or with only a new slug).
- `tests/unit/updated-date.test.tsx`: the «Actualizado el» line and where each header puts it.
