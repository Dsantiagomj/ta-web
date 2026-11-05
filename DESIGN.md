# Design language

The visual rules for the new torrentearcano.com. Structure, density and motion follow the study of duffus.fr in `docs/research/duffus-visual.md`. Color, art and the theme switch are our own. The tokens ship in `src/styles/theme.css`; when it and this file disagree, the CSS wins and this file gets fixed.

## Principles

1. **The game art carries the page.** Real Dofus art only: zone landscapes, NPC renders, monster images, class symbols, item, job and achievement icons. No emoji, stock illustration or hand-drawn generic icons. The interface stays quiet around the art.
2. **Reading first.** Most visits are a player with the game open beside the browser, following one quest. Body text stays at 16px, steps are easy to scan, coordinates copy in one click.
3. **Dense, not cramped.** Lists of 50 quests and checklists of 100 steps must fit on a screen without feeling like a spreadsheet. Small gaps inside components, generous gaps between sections.
4. **Fast by default.** Guide pages are server-rendered with no client JavaScript beyond the shell and one small island that copies coordinates and loads videos on click. Motion is CSS unless it lives inside a client island.
5. **One job per color.** `accent` marks progress, links, coordinates and the primary action; `accent-2` marks featured numbers and tags; the section accent marks details. No color is ever a button fill.
6. **Arcano, dark, by default.** Five themes, each with a dark and a light mode. Arcano is free for everyone; Amakna, Bonta, Brâkmar and Ocre are premium. Every text pair passes WCAG AA in every theme and mode.

## Tokens

Tokens are CSS custom properties declared in a Tailwind v4 `@theme` block in `src/styles/theme.css`. Why Tailwind v4 names:

- `@theme` emits every token as a plain CSS variable on `:root`, so the same names work as utilities (`bg-surface`, `text-ink-2`, `rounded-card`) and in hand-written CSS (`var(--color-surface)`). The checklist app we lift in phase 2a has 3 400 lines of plain CSS; it can switch to these variables without adopting utilities.
- The namespaces (`--color-*`, `--font-*`, `--text-*`, `--radius-*`, `--shadow-*`, `--ease-*`, `--breakpoint-*`, `--spacing`) are Tailwind's, so utilities are generated without config.
- Tokens Tailwind has no namespace for (z-index, durations, containers for content width) are plain variables with the same naming style: `--z-*`, `--duration-*`, `--width-*`.

### Themes

Decided 2026-11-02. Five themes named after Dofus places and the Dofus Ocre, each with a dark and a light mode:

| Theme | Access |
|---|---|
| Arcano | free, the default for everyone |
| Amakna, Bonta, Brâkmar, Ocre | premium |

The **theme** and the **mode** are two separate settings.

- **Theme** lives on `<html data-theme="arcano|amakna|bonta|brakmar|ocre">`. The server renders it from the member's saved setting, and only renders a premium theme when the member's entitlement allows it. Visitors, free members and members whose entitlement lapsed get `arcano`. A client-side switch to a premium theme is never honored without the entitlement: the server ignores the value and the page renders Arcano.
- **Mode** lives on `<html data-mode="dark|light">` and is free for everyone. It is stored in a cookie (so the server can render it) and mirrored in `localStorage`. A small inline `<head>` script sets `data-mode` before first paint, for the mode only; it never sets the theme. Default `dark`.

Tokens are CSS custom properties under one selector per theme and mode. Semantic tokens point at them through `@theme inline`, so utilities and plain CSS read the same names:

```css
@theme inline {
  --color-bg: var(--t-bg);
  --color-surface: var(--t-surface);
  --color-accent: var(--t-accent);
  /* one line per semantic color */
}
[data-theme="arcano"][data-mode="dark"] { --t-bg: #0f0d1a; --t-surface: #17142a; /* … */ }
[data-theme="arcano"][data-mode="light"] { --t-bg: #f4f2fb; --t-surface: #ffffff; /* … */ }
/* the same two blocks for amakna, bonta, brakmar, ocre */
```

The Arcano dark block is also the fallback on `:root`, so a page with a missing or unknown attribute still renders correctly.

### Color

Contrast ratios are WCAG 2.x. AA needs 4.5:1 for body text, 3:1 for large text (24px, or 18.66px bold) and for UI parts such as control borders, progress fills and check marks. All twelve palettes below were checked as given and pass; no hex needed adjusting.

Roles:

| Token | Role |
|---|---|
| `--color-bg` | page background, under the art |
| `--color-surface` | cards, step cards, panels |
| `--color-raised` | hover fill, inputs, segmented track |
| `--color-line` | hairlines between rows (decorative, no ratio needed) |
| `--color-ink` | titles, body |
| `--color-ink-2` | lead text, secondary body |
| `--color-muted` | meta, counts, micro labels; also checkbox and input borders (at least 4.92:1 everywhere, well over 3:1) |
| `--color-accent` | progress fills, links and coordinates, the checked checkbox (with a check mark in `--color-bg`), the primary button outline (accent text and border, transparent fill), the eyebrow, the theme switch knob, the current nav item, the active tab, focus rings on accent controls |
| `--color-accent-2` | Lilita One featured numbers, tag pills (outline) |

Focus rings use `--color-ink` (at least 13:1 on bg in every mode) unless the control itself is accent-colored.

#### Arcano (`arcano`, free, the default for everyone)

| Token | Dark | Light |
|---|---|---|
| `--color-bg` | `#0f0d1a` | `#f4f2fb` |
| `--color-surface` | `#17142a` | `#ffffff` |
| `--color-raised` | `#221e3b` | `#e9e5f7` |
| `--color-line` | `#363160` | `#c9c2e6` |
| `--color-ink` | `#ece9ff` | `#1b1630` |
| `--color-ink-2` | `#bdb6e6` | `#3f3763` |
| `--color-muted` | `#9089ba` | `#5f5782` |
| `--color-accent` | `#6fe3ff` | `#0a6a85` |
| `--color-accent-2` | `#c79bff` | `#6b3fc0` |

| Pair | Dark | Light |
|---|---|---|
| ink on bg | 16.17 | 15.73 |
| ink on surface | 15.10 | 17.44 |
| ink on raised | 13.42 | 14.13 |
| ink-2 on bg | 10.06 | 9.77 |
| ink-2 on surface | 9.40 | 10.84 |
| ink-2 on raised | 8.35 | 8.78 |
| muted on bg | 5.92 | 5.97 |
| muted on surface | 5.53 | 6.62 |
| muted on raised | 4.92 | 5.36 |
| accent on surface | 12.06 | 6.15 |
| accent on raised | 10.71 | 4.99 |
| accent-2 on surface | 8.17 | 6.78 |
| accent-2 on raised | 7.26 | 5.49 |
| accent as a border on surface (3:1) | 12.06 | 6.15 |
| bg check mark on an accent fill (3:1) | 12.91 | 5.55 |

#### Amakna (`amakna`, premium)

| Token | Dark | Light |
|---|---|---|
| `--color-bg` | `#0c120e` | `#f3f5ec` |
| `--color-surface` | `#131c16` | `#fdfef9` |
| `--color-raised` | `#1c2a21` | `#e6ecdb` |
| `--color-line` | `#2c4033` | `#c3cfb2` |
| `--color-ink` | `#eef3e8` | `#172014` |
| `--color-ink-2` | `#c3d1bd` | `#34452d` |
| `--color-muted` | `#90a48b` | `#54644c` |
| `--color-accent` | `#a3dd5e` | `#3a6812` |
| `--color-accent-2` | `#f2c86b` | `#875a0c` |

