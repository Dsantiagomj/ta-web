---
type: component
title: Styles, tokens and site shell
description: The Tailwind v4 token system in src/styles/theme.css, how theme and mode variables cascade, the self-hosted fonts, global base styles, and the current frontend layout, home page and Spanish string modules.
tags: [frontend, styles, tailwind, design-tokens, fonts]
sources:
  - id: openwiki-source-05e2b0767246ac84ffc965a9
    resource: repo://postcss.config.mjs
  - id: openwiki-source-5d69c4cb9b57f0cabb257677
    resource: repo://scripts/build-icons.ts
  - id: openwiki-source-7a2845694b67f1018000b585
    resource: repo://src/app/(frontend)/layout.tsx
  - id: openwiki-source-aafaf952c3fb594c6ce91656
    resource: repo://src/app/(frontend)/page.tsx
  - id: openwiki-source-d91bcfe9b85be5b5860292ba
    resource: repo://src/app/(frontend)/strings.ts
  - id: openwiki-source-ebaecf0b9cf2bccc008459f4
    resource: repo://src/lib/theme/palette.ts
  - id: openwiki-source-00e98c80a081b2d7e398f66d
    resource: repo://src/styles/fonts-fallback.css
  - id: openwiki-source-f08bc745a5a8ab8a9a69907f
    resource: repo://src/styles/fonts.ts
  - id: openwiki-source-13697ff46e81b49dcb27ba68
    resource: repo://src/styles/globals.css
  - id: openwiki-source-8728a958dd5a79ae9c3ca846
    resource: repo://src/styles/theme.css
  - id: openwiki-source-82f08a433a1f3b4a0e0ee9bb
    resource: repo://tests/unit/emblem.test.tsx
  - id: openwiki-source-a43a9e5ed45afaa192ecca23
    resource: repo://tests/unit/fonts.test.ts
  - id: openwiki-source-058129a0b4275cdaafea29f9
    resource: repo://tests/unit/theme-css.test.ts
generated: { by: "claude-code", at: "2026-11-06T15:25:11.354Z" }
verified:
  - by: openwiki/0.4.3
    at: 2026-11-06T15:25:11.354Z
---

# Styles, tokens and site shell

Visual rules live in `DESIGN.md`. The tokens ship in `src/styles/theme.css`, and when the two disagree the CSS wins and `DESIGN.md` gets fixed. This page explains how the CSS is wired; read `DESIGN.md` for what to use when.

## Pipeline

PostCSS runs only `@tailwindcss/postcss` (`postcss.config.mjs`). `src/styles/globals.css` imports `tailwindcss`, then `theme.css` and `fonts-fallback.css`, and the frontend layout imports `globals.css`. There is no `tailwind.config` file: Tailwind v4 reads everything from the `@theme` blocks.

## Token layers in theme.css

`theme.css` has four token layers and one rule for nested themes.

1. **`@theme static`: scales.** It first resets Tailwind's defaults (`--color-*: initial`, `--font-*`, `--text-*`, `--radius-*`, `--shadow-*`, `--ease-*`, `--breakpoint-*`), so only our tokens exist and a stray `bg-blue-500` does not compile to anything. Then it defines `--spacing`, the type scale (`--text-hero` down to `--text-micro`, with line height, weight and tracking per step; the display steps are weight 600 with no extra tracking), radii (`--radius-xs` … `--radius-pill`, including `--radius-card`), easings and breakpoints (`sm` 40rem, `md` 48rem, `lg` 64rem, `xl` 80rem). `--color-section` defaults to the theme accent; each section root will set it to its own accent.
2. **`@theme static inline`: semantic tokens.** `--color-bg`, `--color-surface`, `--color-ink`, `--color-accent` and the rest point at raw `--t-*` variables. Fonts (`--font-display`, `--font-body`, `--font-accent`) point at the `next/font` variables (`--font-fredoka`, `--font-nunito`, `--font-lilita-one`), then the Linux fallback faces, then the family names. The icon well and slot colors (`--color-well`, `--color-slot` and their lines) point at `--t-well` and `--t-slot`. Shadows are built from per-mode alpha variables. Because these are `inline`, utilities like `bg-surface` resolve to `var(--t-surface)` at use time, so switching a palette is just changing which `--t-*` values apply.
3. **`:root` plain variables** for things Tailwind has no namespace for: `--z-*` layers, `--duration-*` and `--width-*` containers (`wide` 1400px, `page` 1200px, `hero` 1100px, `prose` 800px).
4. **Palettes.** One selector per theme and mode, `[data-theme='…'][data-mode='…']`, for the five themes `arcano`, `amakna`, `bonta`, `brakmar` and `ocre`. Arcano dark is also the `:root` value, so a page with missing or unknown attributes still renders correctly. Status colors and the seven section accents (`misiones`, `logros`, `dofus`, `checklists`, `clases`, `mazmorras`, `herramientas`) depend only on the mode. Shadow alphas are halved in light mode. The game icon wells also depend only on the mode: in dark mode a well is a mix of background and surface; in light mode the step-number well is the raised color, while the slot behind a full-color game icon stays dark (84 percent ink), because the game paints its icons for a dark background.

The same names work as Tailwind utilities and in hand-written CSS (`var(--color-surface)`), which the ModeToggle stylesheet, `ui.css`, `game.css` and the future checklist app rely on.

### Nested themes

