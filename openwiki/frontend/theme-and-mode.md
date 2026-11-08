---
type: concept
title: Theme and mode
description: The two independent appearance settings, a server-decided theme gated by premium entitlement and a free dark or light mode kept in a cookie and localStorage, plus the pre-paint script and the ModeToggle island.
tags: [frontend, theming, entitlements, client-island, accessibility]
sources:
  - id: openwiki-source-baf8ef0ad43916de8d10e9b0
    resource: repo://scripts/build-mode-eggs.ts
  - id: openwiki-source-7a2845694b67f1018000b585
    resource: repo://src/app/(frontend)/layout.tsx
  - id: openwiki-source-3c5ad46d7eaeabd20ff4b64b
    resource: repo://src/components/mode-toggle/ModeToggle.tsx
  - id: openwiki-source-494435f3df1838e49db8671d
    resource: repo://src/components/mode-toggle/strings.ts
  - id: openwiki-source-f25b5fdf49e0879a6c35a45e
    resource: repo://src/components/site/SiteHeader.tsx
  - id: openwiki-source-755be5e180b5a1d98afeee35
    resource: repo://src/lib/theme/mode-script.ts
  - id: openwiki-source-aa3c4bb3373afa113c60c023
    resource: repo://src/lib/theme/theme.ts
  - id: openwiki-source-4f0e0d6a1deeec15cf728d65
    resource: repo://tests/unit/mode-script.test.ts
  - id: openwiki-source-ca22a46c7864184d49dc01b8
    resource: repo://tests/unit/theme.test.ts
generated: { by: "claude-code", at: "2026-11-08T11:00:21.339Z" }
verified:
  - by: openwiki/0.4.3
    at: 2026-11-08T11:00:21.339Z
---

# Theme and mode

The site has two appearance settings that are easy to confuse and are handled in opposite ways.

| | Theme (`data-theme`) | Mode (`data-mode`) |
|---|---|---|
| Values | `arcano`, `amakna`, `bonta`, `brakmar`, `ocre` | `dark`, `light` |
| Default | `arcano` | `dark` |
| Cost | Arcano is free; the other four are premium | Free for everyone |
| Who decides | The server, per request, against the member's entitlement | The visitor; stored client-side |
| Where it lives | A member setting (planned) | Cookie `ta-mode` plus `localStorage` |

Both are attributes on `<html>`, and the palettes in `theme.css` are keyed by the pair. See [Styles, tokens and site shell](styles-and-shell.md).

## Theme: server-side, entitlement-checked

`resolveTheme(saved, { premium })` in `src/lib/theme/theme.ts` returns:

- `arcano` for a missing or unknown value;
- the saved theme if it is free or the caller has the premium entitlement;
- `arcano` otherwise.

A saved value, whether from a cookie or the client, is never enough on its own to unlock a premium theme. That is deliberate: hiding a premium theme behind a client switch would hand it to everyone. Today there are no members, so the layout calls `resolveTheme(undefined, { premium: false })` and everyone gets Arcano. When Better Auth and entitlements land, the layout will pass the member's saved theme and real entitlement.

The inline mode script and the toggle never touch `data-theme`.

## Mode: cookie first, then localStorage

The mode has three writers, arranged so the first paint is already correct:

1. **Server.** The layout reads the `ta-mode` cookie and passes it through `resolveMode`, which accepts only `dark` or `light` and falls back to `dark`. The HTML arrives with the right `data-mode` whenever the cookie exists.
2. **Inline `<head>` script** (`src/lib/theme/mode-script.ts`), which runs before first paint:
   - It first sets `data-js` on `<html>`: JavaScript is running, so the guide's rewards bag starts closed from the first paint (without JavaScript its list shows open). See [Design system components](design-system-components.md#the-client-island-pageenhancements).
   - If the cookie holds a valid mode, it keeps it (the server already rendered it).
   - If there is no valid cookie, it reads `localStorage['ta-mode']`; a valid value is applied and written back to the cookie for the next request.
   - Otherwise it applies `dark`.
   - `localStorage` access sits in `try/catch`, so strict private browsing does not break the page.
3. **`ModeToggle`**, on click (below).

The cookie is `ta-mode=<mode>; Path=/; Max-Age=31536000; SameSite=Lax` (one year, whole site). `modeCookie` builds it and the script interpolates the same attribute string.

Because the script may change `data-mode` and adds `data-js` before React hydrates, `<html>` carries `suppressHydrationWarning`.

## ModeToggle island

`src/components/mode-toggle/ModeToggle.tsx` is a `"use client"` island rendered by the site header (`SiteHeader`), on every public page.

- It reads the mode from `<html data-mode>` through `useSyncExternalStore`, with the server value (`initialMode`) as the server snapshot, so the DOM attribute is the single source of truth.
- `applyMode` sets the attribute, writes the cookie, writes `localStorage` inside `try/catch` (the cookie is enough if storage throws) and notifies subscribers synchronously with `flushSync`.
- When View Transitions exist and the user has not asked for reduced motion, `changeMode` adds `vt-to-dark` or `vt-to-light` to `<html>` and runs `applyMode` inside `document.startViewTransition`; the CSS reveals the new mode diagonally. Otherwise the mode changes immediately.
- The button is a `role="switch"` with `aria-checked` true in light mode, a fixed Spanish accessible name ("Modo claro") and a `title` that names the current mode, its egg and the action.
- It shows two game item icons, Dofus Marfil for light and Dofus Ébano for dark, as `<picture>` elements with AVIF and WebP sources at 1x and 2x of the 28px display size. The variants were generated offline by `scripts/build-mode-eggs.ts` from the PNGs in `public/img/mode/`; nothing is optimized on request.
- Click animations (arc, hatch, sparks, pop) are restarted by removing and re-adding classes, and are skipped under reduced motion.

Copy and asset paths live in `src/components/mode-toggle/strings.ts`; styles and keyframes in `mode-toggle.css`.

## Tests

- `tests/unit/theme.test.ts`: mode fallback, theme fallback, premium themes refused without entitlement and granted with it, unknown themes ignored, cookie attributes.
- `tests/unit/mode-script.test.ts`: `data-js` set before first paint, cookie respected, localStorage recovered and written back to the cookie, dark default, unknown values ignored, throwing `localStorage` tolerated, theme untouched.
- `tests/unit/mode-toggle-strings.test.ts`: accessible name, egg per mode, `srcset` format, title text.

## Related pages

- [Styles, tokens and site shell](styles-and-shell.md)
- [Request pipeline](../architecture/request-pipeline.md)