| Pair | Dark | Light |
|---|---|---|
| ink on bg | 16.80 | 15.23 |
| ink on surface | 15.45 | 16.54 |
| ink on raised | 13.28 | 13.87 |
| ink-2 on bg | 11.89 | 9.38 |
| ink-2 on surface | 10.93 | 10.18 |
| ink-2 on raised | 9.39 | 8.54 |
| muted on bg | 7.10 | 5.78 |
| muted on surface | 6.53 | 6.27 |
| muted on raised | 5.61 | 5.26 |
| accent on surface | 10.84 | 6.54 |
| accent on raised | 9.31 | 5.49 |
| accent-2 on surface | 10.99 | 5.92 |
| accent-2 on raised | 9.45 | 4.97 |
| accent as a border on surface (3:1) | 10.84 | 6.54 |
| bg check mark on an accent fill (3:1) | 11.78 | 6.02 |

#### Bonta (`bonta`, premium)

| Token | Dark | Light |
|---|---|---|
| `--color-bg` | `#0c1220` | `#f3f5fa` |
| `--color-surface` | `#131b2e` | `#ffffff` |
| `--color-raised` | `#1b2640` | `#e5eaf4` |
| `--color-line` | `#2c3b5c` | `#c3cde0` |
| `--color-ink` | `#eef2fb` | `#111a2c` |
| `--color-ink-2` | `#bfc9de` | `#33415c` |
| `--color-muted` | `#8c99b5` | `#55627d` |
| `--color-accent` | `#8fb8ff` | `#1f4fa8` |
| `--color-accent-2` | `#f0c75e` | `#8a5d00` |

| Pair | Dark | Light |
|---|---|---|
| ink on bg | 16.68 | 15.94 |
| ink on surface | 15.30 | 17.38 |
| ink on raised | 13.40 | 14.41 |
| ink-2 on bg | 11.24 | 9.38 |
| ink-2 on surface | 10.32 | 10.24 |
| ink-2 on raised | 9.03 | 8.49 |
| muted on bg | 6.53 | 5.61 |
| muted on surface | 6.00 | 6.12 |
| muted on raised | 5.25 | 5.08 |
| accent on surface | 8.55 | 7.66 |
| accent on raised | 7.49 | 6.35 |
| accent-2 on surface | 10.65 | 5.76 |
| accent-2 on raised | 9.33 | 4.77 |
| accent as a border on surface (3:1) | 8.55 | 7.66 |
| bg check mark on an accent fill (3:1) | 9.32 | 7.02 |

#### Brâkmar (`brakmar`, premium)

| Token | Dark | Light |
|---|---|---|
| `--color-bg` | `#130c0c` | `#f7f1ef` |
| `--color-surface` | `#1c1212` | `#ffffff` |
| `--color-raised` | `#281a19` | `#efe3e0` |
| `--color-line` | `#42292a` | `#d6c1bc` |
| `--color-ink` | `#f6ecea` | `#22120f` |
| `--color-ink-2` | `#d6c1be` | `#4b2c27` |
| `--color-muted` | `#a8908c` | `#6e4f49` |
| `--color-accent` | `#ff5f52` | `#a8231a` |
| `--color-accent-2` | `#ffb347` | `#8a4f00` |

| Pair | Dark | Light |
|---|---|---|
| ink on bg | 16.68 | 16.17 |
| ink on surface | 15.82 | 18.08 |
| ink on raised | 14.46 | 14.41 |
| ink-2 on bg | 11.27 | 11.12 |
| ink-2 on surface | 10.69 | 12.44 |
| ink-2 on raised | 9.77 | 9.91 |
| muted on bg | 6.48 | 6.53 |
| muted on surface | 6.14 | 7.30 |
| muted on raised | 5.62 | 5.82 |
| accent on surface | 6.12 | 7.19 |
| accent on raised | 5.60 | 5.73 |
| accent-2 on surface | 10.30 | 6.56 |
| accent-2 on raised | 9.42 | 5.23 |
| accent as a border on surface (3:1) | 6.12 | 7.19 |
| bg check mark on an accent fill (3:1) | 6.46 | 6.43 |

#### Ocre (`ocre`, premium, after the Dofus Ocre)

| Token | Dark | Light |
|---|---|---|
| `--color-bg` | `#14100a` | `#f8f1e2` |
| `--color-surface` | `#1d170e` | `#fffaf0` |
| `--color-raised` | `#281f12` | `#efe2c6` |
| `--color-line` | `#43341d` | `#d4bf95` |
| `--color-ink` | `#f7efe0` | `#23190a` |
| `--color-ink-2` | `#d9c9a8` | `#4a3a1f` |
| `--color-muted` | `#a8977a` | `#6b5838` |
| `--color-accent` | `#ffb534` | `#8a5300` |
| `--color-accent-2` | `#ff8a5c` | `#a3410f` |

| Pair | Dark | Light |
|---|---|---|
| ink on bg | 16.58 | 15.37 |
| ink on surface | 15.56 | 16.61 |
| ink on raised | 14.19 | 13.47 |
| ink-2 on bg | 11.61 | 9.74 |
| ink-2 on surface | 10.90 | 10.53 |
| ink-2 on raised | 9.94 | 8.54 |
| muted on bg | 6.65 | 6.07 |
| muted on surface | 6.24 | 6.56 |
| muted on raised | 5.69 | 5.32 |
| accent on surface | 10.08 | 6.08 |
| accent on raised | 9.20 | 4.93 |
| accent-2 on surface | 7.66 | 6.08 |
| accent-2 on raised | 6.98 | 4.93 |
| accent as a border on surface (3:1) | 10.08 | 6.08 |
| bg check mark on an accent fill (3:1) | 10.75 | 5.63 |

Rules that follow from the numbers:

- The lowest muted pair is Arcano dark muted on raised at 4.92:1, so muted text works on every surface in every theme.
- Accent and accent-2 pass as text on surface and raised everywhere (lowest: Bonta light accent-2 on raised at 4.77:1), so the eyebrow, links, tags and numbers need no theme-specific exceptions.
- Text over game art always sits on a shade. Never put text straight on an image, and never use `--color-muted` on art cards (see Imagery).

### Shared colors

Status colors and section accents are fixed per mode and shared by all five themes. That is the simpler option, and it passes: each hex was checked against `bg`, `surface` and `raised` of every theme in its mode, and the table gives the worst case.

| Token | Dark | Worst case | Light | Worst case |
|---|---|---|---|---|
| `--color-success` | `#a9d266` | 8.63 (Amakna raised) | `#3d6914` | 5.07 (Ocre raised) |
| `--color-warning` | `#f2c14e` | 8.92 (Amakna raised) | `#7a5600` | 5.18 (Ocre raised) |
| `--color-danger` | `#f28466` | 5.89 (Amakna raised) | `#a8381f` | 5.03 (Ocre raised) |
| `--color-info` | `#8fc3e8` | 7.94 (Amakna raised) | `#1d5f86` | 5.39 (Ocre raised) |

### Section accents

Decided 2026-11-02: each section gets a subtle accent of its own. It is used only for details: the card border, the ring of the icon well in the menu, and the section label. It never fills a button, never colors body text and never replaces `accent` or `accent-2` in their jobs. Pages set it once with `--color-section` on the section's root, so components read one variable.

