---
type: concept
title: Theme and mode
description: The two appearance settings, the theme (four free themes with Amakna as default, Ocre premium and entitlement-checked) and the dark or light mode, both kept in a cookie and localStorage and rendered by the server, plus the pre-paint script, the header theme picker, the ModeToggle island and the browser bar color.
tags: [frontend, theming, entitlements, client-island, accessibility]
sources:
  - id: openwiki-source-baf8ef0ad43916de8d10e9b0
    resource: repo://scripts/build-mode-eggs.ts
  - id: openwiki-source-7a2845694b67f1018000b585
    resource: repo://src/app/(frontend)/layout.tsx
  - id: openwiki-source-09c2bfa24e5ac15be5d30d29
    resource: repo://src/components/mode-toggle/mode-toggle.css
  - id: openwiki-source-3c5ad46d7eaeabd20ff4b64b
    resource: repo://src/components/mode-toggle/ModeToggle.tsx
  - id: openwiki-source-494435f3df1838e49db8671d
    resource: repo://src/components/mode-toggle/strings.ts
  - id: openwiki-source-f25b5fdf49e0879a6c35a45e
    resource: repo://src/components/site/SiteHeader.tsx
  - id: openwiki-source-940dac82d13ef3427d7d3428
    resource: repo://src/components/theme-picker/picker-ui.ts
  - id: openwiki-source-abe877511930df88e446352d
    resource: repo://src/components/theme-picker/ThemePicker.tsx
  - id: openwiki-source-755be5e180b5a1d98afeee35
    resource: repo://src/lib/theme/mode-script.ts
  - id: openwiki-source-6015a61e55e497f6fbe0cb23
    resource: repo://src/lib/theme/theme-color.ts
  - id: openwiki-source-aa3c4bb3373afa113c60c023
    resource: repo://src/lib/theme/theme.ts
  - id: openwiki-source-9c65b52c433aba335735dff5
    resource: repo://tests/e2e/temas.spec.ts
  - id: openwiki-source-4f0e0d6a1deeec15cf728d65
    resource: repo://tests/unit/mode-script.test.ts
  - id: openwiki-source-19a6e7362e85a326eb212853
    resource: repo://tests/unit/theme-picker.test.tsx
  - id: openwiki-source-ca22a46c7864184d49dc01b8
    resource: repo://tests/unit/theme.test.ts
generated: { by: "claude-code", at: "2026-11-18T11:06:38.803Z" }
verified:
  - by: openwiki/0.4.3
    at: 2026-11-18T11:06:38.803Z
---

# Theme and mode

The site has two appearance settings. Both live on `<html>` as attributes, and the palettes in `theme.css` are keyed by the pair (see [Styles, tokens and site shell](styles-and-shell.md)).