A CSS variable that points at another variable is resolved where it is declared and inherited already resolved. The semantic tokens are declared on `:root`, so without help `var(--color-accent)` inside an element with `data-theme="bonta"` would still give Arcano dark's accent. Utilities are not affected, because they read the `--t-*` values directly; hand-written CSS is. The last block of `theme.css` therefore re-declares every semantic color token (the well and slot colors included), `--color-section` (back to the theme accent) and the four shadows on any `[data-theme]` or `[data-mode]` element. It sits in `@layer base`, so a utility that sets `--color-section` on the same element still wins. The `/sistema` sections and the fullscreen image viewer depend on it. `tests/unit/theme-css.test.ts` reads `theme.css` and checks that every `--color-*: var(--t-*)` token of the inline `@theme` block is re-declared there. See [Component catalog](component-catalog.md).

## Fonts

`src/styles/fonts.ts` loads three families through `next/font/google`: Nunito for body text, Fredoka for headlines (DESIGN.md, Typography; guide v4) and Lilita One for accent figures. Next downloads them at build time and serves them from the site with adjusted fallback metrics, so the swap does not shift layout.

| Family | Weights | Preloaded | Used for |
|---|---|---|---|
| Nunito | 400 | yes | Body text, the first paint |
| Nunito | 500, 600, 700, 800 | no | Controls and chips (500, 600), bold body text (700), quantities and coordinates (800) |
| Fredoka | 600 | yes | Headlines, from the brand to the guide title and the home headline |
| Fredoka | 500 | no | Navigation |
| Lilita One | 400 | no | Accent figures |

Only two files are preloaded, Nunito 400 and Fredoka 600. A preloaded font is always downloaded and competes with the CSS and the LCP image for the network: with six weights preloaded, a guide's first screenshot took 1.8 s to arrive on slow 4G. `next/font` preloads per instance, not per weight, so each family is split into a preloaded instance and an on-demand one (`preload: false`). Turbopack declares both under the same family name, so the browser sees one family with every weight and never synthesizes a bold; `tests/e2e/fonts.spec.ts` checks that on the page. All five variables go on `<html>` so the on-demand `@font-face` rules reach the page, but the styles only use `--font-nunito` and `--font-fredoka`. `tests/unit/fonts.test.ts` pins the preload choice and the weights.

`next/font`'s generated fallback faces ("Nunito Fallback", "Fredoka Fallback") are built on `local(Arial)`. Linux and Android ship no Arial, so there the text painted in the wider system sans until the web font arrived, and the line changes shifted the page (CLS 0.19 on the guide in CI). `src/styles/fonts-fallback.css` adds "Nunito Fallback Linux", "Fredoka Fallback Linux" and "Lilita One Fallback Linux" with the same size and ascent/descent overrides over fonts with Arial's metrics (Liberation Sans, Arimo) and, on Android, Roboto. The values are copied from the CSS `next/font` compiles; changing a family means copying them again.

These choices serve the LCP and CLS budgets in [Performance budgets](../testing/performance-budgets.md).

## Global base styles

`globals.css` sets, in `@layer base`:

- `color-scheme: dark` on `html`, switched to `light` under `html[data-mode='light']`, with background and text from the tokens.
- Body font, size and line height from the tokens, and no mid-word breaking or automatic hyphenation.
- A visible `:focus-visible` outline in the ink color.
- Links in the accent color.
- Under `prefers-reduced-motion: reduce`, animation and transition durations collapse to near zero for every element, its `::before` and `::after`, and `::backdrop`, so the fullscreen viewer's backdrop fade is covered too.

## Site shell

`src/app/(frontend)/layout.tsx` is the root layout of the public site. It:

- builds `metadata` with `metadataBase` from `NEXT_PUBLIC_SITE_URL`, and the title and description from `siteStrings`;
- renders `<html lang="es">` with `data-theme`, `data-mode`, the font variables and `suppressHydrationWarning` (the inline script may change `data-mode` before hydration);
- injects the mode script into `<head>`;
- renders a header with the brand link (the Torre emblem, 30 px on phones and 36 px from `md`, next to "Torrente Arcano") and the `ModeToggle` island, then the page.

The favicon and the iOS icon are files in `src/app/(frontend)/` that Next links by name: `icon2.svg` (the simple emblem on an Arcano dark tile, light under a light color scheme), `icon1.png` (a 32 px fallback) and `apple-icon.png` (180 px, the full emblem on a square tile). `node scripts/build-icons.ts` generates them from the emblem drawing in `src/components/brand/emblem-art.ts` and the Arcano colors read from `theme.css` by `readPalette` (`src/lib/theme/palette.ts`). `tests/unit/emblem.test.tsx` checks that the committed `icon2.svg` matches what the script generates. See [Design system components](design-system-components.md#brand-srccomponentsbrand).

Quest guides render at `/<slug>`; see [Public quest guide page](guide-page.md). A missing page renders the Spanish 404 in `not-found.tsx`. `src/app/(frontend)/page.tsx` is the current home: a placeholder that says the new site is under construction, links to the existing torrentearcano.com and shows the phase. It uses only token utilities (`text-hero`, `text-eyebrow`, `bg-surface`, `rounded-card`, `max-w-(--width-page)`).

## Copy lives in string modules

UI copy is Spanish and sits in `strings.ts` files next to what uses it (`src/app/(frontend)/strings.ts`, `src/components/mode-toggle/strings.ts`, `src/components/game/strings.ts`, `src/lib/guides/strings.ts`), not inline in JSX. Components import an object such as `homeStrings` and read fields from it. This keeps copy reviewable in one place and testable.

## Related pages

- [Theme and mode](theme-and-mode.md)
- [Project overview](../overview.md)
- [Design system components](design-system-components.md)
- [Component catalog (/sistema)](component-catalog.md)