| Section | Token | Dark | Worst case | Light | Worst case |
|---|---|---|---|---|---|
| Misiones | `--color-sec-misiones` | `#e3c565` | 8.87 | `#77600f` | 4.72 |
| Logros | `--color-sec-logros` | `#f0b45a` | 8.11 | `#8f560a` | 4.67 |
| Guías de Dofus | `--color-sec-dofus` | `#b7dc69` | 9.59 | `#4b6e12` | 4.62 |
| Checklists | `--color-sec-checklists` | `#7fd6c2` | 8.77 | `#17695a` | 5.11 |
| Clases | `--color-sec-clases` | `#ef8a6a` | 6.07 | `#a23c22` | 5.10 |
| Mazmorras | `--color-sec-mazmorras` | `#b99af2` | 6.39 | `#6a43b8` | 5.27 |
| Herramientas | `--color-sec-herramientas` | `#9fc7f0` | 8.49 | `#2a5f93` | 5.18 |

Worst cases are on `raised` of Amakna dark and Ocre light. Every value is at least 4.5:1, so the same hex works as label text and as a border (which needs 3:1). A new section, or a new theme, gets these pairs rechecked before it ships.

### Typography

Families (decided 2026-11-02, kept from Dofus Tools), loaded with `next/font/google` so the files are self-hosted and the fallback metrics prevent layout shift:

| Token | Family | Weights | Fallback stack | Use |
|---|---|---|---|---|
| `--font-display` | Barlow Condensed | 700, 800 | `'Barlow Condensed', 'Barlow', 'Arial Narrow', system-ui, sans-serif` | titles, card names, eyebrows, labels, buttons |
| `--font-body` | Barlow | 400, 500, 600, 700 | `'Barlow', system-ui, -apple-system, sans-serif` | body, controls, tables |
| `--font-accent` | Lilita One | 400 | `'Lilita One', 'Barlow Condensed', system-ui, sans-serif` | featured numbers only: step numbers, levels, percentages, big counters ("30 guías", "0/100"). Never titles |

The scale and rhythm come from duffus.fr (study, typography). Sizes are rem on a 16px root. Condensed faces read smaller than Barlow at the same size, so display sizes are about one step above what duffus uses in regular Barlow.

| Token | Size | Line height | Weight | Tracking | Family | Use |
|---|---|---|---|---|---|---|
| `--text-hero` | `clamp(3rem, 2rem + 4vw, 5.5rem)` | 0.92 | 800 | 0.01em | display, uppercase | home wordmark only |
| `--text-4xl` | `clamp(2.25rem, 1.75rem + 2vw, 3rem)` | 1 | 800 | 0.02em | display, uppercase | guide and quest title (`h1`) |
| `--text-3xl` | 2.25rem | 1.05 | 800 | 0.02em | display, uppercase | home section title |
| `--text-2xl` | 1.875rem | 1.1 | 800 | 0.02em | display, uppercase | list page title, `h2` in guides |
| `--text-xl` | 1.375rem | 1.2 | 700 | 0 | display, normal case | card and block title, `h3` |
| `--text-lg` | 1.125rem | 1.4 | 600 | 0 | body | lead paragraph, step title |
| `--text-base` | 1rem | 1.5 | 400 | 0 | body | body text, never smaller in guide content |
| `--text-sm` | 0.875rem | 1.5 | 400 to 600 | 0 | body | secondary text, controls, table cells |
| `--text-xs` | 0.78rem | 1.45 | 500 to 600 | 0 | body | chips, meta, tab labels |
| `--text-eyebrow` | 0.8125rem | 1.4 | 700 | 0.16em | display, uppercase | eyebrow above a title |
| `--text-micro` | 0.6875rem | 1.4 | 700 | 0.12em | display, uppercase | section labels, table heads, stat labels |
| `--text-figure-lg` | 2.5rem | 1 | 400 | 0 | accent | step numbers, hero counters ("30 guías") |
| `--text-figure` | 1.375rem | 1 | 400 | 0 | accent | levels, percentages, stat tile numbers, "0/100" |

Rules:

- Page and section titles (`h1`, `h2`, home sections) are uppercase Barlow Condensed with slight positive tracking, as on Dofus Tools and Torre's site (decided 2026-11-02). Write them in normal case in the source and apply `text-transform: uppercase` in CSS, so screen readers and search snippets get normal text.
- Card titles, step titles and body text stay in normal case. Eyebrows and micro labels are uppercase as in the table.
- Lilita One is for featured numbers and the words that belong to them ("30 guías"), never for titles or labels. In tables and aligned columns, numbers stay in Barlow with tabular figures.
- The last word of a list page title may go in `--color-accent` ("Todas las *misiones*").
- Measure: guide prose at most 72ch; step cards cap at `--width-prose`.
- Numbers in tables, counts and progress use `font-variant-numeric: tabular-nums`.
- Words never split mid-word: `overflow-wrap: normal; word-break: normal; hyphens: manual` on `body`.

### Spacing

Tailwind v4's single `--spacing: 0.25rem` base, so `p-4` is 16px. The steps in use:

| Step | px | Typical use |
|---|---|---|
| 0.5, 1, 1.5 | 2, 4, 6 | icon to label, chip padding |
| 2, 2.5, 3 | 8, 10, 12 | gaps inside rows and cards, grid gaps on phones |
| 4, 5, 6 | 16, 20, 24 | card padding, grid gaps on desktop, side gutter (16px phone, 24px tablet) |
| 8, 10, 12 | 32, 40, 48 | between blocks in a guide, desktop side gutter (48px) |
| 16, 20 | 64, 80 | between page sections |

Step cards use `18px 22px` padding (4.5 and 5.5) as on duffus; everything else stays on the scale.

### Radii

| Token | Value | Use |
|---|---|---|
| `--radius-xs` | 4px | progress track, tiny thumbnails |
| `--radius-sm` | 8px | icon wells, table rows on hover, checkboxes (7 to 8px) |
| `--radius-md` | 12px | list rows, inputs that are not pills, tooltips, secondary buttons |
| `--radius-card` | 16px | step cards, panels, dropdowns, step screenshots |
| `--radius-lg` | 20px | dungeon and class cards |
| `--radius-xl` | 28px | hero cards, Dofus cards |
| `--radius-pill` | 999px | buttons, chips, search, nav items, tabs |

### Shadows

The interface is mostly flat; depth comes from surface steps. Shadows go under game art and floating layers.

| Token | Value | Use |
|---|---|---|
| `--shadow-art` | `0 2px 6px rgb(0 0 0 / .3), 0 14px 32px rgb(0 0 0 / .35)` | map and step screenshots |
| `--shadow-float` | `0 12px 32px rgb(0 0 0 / .45)` | dropdowns, popovers, the search dialog |
| `--shadow-dialog` | `0 24px 64px rgb(0 0 0 / .55)` | modal dialogs |
| `--shadow-glow` | `0 0 0 1px color-mix(in srgb, var(--color-accent) 55%, transparent), 0 0 18px -4px var(--color-accent)` | active or selected card |

In light mode, shadows drop to half their alpha.

### Z-index

| Token | Value | Use |
|---|---|---|
| `--z-base` | 0 | content |
| `--z-raised` | 10 | sticky table heads, sticky side column |
| `--z-header` | 50 | site header |
| `--z-menu` | 60 | dropdowns, popovers, tooltips |
| `--z-overlay` | 70 | dialog and sheet backdrops |
| `--z-dialog` | 80 | dialogs, mobile nav sheet, search |
| `--z-toast` | 90 | toasts |

