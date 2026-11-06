---
type: feature
title: Component catalog (/sistema)
description: The /sistema page that renders every DESIGN.md component with real content in the five themes and both modes, the per-request gate that keeps it out of production, and the Playwright and axe checks that run against it.
tags: [design-system, catalog, frontend, accessibility, e2e]
sources:
  - id: openwiki-source-7382aecd8b46a81ca66efc96
    resource: repo://lighthouserc.cjs
  - id: openwiki-source-5e753d9d77984cb67aae1517
    resource: repo://playwright.config.ts
  - id: openwiki-source-a4f1ed9909db897cc87e2198
    resource: repo://src/app/(frontend)/sistema/catalog-data.tsx
  - id: openwiki-source-fbd21844e7a1a5ca44748d2c
    resource: repo://src/app/(frontend)/sistema/CatalogSection.tsx
  - id: openwiki-source-102ac9d3e731f9c02830d89f
    resource: repo://src/app/(frontend)/sistema/page.tsx
  - id: openwiki-source-cbc6ab52e896365649760a9f
    resource: repo://src/lib/dev-gate/design-catalog.ts
  - id: openwiki-source-8b0b9cc5ebf1012175c3d759
    resource: repo://tests/e2e/sistema.spec.ts
  - id: openwiki-source-6da55c25d9257d55461d50ff
    resource: repo://tests/unit/design-catalog.test.ts
generated: { by: "claude-code", at: "2026-11-06T15:25:11.354Z" }
verified:
  - by: openwiki/0.4.3
    at: 2026-11-06T15:25:11.354Z
---

# Component catalog (/sistema)

`/sistema` is a page for the team and the tests, not for visitors. It renders every component in `src/components/ui/` and `src/components/game/` with real content, once per theme and mode: five themes (`arcano`, `amakna`, `bonta`, `brakmar`, `ocre`) times two modes (`dark`, `light`), ten sections in all. DESIGN.md (Component catalog) asks that a new component, or a new state of one, is added there in the same PR.

It is the one place that shows every component and state side by side; the [public quest guide page](guide-page.md) renders the game components with a real guide. See [Design system components](design-system-components.md) for what each component does.

## Who can open it

`src/app/(frontend)/sistema/page.tsx` calls `isDesignCatalogEnabled(process.env)` (`src/lib/dev-gate/design-catalog.ts`) and answers `notFound()` when it returns false. The function returns true in exactly three cases:

| Case | Condition |
|---|---|
| Local development | `NODE_ENV=development` (`pnpm dev`) |
| The dev environment | `isDevEnvironment(env)`: `APP_ENV` or `RAILWAY_ENVIRONMENT_NAME` is `dev`. Dev is public but never indexed (see [Dev environment](../operations/dev-gate.md)), and the page itself is `noindex` |
| The E2E run | `E2E_DESIGN_CATALOG=1`, exactly `1`. `playwright.config.ts` passes it to the app server of `pnpm test:e2e`; no deployed environment sets it |

Anything else gets a 404, including production, `NODE_ENV=test`, and `E2E_DESIGN_CATALOG=true`. `tests/unit/design-catalog.test.ts` covers each case.

The page calls `await connection()` before reading the environment, so the decision is made on every request and never baked in at build time. That is what lets one `pnpm build` serve both the E2E run (catalog on) and a production start (catalog off). The page metadata also sets `robots: { index: false, follow: false }`.

`/sistema` is not in the Lighthouse CI page list (`lighthouserc.cjs` measures the home page and the seeded guide `/seis-pies-bajo-tierra`). See [Performance budgets](../testing/performance-budgets.md).

## Page structure