| | Theme (`data-theme`) | Mode (`data-mode`) |
|---|---|---|
| Values | `amakna`, `arcano`, `bonta`, `brakmar`, `ocre` | `dark`, `light` |
| Default | `amakna` | `dark` |
| Cost | Amakna, Arcano, Bonta and Brâkmar are free (`FREE_THEMES`, in the picker's order); Ocre is premium | Free for everyone |
| Who chooses | The visitor, in the header's theme picker; the server renders it, and only with the entitlement for Ocre | The visitor, with the mode switch |
| Where it lives | Cookie `ta-theme` plus `localStorage` | Cookie `ta-mode` plus `localStorage` |

Both cookies carry the same attributes: `Path=/; Max-Age=31536000; SameSite=Lax` (one year, whole site), built by `themeCookie` and `modeCookie` in `src/lib/theme/theme.ts`.

## Server rendering

The frontend layout reads both cookies on every request:

- `resolveMode(value)` accepts only `dark` or `light` and falls back to `dark`.
- `resolveTheme(saved, { premium })` returns `amakna` (`DEFAULT_THEME`) for a missing or unknown value, the saved theme when it is free or the caller has the premium entitlement, and `amakna` otherwise. A saved value, from a cookie or the client, is never enough on its own to unlock Ocre: hiding a premium theme behind a client switch would hand it to everyone. There are no members yet, so the layout passes `{ premium: false }` and a cookie with `ocre` renders Amakna. When Better Auth and entitlements land, the layout will pass the member's real entitlement.

The HTML therefore arrives with the right `data-theme` and `data-mode` whenever the cookies exist, and the page renders per request. The proxy's 410 page reads the same cookies, with `isFreeTheme` instead of the entitlement (see [Request pipeline](../architecture/request-pipeline.md)).

## Inline `<head>` script

`src/lib/theme/mode-script.ts` runs before first paint:

- It first sets `data-js` on `<html>`: JavaScript is running, so the guide's rewards bag starts closed from the first paint (without JavaScript its list shows open). See [Design system components](design-system-components.md#the-client-island-pageenhancements).
- For the mode and the theme in turn, `pick` keeps a valid cookie (the server already rendered it); without one it reads `localStorage` under the same key (`ta-mode`, `ta-theme`), applies a valid value and writes it back to the cookie for the next request. `localStorage` access sits in `try/catch`, so strict private browsing does not break the page.
- The mode falls back to `dark`. The theme pattern lists only the free themes, so a stored `ocre` or an unknown value is ignored and the server's theme (Amakna) stays.

Because the script may change `data-mode`, `data-theme` and add `data-js` before React hydrates, `<html>` carries `suppressHydrationWarning`.

## Theme picker

`ThemePicker` (`src/components/theme-picker/ThemePicker.tsx`) sits in the site header before the mode switch. It is server markup, not an island: a `.tp-btn` menu button (`aria-haspopup="menu"`, its accessible name says the current theme) with the emblem's hat in the theme accent and a chevron, and a hidden popup with the title and one `menuitemradio` per free theme, the current one checked. Each option shows a swatch, a hat drawn inside a `data-theme`/`data-mode` element so its tokens resolve to that theme in the current mode. Ocre never appears in the menu. `idPrefix` lets the `/sistema` catalog render several without repeating ids.

The behavior lives in `picker-ui.ts`, which `HeaderIsland` loads with `import()` the first time the button is clicked or receives Down or Up, so it adds nothing to the initial JavaScript of guide pages (see [Site header, footer and search](site-shell-and-search.md)):

- `open` installs the listeners once, syncs the button and options with `<html>`, shows the popup and focuses the checked theme (Up focuses the last).
- In the menu, Down, Up, Home and End move the focus; Tab closes; Escape or a click outside closes and returns focus to the button unless the click moved it elsewhere.
- Choosing a theme calls `changeTheme`: with View Transitions and without reduced motion it adds `vt-tema` to `<html>` and applies the theme inside `document.startViewTransition`, so the colors cross-fade; otherwise it applies it at once. `applyTheme` sets `data-theme`, writes the `ta-theme` cookie and writes `localStorage` inside `try/catch`.
- A `MutationObserver` on `data-theme` and `data-mode` keeps the open menu in sync, so the swatches follow the mode switch.
- On mount, the island loads the module only when the picker's `data-current` differs from `<html data-theme>` (the head script restored a theme from `localStorage`), to fix the button and options.

Styles live in `theme-picker.css`, imported by `site.css`.

## Browser bar color

`src/lib/theme/theme-color.ts` maps each theme and mode to the header bar color (`BAR_COLORS`, the `--t-bar` of `theme.css`; `tests/unit/theme-color.test.ts` checks they match). The layout's `generateViewport` returns `themeViewport(theme, mode)`, the `themeColor` and `colorScheme` of the cookies' theme and mode, so a phone browser's bar and the site header are one. On the client, `ModeToggle` keeps `<meta name="theme-color">` up to date: on mount and whenever a `MutationObserver` sees `data-theme` or `data-mode` change (the mode switch, the theme picker or the head script), it writes the computed `--color-bar`.

## ModeToggle island

`src/components/mode-toggle/ModeToggle.tsx` is a `"use client"` island rendered by the site header (`SiteHeader`), on every public page.

- It reads the mode from `<html data-mode>` through `useSyncExternalStore`, with the server value (`initialMode`) as the server snapshot, so the DOM attribute is the single source of truth.
- `applyMode` sets the attribute, writes the cookie, writes `localStorage` inside `try/catch` (the cookie is enough if storage throws) and notifies subscribers synchronously with `flushSync`.
- When View Transitions exist and the user has not asked for reduced motion, `changeMode` adds `vt-to-dark` or `vt-to-light` to `<html>` and runs `applyMode` inside `document.startViewTransition`; the CSS reveals the new mode diagonally. Otherwise the mode changes immediately.
- The button is a `role="switch"` with `aria-checked` true in light mode, a fixed Spanish accessible name ("Modo claro") and a `title` that names the current mode, its egg and the action.
- It shows two game item icons, Dofus Marfil for light and Dofus Ébano for dark, as `<picture>` elements with AVIF and WebP sources at 1x and 2x of the 28px display size. The variants were generated offline by `scripts/build-mode-eggs.ts` from the PNGs in `public/img/mode/`; nothing is optimized on request.
- Click animations (arc, hatch, sparks, pop) are restarted by removing and re-adding classes, and are skipped under reduced motion.
- The medallion is flat: `--color-surface` with a control border (`--color-muted` at 70 percent over `--color-line`, 3:1 on the header bar), so it is light in light mode and dark in dark mode, with no glow around the eggs or the sparks, which take the theme accents. Its sizes are in rem, and each spark's end offset passes to the CSS in rem as `--dx` and `--dy`, so the switch grows with the root font.

Copy and asset paths live in `src/components/mode-toggle/strings.ts`; styles and keyframes in `mode-toggle.css`.

## Tests

- `tests/unit/theme.test.ts`: mode fallback; Amakna for a visitor without a saved theme; the free themes Amakna, Arcano, Bonta and Brâkmar in that order; Ocre never without the entitlement even when saved, and given with it; unknown themes ignored; both cookies kept a year for the whole site.
- `tests/unit/mode-script.test.ts`: `data-js` set before first paint; for the mode, the cookie respected, `localStorage` recovered and written back to the cookie, dark default, unknown values ignored and a throwing `localStorage` tolerated; for the theme, a free theme's cookie respected, `localStorage` recovered and written back, Amakna left without either, Ocre or an unknown theme never applied, and a throwing `localStorage` tolerated.
- `tests/unit/theme-picker.test.tsx`: a menu button named after the current theme; the four free themes in order with the current one checked and never Ocre; each swatch carrying its theme and the current mode; the emblem's hat; the menu closed at first; every theme named, Ocre included for whoever has it; server markup, not an island; the header island loading `picker-ui` only with `import()`.
- `tests/unit/theme-color.test.ts`: `BAR_COLORS` equal to each theme and mode's `--t-bar`, and `themeViewport`.
- `tests/unit/mode-toggle-strings.test.ts`: accessible name, egg per mode, `srcset` format, title text.
- `tests/e2e/temas.spec.ts`: Amakna without a cookie; a free theme's cookie rendered; an Ocre cookie rendering Amakna; the `localStorage` theme applied and the cookie rewritten; the picker before the mode switch; the four free themes without Ocre; swatches in their theme's accent and the current mode; arrows, Enter and saving; a click applying the theme and changing the page colors; Down opening on the current theme; Escape and an outside click closing and returning focus; swatches following the mode; the menu as a fixed panel under the header inside the viewport; and the browser bar color rendered from the cookies and following the mode switch.

## Related pages

- [Styles, tokens and site shell](styles-and-shell.md)
- [Site header, footer and search](site-shell-and-search.md)
- [Request pipeline](../architecture/request-pipeline.md)