### Breakpoints and containers

| Token | Value | What changes |
|---|---|---|
| `--breakpoint-sm` | 40rem (640px) | two-column card grids |
| `--breakpoint-md` | 48rem (768px) | desktop header replaces the mobile bar |
| `--breakpoint-lg` | 64rem (1024px) | sticky side column appears next to guides and checklists |
| `--breakpoint-xl` | 80rem (1280px) | full grids (6 to 7 cards per row) |

Components that can sit in different widths (cards in a side column, the checklist in a panel) use container queries (`@container`), not viewport breakpoints.

| Token | Value | Use |
|---|---|---|
| `--width-wide` | 1400px | header, home, hubs, tables, grids |
| `--width-page` | 1200px | list pages, guide layout with side column |
| `--width-hero` | 1100px | quest hero card |
| `--width-prose` | 800px | step column, guide prose |

Side gutters: 16px under 640px, 24px up to 1024px, 48px above. Backgrounds always reach the edges; only the content column is capped.

## Layout

- **Header** (decided 2026-11-02: the duffus-style header, not the Dofus Tools "header B"): 64px, sticky. Transparent over the hero art at the top of the page, then `--color-bg` at 92 percent with `backdrop-filter: blur(16px) saturate(1.4)` once the page scrolls (solid fallback without `backdrop-filter`). Brand left; nav groups as dropdowns with game icons; search trigger with its `Ctrl K` hint; the egg theme switch; the account button ("Entrar" as the primary action, accent outline, when signed out). Under 768px: a floating bar inset 12px from the edges with 16px radius, and a burger that opens a full-height sheet of 48px rows.
- **Footer**: legal links, Ko-fi, socials (YouTube, Kick, Instagram), the Twitch live card. No floating support button.
- **Quest guide** (decided 2026-11-04: option 3, variant B, "Diario de misiones", mockup `tmp/mockups/guia/opcion-3b.html`, published at https://ta-prototipos.netlify.app/guia/): the free view is the full guide. From top to bottom: the hero header with the level medallion; the summary ribbon at `--width-hero` (Empieza, Requiere, Necesitarás, and a "Recompensa … ↓" link to the Botín card); "Etapas", the stages timeline at `--width-prose` with the number badges in a 48px gutter from 768px and inside the card below, and the progress pill above it; the Botín card as the last node of the timeline; the outro prose and the video; the next quest card. Every part is specified under Quest guide components. "Modo compacto" (decided 2026-11-02) is a premium feature that trims the hero and the long dialogue blocks; it is enforced on the server like every premium feature (see `AGENTS.md`), so a visitor without the entitlement never receives the compact layout or its toggle.
- **Dofus guide and checklist**: title block, summary strip (level range, prerequisites done, quests done, dungeons, segmented progress), chapters as numbered sections of checkable rows; from 1024px a sticky side column with the Dofus card and tabs (Capítulos, Objetos necesarios).
- **List pages** (achievements, quests, dungeons, classes): centered title and subtitle, a toolbar (search with live count, filter pills, "Ocultar hechas"), then a table or card grid.
- **Home**: hero card with the wordmark and a character render, stat tiles from the database, the Dofus guides grid, the tools grid.

## Components

Every interactive component has these states: default, hover (mouse only), focus-visible, pressed, disabled, and where it applies selected or done. Hover never moves layout; it changes fill, color or a transform.

| Component | Anatomy | States |
|---|---|---|
| Button, primary | pill, 44px high, 24px side padding, display 700 at `--text-sm`, transparent fill, 1.5px `--color-accent` border, `--color-accent` text (at least 6.08:1 on surface in every theme and mode). One per view. No color is ever a button fill | hover: `--color-raised` fill behind the same text and border (at least 4.93:1); pressed: `scale(.96)`; disabled: 40 percent opacity, no pointer |
| Button, secondary | pill, 40px, `--color-raised` fill, `--color-ink` text, optional leading icon | hover: `--color-line` fill (ink on line at least 9.62); pressed: scale |
| Button, ghost | pill, 36px, no fill, `--color-ink-2` text | hover: `--color-raised` fill |
| Icon button | 40px circle (44px under `pointer: coarse`), `aria-label` required | as secondary |
| Nav link | pill, 36px, `6px 14px` padding | hover: faint fill; current page: `--color-accent` text plus `aria-current="page"` |
| Dropdown panel | 16px radius, `--color-surface` at 92 percent with blur, 12px padding, rows of 40px with a 24px game icon | enter and exit per the motion table; Esc and outside click close; arrow keys move |
| Search dialog | native `<dialog>`, 640px wide, input at top, results grouped by type (misión, logro, Dofus, clase) with icons, keyboard selection | opens on `Ctrl K` or `/`; empty state with recent searches; no-results state with a suggestion |
| Card, collection (Dofus, class, dungeon) | the whole card is one `<a>`; art layer, shade, name in display 700 normal case, one line of meta; 1px border in `--color-section`; optional progress ring top right in `--color-accent` with the percentage in Lilita One and `--color-accent-2`. Light-mode treatment below | hover: a soft glow in `--color-section` around the border, art settles from `scale(1.04)` to 1; done: success ring; locked premium: lock badge and the meta says why |
| Card, step | see Stage card under Quest guide components. A type badge (32px circle with a game icon) can replace the number when the step block gets a type; optional NPC render and numbered dialogue choices | done: check in the badge, title in `--color-muted`, the card stays in place |
| Stat tile | 14px radius, `--color-raised` fill, optional game icon, number in Lilita One at `--text-figure` in `--color-accent-2` (`white-space: nowrap`), micro label in `--color-ink-2`. XP and kamas have no game icon we can use, so their tiles are typographic: number and label only, never a stand-in glyph | static |
| Chip | 22 to 26px pill, `--text-xs`, `--color-raised` fill, `--color-ink-2` text, optional 16px game icon | static; the coordinates chip is its own component (Quest guide components) |
| Segmented tabs | pill track in `--color-raised`; active segment `--color-surface` with `--color-accent` text | selected uses `aria-selected`; arrow keys move between tabs |
| Checkbox | 22px, `--radius-sm`, `--color-muted` border | checked: `--color-accent` fill with a `--color-bg` check mark (at least 5.55:1); pressed: `scale(.9)` for 100ms |
| Progress bar | 10 to 14px track in `--color-bg` (dark) or `--color-raised` with a hairline (light), `--color-accent` fill (at least 4.93:1 against raised, over the 3:1 a fill needs), optional chapter ticks, percentage beside it in Lilita One and `--color-accent-2` | animates `transform: scaleX()` on the fill, never `width` |
| Callout | 12px radius, fill of its color at 10 percent over `--color-surface`, 1px border of its color at 35 percent, 28px ring icon, title in its color (display 700, `--text-eyebrow`, uppercase), text in `--color-ink`; `role="note"`. Until game art is picked for the three kinds, the icon is a typographic glyph in a 2px ring of its color (`i`, `!`, `×`), `aria-hidden`; the title carries the meaning | tip (info, "Consejo"), warning (warning, "Importante"), stop (danger, "Alto"). Ratios under Quest guide components |
| Table | 44px rows, 1px `--color-line` between rows, sticky head row in micro labels, checkbox column first, numbers right-aligned | row hover: `--color-raised`; done rows keep their place and tick |
| Tooltip | `--color-raised`, 12px radius, `--text-xs`, 8px offset | shows on hover after 300ms and on focus; never holds the only copy of information |
| Dialog | native `<dialog>` with `showModal()`, 16px radius, `--shadow-dialog`, title in display 700, actions bottom right | confirm destructive actions with a dialog, never `confirm()`; offer "Deshacer" in a toast for 8 seconds after |
| Toast | bottom center, pill or 12px radius, `--color-raised` | auto-dismiss 4 seconds (8 with an undo action); `role="status"` |
| Mode switch | the egg medallion from Dofus Tools, now the dark and light toggle within the chosen theme. The ivory and ebony egg art stay as its two icons; the medallion keeps its own dark fill in both modes, so the art reads the same on every theme. The knob ring is `--color-accent` | `role="switch"` with `aria-checked`; the mode change uses the corner reveal of the old site where View Transitions exist, a plain swap otherwise |
| Theme picker | five swatch cards in a grid (three per row from 640px, two below): a strip of the theme's bg, surface, accent and accent-2, the theme name in display 700, and on the four premium ones a lock icon and a "Premium" label. The current theme has a `--color-accent` border and a check | entitled member: choosing saves the theme to the profile and the server re-renders the page with it. Everyone else: hover or focus shows a preview inside the card (a mini page in that theme's colors, scoped to the card with its own `data-theme`) without changing the page; choosing a premium theme opens the premium explainer, and nothing is saved |
| Tag pill | 22 to 26px pill, `--text-xs`, transparent fill, 1px `--color-accent-2` border and text | static, or a link with a hover fill of `--color-raised` |
| Skeleton | blocks in `--color-raised` matching the final layout, used only in client islands and `loading.tsx` | a 1.2s opacity pulse; static under reduced motion |
| Empty state | game art (an NPC or icon), one sentence, one action | e.g. "Aún no has marcado ninguna misión" with "Ver la guía" |