- The page header has the title "Sistema de diseño", a lead paragraph and a jump list with one link per section (`#arcano-dark`, `#bonta-light`, …).
- `CatalogSection` renders one `<section>` per theme and mode with its own `id`, `data-theme`, `data-mode` and `aria-labelledby`. Every id inside a section carries the `theme-mode` key, so the ten copies never repeat an id. The section sets `--color-section` to the missions accent, as a guide page root would.
- Inside, each component group is a `Group` with a `data-component` attribute (`brand`, `buttons`, `chips`, `callouts`, `torre`, `figures`, `checkbox`, `cards`, `items`, `header`, `wells`, `fight`, `coordinates`, `steps`, `chain`, `video`, `image`) and a heading from `catalogStrings.groups`. Groups show several states side by side: the Torre emblem in its simple 16 px variant and at 30, 36 and 64 px next to the wordmark, disabled and compact buttons, a checked and a disabled checkbox, a quest header with the NPC and full data and one without, every fixed game icon well plus an item icon and an empty well, the numbered steps next to the "Pasos" side list, a short and a trimmed achievement chain, a video with and without a poster.
- `<PageEnhancements />` is rendered once at the end, so coordinate copy, the video player and the fullscreen image viewer work on the page.

`?tema=` and `?modo=` filter the sections: `/sistema?tema=bonta&modo=light` keeps a single section, which is how screenshots and most E2E tests target one theme.

### Why sections can carry their own theme

Each section sets `data-theme` and `data-mode` on an element below `<html>`. Tailwind utilities read the raw `--t-*` tokens and follow that automatically, but hand-written CSS in `ui.css` and `game.css` uses semantic variables such as `var(--color-accent)`, which are resolved where they are declared (`:root`) and inherited already resolved. `src/styles/theme.css` therefore re-declares every semantic color and shadow token on any `[data-theme]` or `[data-mode]` element, in the base layer. See [Styles, tokens and site shell](styles-and-shell.md).

## Content

`src/app/(frontend)/sistema/catalog-data.tsx` holds the sample data: Torre's guide "Seis pies bajo tierra" (DofusDB quest 1976), "Entretanto, un renacer" (2420) and the video of "Intoxicación profunda" (1433), with game art taken from the guide mockups and the quest NPC's renders (NPC 4412, facing right and left, trimmed as the refresh trims them). The images under `public/img/sistema/` are AVIF and WebP pairs generated once from those mockups, described with their real width and height; screenshots also have narrower widths (`<name>-480.webp`, from `scripts/build-catalog-images.ts`) for `srcset`.

`src/app/(frontend)/sistema/strings.ts` (`catalogStrings`) holds the page's own Spanish text: titles, theme and mode names, group headings, notes and demo labels. Component text stays in the components' own string modules.

## Tests

`tests/e2e/sistema.spec.ts` runs against the production build of `pnpm test:e2e`:

- every `data-component` group is visible in all ten sections;
- in each section, a Torre tips box's background equals that section's `--t-surface` and a coordinates chip's color equals its `--t-accent`, which proves the hand-written CSS follows the section theme;
- clicking a coordinates chip copies `/travel 1,-17` and the status toast says "Copiado: /travel 1,-17"; Enter on another chip does the same;
- every `.hit-target` element has an `::after` of at least 40px, and the 32px coordinates chip has a target of at least 40px;
- the icon wells stay dark in light mode, in every theme;
- the video facade makes no request to a YouTube, `ytimg` or `googlevideo` host until clicked, and the click inserts a `youtube-nocookie.com/embed/…?autoplay=1` iframe;
- a figure opens the viewer dialog with the loaded image and its caption, the dialog copies the section's `data-theme`, Esc closes it, and focus returns to the link; at 390px the image fits the viewport, and both the "Cerrar" button and a click on the backdrop close it;
- axe (`@axe-core/playwright`, tags `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa`) reports no violations for the open viewer and for the whole page, after waiting for every animation to finish so contrast is measured at rest;
- at 390px wide, a screenshot loads its 480 px AVIF and the viewer opens the widest one.

See [Test suites](../testing/test-suites.md).

## Related pages

- [Design system components](design-system-components.md)
- [Theme and mode](theme-and-mode.md)
- [Styles, tokens and site shell](styles-and-shell.md)
- [Public quest guide page](guide-page.md)
- [Dev environment gate](../operations/dev-gate.md)
- [Test suites](../testing/test-suites.md)
