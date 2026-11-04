---
type: component
title: Styles, tokens and site shell
description: The Tailwind v4 token system in src/styles/theme.css, how theme and mode variables cascade, the self-hosted fonts, global base styles, and the current frontend layout, home page and Spanish string modules.
tags: [frontend, styles, tailwind, design-tokens, fonts]
verified:
  - by: openwiki/0.4.3
    at: 2026-11-04T00:16:52.047Z
sources:
  - id: openwiki-source-05e2b0767246ac84ffc965a9
    resource: repo://postcss.config.mjs
  - id: openwiki-source-7a2845694b67f1018000b585
    resource: repo://src/app/(frontend)/layout.tsx
  - id: openwiki-source-aafaf952c3fb594c6ce91656
    resource: repo://src/app/(frontend)/page.tsx
  - id: openwiki-source-d91bcfe9b85be5b5860292ba
    resource: repo://src/app/(frontend)/strings.ts
  - id: openwiki-source-f08bc745a5a8ab8a9a69907f
    resource: repo://src/styles/fonts.ts
  - id: openwiki-source-13697ff46e81b49dcb27ba68
    resource: repo://src/styles/globals.css
  - id: openwiki-source-8728a958dd5a79ae9c3ca846
    resource: repo://src/styles/theme.css
generated: { by: "claude-code", at: "2026-11-04T00:16:52.047Z" }
---

# Styles, tokens and site shell

Visual rules live in `DESIGN.md`. The tokens ship in `src/styles/theme.css`, and when the two disagree the CSS wins and `DESIGN.md` gets fixed. This page explains how the CSS is wired; read `DESIGN.md` for what to use when.

## Pipeline

PostCSS runs only `@tailwindcss/postcss` (`postcss.config.mjs`). `src/styles/globals.css` imports `tailwindcss` and then `theme.css`, and the frontend layout imports `globals.css`. There is no `tailwind.config` file: Tailwind v4 reads everything from the `@theme` blocks.

## Token layers in theme.css

`theme.css` has four layers.

1. **`@theme static`: scales.** It first resets Tailwind's defaults (`--color-*: initial`, `--font-*`, `--text-*`, `--radius-*`, `--shadow-*`, `--ease-*`, `--breakpoint-*`), so only our tokens exist and a stray `bg-blue-500` does not compile to anything. Then it defines `--spacing`, the type scale (`--text-hero` down to `--text-micro`, with line height, weight and tracking per step), radii (`--radius-xs` … `--radius-pill`, including `--radius-card`), easings and breakpoints (`sm` 40rem, `md` 48rem, `lg` 64rem, `xl` 80rem). `--color-section` defaults to the theme accent; each section root will set it to its own accent.
2. **`@theme static inline`: semantic tokens.** `--color-bg`, `--color-surface`, `--color-ink`, `--color-accent` and the rest point at raw `--t-*` variables. Fonts (`--font-display`, `--font-body`, `--font-accent`) point at the `next/font` variables with fallbacks. Shadows are built from per-mode alpha variables. Because these are `inline`, utilities like `bg-surface` resolve to `var(--t-surface)` at use time, so switching a palette is just changing which `--t-*` values apply.
3. **`:root` plain variables** for things Tailwind has no namespace for: `--z-*` layers, `--duration-*` and `--width-*` containers (`wide` 1400px, `page` 1200px, `hero` 1100px, `prose` 800px).
4. **Palettes.** One selector per theme and mode, `[data-theme='…'][data-mode='…']`, for the five themes `arcano`, `amakna`, `bonta`, `brakmar` and `ocre`. Arcano dark is also the `:root` value, so a page with missing or unknown attributes still renders correctly. Status colors and the seven section accents (`misiones`, `logros`, `dofus`, `checklists`, `clases`, `mazmorras`, `herramientas`) depend only on the mode. Shadow alphas are halved in light mode.

The same names work as Tailwind utilities and in hand-written CSS (`var(--color-surface)`), which the ModeToggle stylesheet and the future checklist app rely on.

## Fonts

`src/styles/fonts.ts` loads Barlow (400–700), Barlow Condensed (500–800) and Lilita One (400) through `next/font/google`. Next downloads them at build time and serves them from the site with adjusted fallback metrics, so the swap does not shift layout. Each font exposes a CSS variable (`--font-barlow`, `--font-barlow-condensed`, `--font-lilita-one`); `fontVariables` joins the three class names and the layout puts them on `<html>`.

## Global base styles

`globals.css` sets, in `@layer base`:

- `color-scheme: dark` on `html`, switched to `light` under `html[data-mode='light']`, with background and text from the tokens.
- Body font, size and line height from the tokens, and no mid-word breaking or automatic hyphenation.
- A visible `:focus-visible` outline in the ink color.
- Links in the accent color.
- Under `prefers-reduced-motion: reduce`, animation and transition durations collapse to near zero for every element.

## Site shell

`src/app/(frontend)/layout.tsx` is the root layout of the public site. It:

- builds `metadata` with `metadataBase` from `NEXT_PUBLIC_SITE_URL`, and the title and description from `siteStrings`;
- renders `<html lang="es">` with `data-theme`, `data-mode`, the font variables and `suppressHydrationWarning` (the inline script may change `data-mode` before hydration);
- injects the mode script into `<head>`;
- renders a header with the brand link and the `ModeToggle` island, then the page.

`src/app/(frontend)/page.tsx` is the current home: a placeholder that says the new site is under construction, links to the existing torrentearcano.com and shows the phase. It uses only token utilities (`text-hero`, `text-eyebrow`, `bg-surface`, `rounded-card`, `max-w-(--width-page)`).

## Copy lives in string modules

UI copy is Spanish and sits in `strings.ts` files next to what uses it (`src/app/(frontend)/strings.ts`, `src/components/mode-toggle/strings.ts`, `src/lib/dev-gate/strings.ts`), not inline in JSX. Components import an object such as `homeStrings` and read fields from it. This keeps copy reviewable in one place and testable.

## Related pages

- [Theme and mode](theme-and-mode.md)
- [Project overview](../overview.md)