### Art cards in light mode

Decided 2026-11-02: in light mode the art cards are lightened, not kept dark, in every theme.

- **Card**: `--color-surface` under the art, 1px border in `--color-section` (light value, at least 4.62:1 on any light surface, well over the 3:1 a border needs).
- **Art**: zone backgrounds at full color but 55 percent opacity, so they read as a light wash; NPC, boss and egg renders stay at full opacity on top.
- **Shade**: a gradient from transparent to `--color-surface` at 90 percent, covering the part where text sits (bottom on wide cards, left half on mid cards). It replaces the near-black shade of dark mode.
- **Egg and render glow**: `drop-shadow(0 0 10px color-mix(in srgb, var(--color-section) 35%, transparent))`, about half the dark-mode strength (`0 0 18px` at 55 percent). The renders also get `drop-shadow(0 4px 8px rgb(0 0 0 / .18))` so they sit on the card instead of floating.
- **Text on the card**: name in `--color-ink`, meta in `--color-ink-2`. Worst case, black art under a 90 percent surface shade: ink at least 13.23:1 and ink-2 at least 8.15:1 in every light theme. `--color-muted` falls to 4.89:1 there, so muted text is never used on art cards, and the shade never goes under 90 percent. In dark mode the same rule holds: with white art under an 85 percent bg shade, ink stays above 10.7:1 and ink-2 above 6.6:1, while muted drops under 4.5:1.
- **Pills over art** (kicker, level): `--color-surface` at 92 percent with `--color-ink` text, never a dark pill.

### Quest guide components

Decided 2026-11-04, from the approved mockup (option 3, variant B). They are server components; the only client code is the copy and video island (see Coordinates chip and Video facade). Generic parts live in `src/components/ui/`, game parts in `src/components/game/`. The page root sets `--color-section: var(--color-sec-misiones)`.

Rules shared by all of them:

- **Text over art or over scrolling content** (the medallion, the breadcrumb pill, the progress pill) sits on `--color-surface` at 92 percent and uses `--color-ink`, `--color-ink-2`, `--color-accent` or `--color-accent-2`, never `--color-muted`: muted drops to 4.47:1 there (Arcano dark, white art under the 8 percent that shows through).
- **Focus** follows Accessibility: a 2px `--color-ink` outline, or `--color-accent` on accent-colored controls (the coordinates chip, the copy button, the stage badge).
- **Motion** is CSS only. Every transition below drops to 0.01ms under `prefers-reduced-motion: reduce` through the global rule in `globals.css`.

#### New contrast pairs

Worst case over the five themes, in WCAG 2.x ratios. "Over art" assumes white art in dark mode and black art in light mode under the 92 percent surface.

| Pair | Dark | Light | Needs |
|---|---|---|---|
| accent-2 on surface 92% over art (medallion and pill figures) | 6.16 Ocre | 4.81 Bonta | 4.5 |
| ink-2 on surface 92% over art (medallion label, pill total and label) | 7.60 Arcano | 8.51 Amakna | 4.5 |
| accent on surface 92% over art (breadcrumb links) | 4.98 Brâkmar | 5.09 Ocre | 4.5 |
| ink on surface 92% over art | 12.21 Arcano | 13.82 Amakna | 4.5 |
| muted on surface 92% over art (not used) | 4.47 Arcano | 5.12 Bonta | fails |
| accent-2 on bg (Botín border, medallion ring) | 8.16 Ocre | 5.28 Bonta | 3 |
| muted on bg (stage badge ring in the gutter) | 5.92 Arcano | 5.61 Bonta | 3 |
| info title on its callout fill | 7.46 Bonta | 5.74 Ocre | 4.5 |
| warning title on its callout fill | 8.37 Bonta | 5.53 Ocre | 4.5 |
| danger title on its callout fill | 5.84 Bonta | 5.33 Ocre | 4.5 |
| ink on any callout fill | 12.46 Arcano | 14.18 Amakna | 4.5 |
| sec-misiones on surface (Recompensa label) | 10.16 Bonta | 5.83 Ocre | 4.5 |
| ink on bg 82% over the video poster (play glyph) | 9.60 Arcano | 10.02 Amakna | 3 |

Pairs already in the theme tables: accent on raised (coordinates chip, filled progress segments, at least 4.93), accent-2 on raised (stage number, slot quantity, stat figures, at least 4.77), ink-2 and muted on raised (chips, monster level), bg check mark on an accent fill (done badge, at least 5.55), accent on surface (copy button, at least 6.08).

#### Level medallion

- **Anatomy**: a circle, 76px under 768px and 104px from 768px, 2px `--color-accent-2` ring, `--color-surface` at 92 percent fill. Micro label "Nivel" in `--color-ink-2` above the number in Lilita One, `--color-accent-2`, 1.75rem on phones and `--text-figure-lg` from 768px.
- **States**: static. A level range ("190 a 200") is not shown in the medallion; the medallion takes the quest's minimum level.
- **Accessibility**: a `<p>`, so it reads "Nivel 20". Not a heading, not interactive.
- **Motion**: enters with the hero pieces (see Hero header).

#### Hero header

- **Anatomy**: full-bleed section; inside, a grid at `--width-hero` with three areas: the breadcrumb pill on top, then the body (the `h1` in `--text-4xl` and a subtitle in `--text-lg` 500 `--color-ink-2`, "Misión de Astrub · Ciudad de Astrub") and the level medallion at the end of the row, aligned to the bottom.
- **With art**: the art fills the section with `object-fit: cover` and a `mask-image` fade to transparent at the bottom (21:9 on desktop, 4:3 on phones through `<source media>`, see Imagery). A shade sits between art and text: a gradient from `--color-bg` to `--color-bg` at 85 percent (dark) or 90 percent (light) to transparent, plus a 120px top band at 70 percent for the site header. In light mode the art is at 55 percent opacity. Height: at least 300px on phones, `clamp(380px, 38vw, 540px)` from 768px. The art is the LCP candidate: `fetchpriority="high"`, never lazy, `alt=""` (decorative).
- **Without art**: the same grid on `--color-bg`, with no shade and no minimum height; only the top padding stays. Nothing stands in for the art.
- **Art source**: an optional image Torre picks for the guide (a planned upload field on the guide). It is never picked automatically: many guides only have dialogue screenshots, which make poor heroes. No field, or no value, means the no-art header.
- **Breadcrumb**: a `<nav aria-label="Migas de pan">` with an `<ol>`; pill in `--color-surface` at 92 percent, `--text-xs`, links in `--color-accent`, `/` separators in `--color-ink-2`. The achievement crumb carries its 20px icon. Under 640px the first crumb ("Misiones") is hidden, because the menu already has it.
- **Accessibility**: the section is `aria-labelledby` the `h1`. The title is written in normal case and uppercased in CSS.
- **Motion**: the breadcrumb, the subtitle and the medallion enter with the 40ms stagger (Motion, Enter). The title and the art never animate in.

#### Summary ribbon

- **Anatomy**: a `--color-surface` box at `--width-hero` (plus the gutters), `--radius-card`, holding a `<dl>` of segments and, under a hairline, the reward link.
  - **Empieza**: the start NPC in `--color-ink` 600 and the place in `--color-ink-2` (`Hupe Esse · Biblioteca de Astrub`), then the primary button "Copiar /travel 7,-19" (Button, primary, in its compact 40px size so it fits the row, with a copy icon). The place is optional.
  - **Requiere**: one line per prerequisite, as the summary text gives them; a prerequisite quest with a published guide is a link.
  - **Necesitarás**: the needed items as item chips, then the note lines ("1 x Combate (solo)."). Quest items (DofusDB super type 14) never appear: the game hands them over during the quest.
  - **Reward link**: `<a href="#botin">` with the micro label "Recompensa" in `--color-section`, then `16 380 XP · 390 kamas · 4 objetos` in `--color-ink-2` and an `aria-hidden` "↓".
- **No level segment**: the level lives in the medallion only.
- **Layout**: from 1024px the segments sit in one row, split by vertical hairlines, Empieza taking the free width (`flex: 1 1 380px`) and labels above values. Below 1024px each segment is a row with a 96px label column and the value beside it, split by horizontal hairlines. Below 640px Empieza stacks and its button takes the full width.
- **Empty segments** are left out, never shown with a dash. With no segment at all the ribbon keeps only the reward link; with no rewards either, it is not rendered.
- **States**: the reward link gets a `--color-raised` fill on hover (`--duration-fast`, `--ease-standard`) and an inset focus outline (`outline-offset: -2px`).
- **Accessibility**: the section is `aria-label="Antes de empezar"`; labels are `<dt>` micro labels in `--color-muted` on surface (at least 5.53).

#### Item chip and item slot

Two sizes of the same thing: a game item with its icon, quantity and name. Item icons come from our own media (Imagery); a missing icon leaves an empty well, never a placeholder glyph.

- **Item chip** (ribbon, prose): 32px pill, `--color-raised`, 24px icon inset 4px from the left edge, name in `--text-xs` 600 `--color-ink`, then `× 1` in `--color-ink-2` 500. Static.
- **Item slot** (Botín): a 72px well (`--radius-sm`, `--color-raised`, 1px `--color-line`) with the 48px icon; the quantity in Lilita One 0.9375rem `--color-accent-2` in the bottom-right corner, as in the game's inventory; the name under the well, centered, `--text-xs` `--color-ink-2`. Slots are 104 to 112px wide.
- **Quantities**: always shown, also `1`; thousands split with a space (`1 000`).
- **Accessibility**: icons have `alt=""` because the name is text next to them. The slot puts the quantity in a visually hidden prefix so it reads "1 × Pico de tofu"; the drawn quantity is `aria-hidden`.
- **Missing or not-owned items** (checklists later): the icon in `grayscale(1)` at 60 percent opacity, as Imagery says.

#### Monster chip and fight block

- **Monster chip**: a `--radius-md` row in `--color-raised`, `4px 14px 4px 4px` padding: a 56px well in `--color-bg` with the 48px monster render, then the quantity and name (`1 × Ramán famélico`, `--text-sm` 600 `--color-ink`) over the level (`Nivel 20`, `--text-xs` `--color-muted`, at least 4.92 on raised). The level is optional.
- **Fight block**: an intro line in the prose ("Vas a empezar una lucha contra:"), then a `<ul>` of monster chips that wraps with 8px gaps. It needs a planned fight block in the guide body that points at the Monsters collection with quantities; today the import leaves the fight as a text list, which renders as a normal list.
- **States**: static. **Accessibility**: the list is a list; renders have `alt=""`, since the name is text. **Motion**: none.

#### Coordinates chip

- **Anatomy**: an inline 26px pill, `--color-raised`, 1px transparent border, `--text-xs` 600 Barlow with tabular figures in `--color-accent` (at least 4.93 on raised), a 12px copy icon after the text. The label is the game's notation, `[7,-19]`.
- **What it copies**: `/travel 7,-19`. Pasted in the game chat it sets the autopilot, which is what a reader following a guide wants. The `[x,y]` map link stays as the visible label only; there is no second control to copy it. The start position uses the larger primary button ("Copiar /travel 7,-19") instead of a chip.
- **Coordinates in prose**: the renderer of the guide body turns every `[x,y]` written in a text node into a chip. The pattern is two signed integers in square brackets with optional spaces (`[7,-19]`, `[ -1 , 17 ]`); anything else stays text: decimals, a single number, three numbers, or coordinates inside a link or code. Step titles do not convert; a stage that has a main position shows it as a chip in its head.
- **Without JavaScript**: the chip renders as plain text, readable and selectable. The island then turns each chip into a button (`role="button"`, `tabindex="0"`, Enter and Space) and gives it the name `[7,-19], copiar /travel 7,-19`, which starts with the visible text.
- **Feedback**: on copy, a toast "Copiado: /travel 7,-19" in a `role="status"` region (Toast). If the clipboard is refused, the toast says "Escribe /travel 7,-19 en el chat".
- **States**: hover (mouse only) shows the border in `--color-accent`; pressed `scale(.96)` over `--duration-press`; focus-visible a 2px `--color-accent` outline. A transparent `::after` grows the target to at least 40px tall (44px under `pointer: coarse`), centered on the chip, without changing the drawn chip or the line height, so the 26px pill still meets the Accessibility target rule.
- **Motion**: border color over `--duration-fast`; the toast enters per the motion table.

#### Stage card and stages timeline

- **Stage card**: `--color-surface`, `--radius-card`, `18px 22px` padding (`18px 16px` under 640px). A head row with the title (`--text-lg` 600 `--color-ink`, an `h3`) and, at the end, the stage's coordinates chip when it has one; then the body blocks (prose, screenshots, callouts, fight block, video), with prose capped at 72ch.
- **Number badge**: a 40px circle (44px under `pointer: coarse`), 2px `--color-muted` ring, `--color-raised` fill, the number in Lilita One 1.25rem `--color-accent-2`. From 768px it sits in a 48px gutter left of the card, and a 2px `--color-line` rule joins it to the next badge; under 768px it sits inside the card, top left, and the head makes room for it.
- **Tick** (optional per page): the badge is the `<label>` of a visually hidden checkbox, "Etapa 1 hecha". Checked: the ring and fill turn `--color-accent`, the number fades out and a 20px check mark in `--color-bg` scales in; the title turns `--color-muted`; the card stays in place. Hover (mouse only) shows the ring in `--color-accent`; pressed `scale(.9)`. Without ticks the badge is a plain number.
- **Ticks are not saved yet**: until members and progress exist, a tick lives only in the open page, and the timeline head says so ("Marca cada etapa al terminarla. Por ahora no se guarda al salir."). Progress will be keyed by the step's stable UUID (`AGENTS.md`, Members and progress).
- **Stages timeline**: the "Etapas" `h2` and that hint, the progress pill, then an `<ol>` of stage cards with 16px gaps, then the Botín card as the last node, at `--width-prose` plus the 48px gutter. It needs the planned step block (title, optional coordinates, body) in the guide body.
- **Accessibility**: the list is an `<ol>`; each checkbox has its own label; state is never color alone (the check mark and the label text).
- **Motion**: ring and fill over `--duration-fast`; the check mark from `scale(.6)`, opacity 0, over `--duration-fast` `--ease-out`; press over `--duration-press`.

#### Progress pill

- **Anatomy**: a pill centered above the stages, `--color-surface` at 92 percent with `backdrop-filter: blur(16px) saturate(1.4)` (solid surface without it), 1px `--color-line` border, `--shadow-float`, `8px 18px` padding. Inside: the count in Lilita One `--text-figure` `--color-accent-2` with the total in 1rem `--color-ink-2` ("1/8"), one 14 by 10px segment per stage (`--radius-xs`, `--color-raised` with a 1px `--color-line` outline), and the micro label "Etapas" in `--color-ink-2`.
- **Behavior without JavaScript**: the count is a CSS counter of checked ticks, so the pill comes after the list in the DOM and `order: -1` draws it above. Each segment lights through a `:has()` rule on its stage's checkbox; the page renders those rules with the stage ids. It is sticky 88px from the top while the stages are on screen.
- **States**: a lit segment is `--color-accent` at full height; an unlit one is scaled to 60 percent height.
- **Accessibility**: `aria-hidden`, because the checkboxes already carry the state and a CSS counter is not reliably announced. It only appears on pages with ticks.
- **Motion**: segments animate `transform: scaleY()` and their fill over `--duration-base`, never `height`.

#### Screenshots and callouts inside a stage

- **Screenshot**: as Imagery (source ratio, `--radius-card`, or `--radius-md` inside a stage card, `--shadow-art`, `--color-raised` behind it while it loads); the caption under it in `--text-sm` `--color-muted`.
- **Callout**: as the Callout row of the components table.

#### Video facade

- **Anatomy**: a `<figure>` with a 16:9 frame (`--radius-card`, `--shadow-art`, `--color-raised`) holding a link: the poster image (`object-fit: cover`, `alt=""`) and a 72px play badge centered on it (`--color-bg` at 82 percent, 2px `--color-accent` ring, a triangle in `--color-ink`). The caption under it: the video title and "YouTube, Torrente Arcano" in `--text-sm` `--color-muted`.
- **No third-party code until the click**: the page loads no iframe, script or image from YouTube. The poster is our own copy of the thumbnail, stored as media; without one, the frame shows the play badge and the title on `--color-raised`.
- **Without JavaScript** the link opens the video on YouTube. With the island, a click swaps the link for a `youtube-nocookie.com` iframe with `autoplay=1`, the same title and `allow="autoplay; encrypted-media; picture-in-picture"`, and moves focus into it.
- **Other video hosts**: only YouTube URLs get the facade; any other https URL renders as a plain link card with the title.
- **States**: hover (mouse only) scales the badge to 1.06 over `--duration-fast`; focus-visible is a 3px `--color-ink` outline offset -3px inside the frame.
- **Accessibility**: the link's name is "Ver el vídeo: {title}"; the iframe gets the video title.

#### Botín card

- **Anatomy**: the last node of the stages timeline. A 40px badge in the gutter (2px `--color-accent-2` ring, `--color-raised` fill) with the first reward item's icon, or "XP" in Lilita One when the quest gives no items; then a `--color-surface` card with a 1px `--color-accent-2` border, `--radius-card`, `18px 22px` padding: the micro label "Al terminar la misión", the `h2` "Botín" (`--text-2xl` uppercase), a row of slots, and the achievement chain line under a hairline.
- **Slots**: the XP and kamas stat tiles first (typographic, see Stat tile), then one item slot per reward item. Under 640px stat tiles take half a row and item slots a third, so "1 000 000" never wraps; from 768px they flow in a wrapping row.
- **Optional parts**: no items, no item slots; no kamas, no kamas tile; no achievement, no chain line. With nothing at all the card is not rendered.
- **Accessibility**: a `<section aria-labelledby>` the `h2`, with `id="botin"` for the ribbon link and `scroll-margin-top: 96px` under the sticky header. The slots are a `<ul>`.
- **Motion**: none.

#### Achievement chain

- **Anatomy**: one line in `--text-sm` `--color-ink-2`: the achievement's 24px icon, "Logro" and the achievement as a link, then "misión 2 de 3:" and the quests of the chain in order, separated by `→` in `--color-ink-2`. Other quests are links; the current one is `--color-ink` 600 text with `aria-current="page"`.
- **Long chains** (more than five quests) show the first, the one before, the current, the one after and the last, with `…` between gaps.
- **Accessibility**: a `<nav aria-label="Cadena del logro">` with an `<ol>`; the arrows are CSS, so a screen reader hears a numbered list. **Motion**: none.

#### Next quest card

Card, collection rules at `--width-prose`: the whole card is one link, art left (240px from 640px, 16:9) and text right (micro label "Siguiente misión del logro", the title in `--text-2xl` uppercase, one meta line). Hover: border in `--color-section` and `translateY(-2px)`, art settles from `scale(1.04)` to 1.

#### Content model gaps

The components above need data the guide does not store yet:

| Part | Needs |
|---|---|
| Hero art | an optional image field on the guide |
| Start place ("Biblioteca de Astrub") | a text field next to the start NPC, or the subzone from DofusDB |
| Stage card | the planned step block: title, optional coordinates, body blocks |
| Fight block | a block with monsters (from the Monsters collection) and quantities; monster level is optional |
| Achievement chain | the achievement relation and the order of its quests |
| Video poster | the thumbnail stored as media at import |
| Item and monster icons | the icon files imported from DofusDB into media |

### Component catalog

Every component above, and the generic ones in the components table that already exist in code, render on `/sistema` with real content, in the five themes and both modes (each section carries its own `data-theme` and `data-mode`). The page answers 404 in production: it renders only in development (`NODE_ENV=development`), on the dev environment (`APP_ENV=dev`, behind the dev gate) and in the E2E run. It is not in the Lighthouse list. A new component, or a new state, is added there in the same PR.

## Motion

Motion is CSS on server-rendered pages. The Motion library (Framer Motion) is allowed only inside client islands (the checklist app, dialogs with shared-element moves), never on guide pages.

### Tokens

| Token | Value | Use |
|---|---|---|
| `--duration-press` | 100ms | press scale, checkbox tick |
| `--duration-fast` | 160ms | hover color and fill, tabs, chips |
| `--duration-base` | 220ms | dropdowns, popovers, tooltips, toasts |
| `--duration-slow` | 320ms | dialogs, the mobile sheet, progress fill |
| `--duration-enter` | 400ms | hero and section entrance |
| `--ease-out` | `cubic-bezier(.23, 1, .32, 1)` | everything that enters or responds to input |
| `--ease-in` | `cubic-bezier(.5, 0, .75, 0)` | exits |
| `--ease-standard` | `cubic-bezier(.25, .1, .25, 1)` | color and fill changes |

Exits run at about 70 percent of the enter duration (a 220ms dropdown closes in 150ms).

### Rules

- Animate `transform` and `opacity` only. Color and fill transitions on hover are the one exception; no animation of `width`, `height`, `top`, `left`, `margin`, `filter` or `box-shadow` size.
- No layout animation on content pages. Nothing on a guide page moves after it renders, except in response to the reader.
- Enter: from `opacity: 0; transform: translateY(8px)` to rest, `--duration-enter`, `--ease-out`. Stagger siblings by 40ms, at most 6 items; the rest appear with the last one.
- Never animate the LCP element (the hero image or title) in from zero opacity.
- Dropdowns and popovers: from `opacity: 0; transform: translateY(-6px) scale(.97)` with `transform-origin` at the trigger.
- Dialogs: backdrop fades in `--duration-fast`; panel from `translateY(12px) scale(.98)` over `--duration-slow`.
- Mobile sheet: slides from the top with `translateY(-100%)` to 0 over `--duration-slow`.
- Card hover: art settles from `scale(1.04)` to 1 over 600ms, border tint over `--duration-fast`. Mouse pointers only, via `@media (hover: hover) and (pointer: fine)`.
- Scroll reveals: CSS scroll-driven animations (`animation-timeline: view()`) inside `@supports`, on the home and hubs only. Content is visible without them.
- Page transitions: none at first. When Next's View Transitions support is stable, a 160ms cross-fade of the main region, with the header held still (plan section 4).
- Reduced motion: under `prefers-reduced-motion: reduce` every transition and animation drops to 0.01ms or is removed, scroll reveals are off, and smooth scrolling becomes `auto`. Progress fills jump to their value.

## Imagery

- Real game art only, imported once and served from R2 behind the CDN domain. Nothing loads from DofusDB or Ankama at runtime.
- Every image has pre-built AVIF and WebP variants at fixed widths (320, 640, 960, 1600; icons at 1x and 2x), generated offline before the import (plan section 8). The app never optimizes images on request.
- Markup: `<picture>` with AVIF, then WebP, then the WebP `<img>` with explicit `width` and `height` from the media record, `srcset` and `sizes`. Next's `<Image>` only with a loader that maps to the pre-built variants and `unoptimized` set.
- `loading="lazy"` and `decoding="async"` on everything below the first screen; the LCP image gets `fetchpriority="high"` and no lazy loading.
- Aspect ratios:

| Kind | Ratio | Notes |
|---|---|---|
| Step screenshot | source ratio, stored on the media record | `--radius-card`, `--shadow-art`, max `--width-prose` |
| Start map | 16:9 crop | 12px radius |
| Hero zone art | 21:9 on desktop, 4:3 on phones (art direction through `<source media>`) | fades into `--color-bg` with a `mask-image` gradient |
| Collection card art | card ratio (1:1 for Dofus, 1:1.1 for dungeons) | the NPC or boss render on top keeps its alpha |
| NPC and monster renders | transparent, natural ratio | `drop-shadow` filter as a static style, never animated |
| Icons (items, quests, jobs) | 1:1 | 24, 32 or 48px, inside an icon well (`--radius-sm`, `--color-raised`) |

- Missing or not-yet-owned items show the icon in `grayscale(1)` at 60 percent opacity.
- Picking a zone background for a character: the character must read against the area where it sits. Avoid a zone in the same hue as the character; keep text over the darker part of the image or on a shade.
- Alt text comes from the media record. Decorative art (backgrounds, ornaments) has `alt=""`.

## Accessibility

- WCAG 2.2 AA in every theme and mode. The color tables above list every text pair; new pairs get a ratio before they ship.
- Focus: `outline: 2px solid var(--color-ink); outline-offset: 2px` on every interactive element, `:focus-visible` only. Cards use a 3px outline with 4px offset.
- Targets: 40px minimum, 44px under `pointer: coarse`.
- One `h1` per page; headings in order. `lang="es"` on `<html>`.
- Never nest interactive elements: a card is one `<a>`; a checkbox next to a link is a sibling, not a child.
- Menus, tabs and the search dialog follow the WAI-ARIA patterns (arrow keys, Esc, focus return).
- State is never color alone: done has a tick and text, premium has a lock and a sentence.
- Toasts use `role="status"`; errors use `role="alert"`.
- Wrap every `localStorage` access in `try/catch`; the page works unsaved in strict private mode.

## Performance budgets

From `docs/legacy/plan.md` section 7, enforced by Lighthouse CI on every PR (`pnpm test:lhci`, assertions in `lighthouserc.cjs`):

| Budget | Limit |
|---|---|
| LCP, mobile on 4G | under 2.5 s |
| CLS | under 0.1 |
| JavaScript on guide pages | under 150 KB compressed |
| Images | every image has explicit size and an AVIF or WebP source |

What keeps them: server components, fonts through `next/font` with fallback metrics, CSS motion, no on-request image work, and the Motion library confined to client islands.

## Design process

1. Mockups first: two or three options as static HTML or images in `tmp/` (git-ignored), built from these tokens and real game art. No placeholders.
2. The user picks. Nothing gets implemented before that.
3. A functional prototype outside `src/` when a flow is unclear (sticky behavior, a multi-step interaction).
4. Implementation, test first (see `AGENTS.md`).
5. Screenshots at 1440, 1024 and 390 px, in Arcano dark and light (plus any theme the change touches), in `tmp/shots/`, each next to its approved mockup in the PR report.

## Anti-patterns

Carried over from Dofus Tools reviews, plus what the duffus study ruled out.

| Rejected | Do instead |
|---|---|
| A side border accent on the active item | a raised fill or the `--shadow-glow` frame |
| Gradient pill buttons, or any color as a button fill | the accent outline for the primary action |
| "Entrar →" text on a card that is already a link | the whole card is the link; the meta line says where it goes |
| Emoji or generic icons when a game asset exists | the game asset in an icon well |
| The same motif on two neighboring cards | one motif per card |
| A character on a background of its own hue | pick another zone |
| Low-alpha white for secondary text | `--color-ink-2` or `--color-muted` |
| A full-screen loader between pages | server rendering; a layout-shaped skeleton only in client islands |
| A floating support button | Ko-fi in the header menu and footer |
| Animated blur or canvas effects behind content | a static image with a mask |

## Open questions

1. Exact variant widths for images, to settle with the import script once the image sizes are measured. The widths listed under Imagery are a starting point, not a decision.
2. Hero art: should the import pre-fill the guide's hero image from one of its screenshots for Torre to confirm, or leave it empty until Torre picks one? Until decided, it stays empty and the header renders without art.
3. Callout icons: which game art replaces the typographic `i`, `!` and `×` glyphs.
4. Start place: a text field Torre writes, or the subzone name from DofusDB.
5. Video hosts other than YouTube: keep the plain link card, or add facades per host when a guide needs one.
