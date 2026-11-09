# Design language

The visual rules for the new torrentearcano.com. Structure, density and motion follow the study of duffus.fr in `docs/research/duffus-visual.md`. Color, art and the theme switch are our own. The tokens ship in `src/styles/theme.css`; when it and this file disagree, the CSS wins and this file gets fixed.

## Principles

1. **The game art carries the page.** Real Dofus art only: zone landscapes, NPC renders, monster images, class symbols, item, job and achievement icons. No emoji, stock illustration or hand-drawn generic icons. The interface stays quiet around the art.
2. **Reading first.** Most visits are a player with the game open beside the browser, following one quest. Body text stays at 16px, steps are easy to scan, coordinates copy in one click.
3. **Dense, not cramped.** Lists of 50 quests and checklists of 100 steps must fit on a screen without feeling like a spreadsheet. Small gaps inside components, generous gaps between sections.
4. **Fast by default.** Guide pages are server-rendered with no client JavaScript beyond the shell and one small island that copies coordinates, loads videos on click and opens guide images fullscreen. Motion is CSS unless it lives inside a client island.
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
- **Mode** lives on `<html data-mode="dark|light">` and is free for everyone. It is stored in a cookie (so the server can render it) and mirrored in `localStorage`. A small inline `<head>` script sets `data-mode` before first paint; it never sets the theme. Default `dark`. The same script sets `data-js`, so CSS can tell when JavaScript runs (the rewards bag, Quest header).

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

### Icon wells

Decided 2026-11-05 with guide v4. Game icons sit in wells, like the slots of the game's inventory. Two pairs of tokens, set per mode in `theme.css` from the theme's own colors:

| Token | Dark | Light | Use |
|---|---|---|---|
| `--color-well` | `bg` 55 % over `surface` | `raised` | the coordinates chip |
| `--color-well-line` | `line` 80 % over `ink` | `line` | their 1px border, Torre's bubble and avatar ring |
| `--color-slot` | same as `--color-well` | `ink` 84 % over `bg` | the well behind a full-colour game icon |
| `--color-slot-line` | same as `--color-well-line` | `ink` | its border |

Slots stay dark in the light modes. The game draws its icons for a dark slot, and a pale XP arrow or a gold coin disappears on cream. Wells and slots are decorative (`aria-hidden`, icons with `alt=""`); the text next to them carries the meaning, so their edges need no ratio. Text on a well: ink at least 13.47:1 (Ocre light) and accent at least 4.93:1 (Ocre light, the coordinates chip).

### Typography

Families (decided 2026-11-06 with guide v5, after Torre's review; Montserrat replaced Fredoka and Nunito, which had replaced Barlow and Barlow Condensed with guide v4), loaded with `next/font/google` so the files are self-hosted and the fallback metrics prevent layout shift:

| Token | Family | Weights | Fallback stack | Use |
|---|---|---|---|---|
| `--font-display` | Montserrat | 600, 700 | `'Montserrat Fallback Linux', 'Montserrat', system-ui, sans-serif` | titles, the wordmark, card names, eyebrows, labels, buttons |
| `--font-body` | Montserrat | 400, 500, 600, 700, 800 | `'Montserrat Fallback Linux', 'Montserrat', system-ui, -apple-system, sans-serif` | body, controls, tables; 800 for amounts and coordinates |
| `--font-accent` | Lilita One | 400 | `'Lilita One Fallback Linux', 'Lilita One', 'Montserrat', system-ui, sans-serif` | featured numbers in the catalog components that still use it (stat tile, item slot quantity, progress bar). Never titles |

Montserrat is a variable font. Google serves one latin file (about 35 KB) that holds every weight, so `src/styles/fonts.ts` loads it as a single `next/font` instance with weights 400 to 800, and that file is the only preload. The first screen of a guide already uses 400, 600, 700 and 800, so there is nothing to defer. Lilita One loads when the page first uses it and shows the metric-adjusted fallback until then (`display: swap`). Keep it that way: a preloaded font always downloads and competes with the CSS and the LCP image. With six Nunito and Fredoka files preloaded, a guide's first screenshot took 1.8 s to arrive on slow 4G. `tests/e2e/fonts.spec.ts` checks the single preload, the single family and that bold text uses the font file instead of a synthesized bold.

The metric-adjusted fallback that `next/font` generates (`Montserrat Fallback`) loads `local(Arial)`, which Linux and Android do not have. There the browser paints the system sans, which has other metrics, and with the old fonts the guide header changed line breaks when the web fonts arrived (CLS 0.19 in Lighthouse CI, decided 2026-11-05). `src/styles/fonts-fallback.css` adds `Montserrat Fallback Linux` and `Lilita One Fallback Linux`: the same overrides on Liberation Sans and Arimo, which share Arial's metrics, and on Roboto, the closest on Android. The values are copied from the compiled `next/font` CSS; change them together when a family changes.

The scale and rhythm come from duffus.fr (study, typography). Sizes are rem on a 16px root. Display sizes use 600, except the guide title, which is 700 (Quest header).

| Token | Size | Line height | Weight | Tracking | Family | Use |
|---|---|---|---|---|---|---|
| `--text-hero` | `clamp(3rem, 2rem + 4vw, 5.5rem)` | 0.92 | 600 | 0 | display | home title only |
| `--text-4xl` | `clamp(2.25rem, 1.75rem + 2vw, 3rem)` | 1 | 600 | 0 | display | page title (`h1`); the guide title has its own size (Quest header) |
| `--text-3xl` | 2.25rem | 1.05 | 600 | 0 | display | home section title |
| `--text-2xl` | 1.875rem | 1.1 | 600 | 0 | display | list page title, `h2` in guide prose |
| `--text-xl` | 1.375rem | 1.2 | 600 | 0 | display | card and block title, `h3`, the wordmark |
| `--text-lg` | 1.125rem | 1.4 | 600 | 0 | body | lead paragraph |
| `--text-base` | 1rem | 1.5 | 400 | 0 | body | body text, never smaller in guide content |
| `--text-sm` | 0.875rem | 1.5 | 400 to 600 | 0 | body | secondary text, controls, table cells |
| `--text-xs` | 0.78rem | 1.45 | 500 to 600 | 0 | body | chips, meta, tab labels |
| `--text-eyebrow` | 0.8125rem | 1.4 | 600 | 0.16em | display, uppercase | eyebrow above a title |
| `--text-micro` | 0.6875rem | 1.4 | 600 | 0.12em | display, uppercase | section labels, table heads, stat labels |
| `--text-figure-lg` | 2.5rem | 1 | 400 | 0 | accent | hero counters ("30 guías") |
| `--text-figure` | 1.375rem | 1 | 400 | 0 | accent | levels, percentages, stat tile numbers, "0/100" |

Rules:

- Titles, the wordmark and buttons are Montserrat 600 in normal case, with no tracking; the guide title is 700 with -0.015em (decided 2026-11-06 with guide v5; until guide v4 titles were uppercase Barlow Condensed). Eyebrows and micro labels stay uppercase as in the table, written in normal case in the source.
- Guide pages set body text at 1rem with a 1.65 line height; elsewhere it stays at `--text-base`.
- Lilita One is for featured numbers and the words that belong to them ("30 guías"), never for titles or labels. In tables and aligned columns, numbers stay in Montserrat with tabular figures.
- The last word of a list page title may go in `--color-accent` ("Todas las *misiones*").
- Measure: guide prose at most 72ch; step text and the outro at most 68ch.
- Numbers in tables, counts and progress use `font-variant-numeric: tabular-nums`.
- **Figures** (decided 2026-11-07 with home v9): thousands split with a narrow no-break space (U+202F), never a dot: "1 272". Montserrat and Lilita One have no glyph for it, so `<Amount>` (`src/components/ui/Amount.tsx`) puts it in its own span 0.2em wide and keeps the figure on one line. The header counts, the home page and the `/sistema` catalog (Fichas y progreso) use it. Guide quantities in text strings (rewards, item quantities) still use a no-break space (U+00A0) until they move to `<Amount>`.
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

Torre's tips bubble uses `18px 22px 20px` padding; everything else stays on the scale.

### Radii

| Token | Value | Use |
|---|---|---|
| `--radius-xs` | 4px | progress track, tiny thumbnails |
| `--radius-sm` | 8px | item chip icons, table rows on hover, checkboxes (7 to 8px); the guide's icon slots and the rewards bag use 10px (Icon slots and game icons) |
| `--radius-md` | 12px | list rows, inputs that are not pills, tooltips, secondary buttons |
| `--radius-card` | 16px | panels, dropdowns, Torre's tips bubble |
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

## Brand

Decided 2026-11-05: Torre chose proposal C, "Emblema" (https://ta-prototipos.netlify.app/logo/#c). The emblem is an original vector drawing taken from his avatar: the conical hat with its glyph, the angled eyes and the grin, in a 64 × 64 box. The drawing lives in `src/components/brand/emblem-art.ts`; `<Emblem>` (`src/components/brand/Emblem.tsx`) renders it inline, and `scripts/build-icons.ts` writes the favicon files from the same paths.

| Part | Color |
|---|---|
| Hat | `--color-accent` |
| Glyph on the hat | `--color-bg`, so it reads as a cut through the hat |
| Eyes and grin | `--color-ink` |

- **Theme colors**: `<Emblem>` paints with the `fill-accent`, `stroke-bg`, `stroke-ink` and `fill-ink` utilities, so it follows the theme and mode of the nearest `data-theme` and `data-mode`. No hex in the markup. Across the ten palettes accent on bg is at least 5.55:1 (Arcano light) and ink on bg at least 15.23:1, over the 3:1 a graphic needs. The emblem sits on `--color-bg`; on another fill the glyph shows bg, not that fill.
- **Decorative**: `aria-hidden="true"` and `focusable="false"`. The text next to it carries the name, so the header link keeps "Torrente Arcano" as its accessible name.
- **Lockup** (decided 2026-11-07, "Sello"): `<Lockup>` (`src/components/brand/Lockup.tsx`) puts the emblem to the left of the name set in two tight lines, "Torrente" in `--color-ink` and "Arcano" in `--color-accent`, Montserrat 700 at 15px (17px in the desktop header). The whole lockup is one link to the home page named "Torrente Arcano". On hover or focus the hat tilts 9 degrees and the eyes blink once; nothing moves under reduced motion. The header and the footer's legal band use it.
- **Sizes**: 36px in the desktop header and 30px under 768px, 8px from the wordmark (10px from 768px), to its left; 32px in the footer. The full drawing needs 24px or more. Smaller sizes use `variant="simple"`: a taller hat and a bigger grin, with no glyph and no eyes.
- **Favicon**: the browser tab cannot know the visitor's theme, so the favicon is always Arcano. `icon2.svg` is the simple variant on a tile with a 14/64 corner radius, in Arcano dark, and in Arcano light when the browser uses the light scheme (an embedded `prefers-color-scheme` query; the shapes stay the same, so both stay sharp). `icon1.png` is the same tile at 32px in dark, for browsers without SVG favicons; it comes first so browsers that read SVG pick the SVG. `apple-icon.png` is 180px, the full emblem on a square Arcano dark tile with 16 percent padding (iOS rounds the corners). All three sit in `src/app/(frontend)/`, so Next links them from every public page; the Payload panel keeps its own icon. Change the drawing or the Arcano colors, then run `node scripts/build-icons.ts`; a unit test fails while `icon2.svg` is out of date.
- **Outside the site**: PNG and SVG exports per theme and mode, and a round member icon, are at https://ta-prototipos.netlify.app/logo/descargas/. They are made from the same drawing and are not in the repo.

## Layout

- **Header** (decided 2026-11-07: prototype `tmp/mockups/cabecera-final/`, published at https://ta-prototipos.netlify.app/cabecera-final/; option A of cabecera v2 with the Sello lockup of option C and the shared Dofus and checklists panel of option B). `SiteHeader` in `src/components/site/`, rendered by the `(frontend)` layout on every page. 64px, sticky. Transparent at the top of the page, then `--color-bg` at 92 percent with `backdrop-filter: blur(16px) saturate(1.4)` once the page scrolls or a panel is open (solid fallback without `backdrop-filter`).
  - **Left**: the Sello lockup (see Brand), then one nav button per section with its game icon and a chevron: Misiones and Dofus. From 1120px; below that the burger opens the sheet.
  - **Próximamente** (decided 2026-11-09, prototype `tmp/mockups/guias-dofus/`, published at https://ta-prototipos.netlify.app/guias-dofus/): Clases and Mazmorras have no pages yet. They stay in the nav after Dofus as plain text (`.np--soon`, `aria-disabled="true"`, a greyed icon, no chevron, no panel, no link, never focused) followed by the «Próximamente» tag (`Soon`: 20px pill, `--color-raised`, `--color-ink-2`, 600 at 0.625rem). The phone sheet shows them as tiles that do not fold, the footer's Explorar lists them as text with the tag, and the home page cards are disabled the same way. The header search does not find them, nor their classes and dungeons. `soon: true` on the section in `nav.ts` drives all four; removing it brings each back once its pages exist.
  - **Panels**: 20px radius, `--color-surface`, 1px border in the section accent at 35 percent. Each one is a section tile on the left (the section icon in a 64px well, the name and a line with its counts in bold) and the section's art on the right: Misiones has the search button and "Ver todo", its only link, to `/metalogros` (the phone sheet repeats both). No quest or achievement link goes to the old site. Dofus and Checklists share one panel: on the left the «Guías de Dofus» card and the 3 checklists, on the right «Todos los Dofus», the eggs of Torre's Dofus guides in his order (`DOFUS_GUIDES` in `nav.ts`, the order of his guías page), and «Ver todas las guías de Dofus», which goes to his guías page until ours exists. A Dofus Torre has not written yet (no page, or an empty one on his site) is a plain `.egg-soon` element with `aria-disabled`, its egg in grayscale at 45 percent and «(en preparación)» for screen readers; the search does not find it. No text counts the Dofus: Torre adds them over time. There is no separate Checklists button. The guide count is the published guides and the achievement count the published achievement pages in the Publicada state, the same achievements `/metalogros` links (`src/lib/site/counts.ts`), cached with the `guide-pages` tag, which the achievement page and metalogro hooks also expire.
  - **Right**: the search trigger (a pill with "Buscar" and `Ctrl K` from 1360px, 44px tall and 240px wide with the shortcut at its right end; an icon button below), the mode switch (`ModeToggle`, unchanged), and the burger below 1120px. No "Entrar" button until member accounts exist.
  - **Behavior** (`HeaderIsland`, the one client island of the shell): a click opens a panel and closes any other; Esc closes it and returns focus to its button; a click outside or focus leaving the item closes it. `Ctrl K` or `/` opens the search dialog.
  - **Under 768px**: a floating bar inset 12px from the edges with 16px radius. The burger opens a full-height `<dialog>` with one card per section ("Dofus y checklists" for the shared one), each opening in place; the social links sit at the bottom.
  - **Search**: the dialog searches the published quest guides by title, the published achievement pages (Publicada only; one «En preparación» has no page, so it is not searchable) and the metalogros that open, plus what the menu links (sections, Dofus, checklists, classes, dungeons), accent-insensitive, every word in any order, grouped by type: «Misiones», «Logros», «Metalogros», then the menu groups. Groups go from the best match to the worst with the same title-start ranking; on a tie quests come first, then achievements, metalogros and the menu. An achievement links to its page (`/<slug>`) with «{metalogro} · {n} misiones» as its second line; a metalogro links to its panel (`/metalogros#<anchor>`) with its counts. The status line adds « · {n} logros» and « · {n} metalogros» after the quests. Any group with more than 50 matches shows its best 20, and the line says so for each («más de 50 logros») and ends the found part with «: sigue escribiendo». It shares one engine with the home page's hero search (`src/components/site/search.ts`; spec in the prototype's `tmp/mockups/inicio-v9/SEARCH-SPEC.md`, decided 2026-11-07 with home v9). The hero lists the same groups without the menu; with more than one group, each is a listbox group with its title (ARIA APG grouped options), and the arrow keys walk all options in the order they show. The engine and the index load the first time either search is used, and both share one request (see `AGENTS.md`, Next rules). Until the index arrives, the status line says "Cargando las misiones…", also before anything is typed, and the "Ir a" list appears once the search code is in. If loading fails, the line says "No se pudieron cargar las misiones. Vuelve a intentarlo." and the next opening retries.
    - **Matching**: at least 2 letters or digits; with one, the line says "Escribe una letra más para buscar." and nothing is listed. Quests rank by how they match: the title, ignoring opening punctuation (¡ ¿ «), starts with the query; then every word starts a word of the title; then the words appear anywhere. Ties go to the shorter title, then alphabetical.
    - **Cap and status**: up to 50 matching quests all show and the line counts them ("1 misión", "12 misiones"); above 50 the best 20 show and the line says "Más de 50 misiones: sigue escribiendo". Menu matches add " · 2 resultados del menú". With no quest: "Ninguna misión se llama «…». Prueba con otra palabra.", or "Ninguna misión; 2 resultados del menú." when the menu matches.
    - **Results**: each quest has the quest icon, the title and a second line with its level and achievement ("Nivel 20 · La ocasión hace al ladrón"). Every occurrence of every word is marked (`<mark class="hit">`: weight 800 and a 2px `--color-accent` underline, no fill), matched accent-insensitive on the original text. Groups order by their best match, with Misiones first on a tie and the menu groups after it in menu order. The Misiones panel button reads "Buscar una misión".
  - **Links**: pages the app does not have yet link to the Squarespace site with the same slug (`src/lib/site/legacy.ts`).
- **Footer** (decided 2026-11-07, same prototype). `SiteFooter` in `src/components/site/`. Three columns from 1120px, two from 768px, one below:
  - **Torre**: his cut-out avatar, "Torre" in `--color-accent-2`, "Juega a Dofus en directo y escribe todas las guías de esta web." and a card that says where he streams. It shows "Torre está en directo" only once the Twitch live state exists (planned in `src/globals/`).
  - **Explorar**: the five sections under an accent eyebrow: Misiones y logros, Dofus and Checklists as plain links, Clases and Mazmorras as text with the «Próximamente» tag (see Header).
  - **Comunidad**: the "Únete al Discord" card, the "Apoya en Ko-fi" card (accent outline), then "Sigue a Torre" with Twitch, Kick and YouTube as inventory slots with their handles, and "Volver arriba". Each link appears once in the footer.
  - **Volver arriba** links to `#arriba`, the id of `<body>`. The page scrolls smoothly to the top (`scroll-behavior: smooth` on `html` under `prefers-reduced-motion: no-preference`; it jumps under reduced motion), and the next Tab lands on the skip link, as on a fresh load. `<html data-scroll-behavior="smooth">` tells Next to turn smooth scrolling off during route changes.
  - **Legal band**: the small Sello lockup, Aviso legal, Política de cookies, Política de privacidad, the copyright year, and the Ankama disclaimer.
  - No Instagram, no floating support button.
- **Quest guide** (decided 2026-11-06: guide v5, prototype `tmp/mockups/guia-v5/`, published at https://ta-prototipos.netlify.app/guia-v5/; guide v4 after Torre's review, which replaced option 3 variant B): a flat page, with the content straight on `--color-bg` and no card around it. The free view is the full guide. From top to bottom: the quest header (the quest giver's render, the title, the subtitle, then Prerrequisitos, Necesitarás and Recompensas with the rewards bag); the intro prose; the steps, split by a line; the outro prose and the video. It is one centered reading column, 880px wide plus the gutters (16px, 24px from 640px, 48px from 1024px), 28px from the header (40px from 1024px) and 56px above the page end. Guide v5 dropped the "Pasos" side list and the step numbers. Every part is specified under Quest guide components. There are no achievement tabs, no ticks and no step titles on the page. "Modo compacto" (decided 2026-11-02) is a premium feature that trims the header and the long dialogue blocks; it is enforced on the server like every premium feature (see `AGENTS.md`), so a visitor without the entitlement never receives the compact layout or its toggle.
  - **What renders today** (the page at `/<slug>`, 2026-11-05): only what the guide and its DofusDB quest store. A body with step blocks (the "Paso" block in the panel) renders the blocks before the first step as intro prose, then the steps, then the blocks after the last step as outro prose; a block placed between two steps stays at the end of the step before it, so the reading order never changes. A body without step blocks renders all its blocks in order as prose, with no steps: the page never invents steps from the prose. Fight blocks render where they stand, and the next quest card closes the page when the next quest of the achievement has a published guide (decided 2026-11-06). What is still missing is listed under Content model gaps.
  - **Draft preview**: in draft mode (opened from the panel, see `AGENTS.md`) a bar in `--color-raised` sits above the header with "Vista previa del borrador. Los visitantes ven la versión publicada." and a ghost button "Salir de la vista previa"; the page is `noindex`.
- **Achievement page** (decided 2026-11-07: prototype `tmp/mockups/logro-v2/`, published at https://ta-prototipos.netlify.app/logro-v2/). An achievement page at `/<slug>`, from `achievement-pages`. The guide's gutters and rhythm, 1200px wide, with a 300px side column from 1024px (340px from 1280px, sticky 88px from the top) and below the content on phones. From top to bottom: the breadcrumb, the achievement header, Torre's intro, «Las misiones, en orden», Torre's outro, and the previous and next achievement. The side column holds «Metalogro {name}» and «Cuenta para». No progress tracking: no checkboxes, counters or «Te toca». Every part is specified under Achievement page components. The page root sets `--color-section: var(--color-sec-logros)`.
- **Metalogros index** (decided 2026-11-07: variant D «Buscador + mosaico», prototype `tmp/mockups/logros-d/` with `tmp/mockups/comun/indice/`, published at https://ta-prototipos.netlify.app/logros-d/). `/metalogros`, from `achievement-groups` and `achievement-pages`. The title «Todos los metalogros», a lead and the totals; the search field; then the metalogros as tiles in three groups: «Misiones generales e historias» in their order, «Zonas» from A to Z and «Eventos de temporada». Specified under Metalogros index components.
- **Dofus guide and checklist**: title block, summary strip (level range, prerequisites done, quests done, dungeons, segmented progress), chapters as numbered sections of checkable rows; from 1024px a sticky side column with the Dofus card and tabs (Capítulos, Objetos necesarios).
- **List pages** (achievements, quests, dungeons, classes): centered title and subtitle, a toolbar (search with live count, filter pills, "Ocultar hechas"), then a table or card grid.
- **Home** (decided 2026-11-07: prototype `tmp/mockups/inicio-v9/`, published at https://ta-prototipos.netlify.app/inicio-v9/). `src/app/(frontend)/page.tsx` with the sections in `src/components/home/`.
  - **Live strip**: while Torre is live, the first thing under the header links to his Twitch channel; under 640px it is one line, so the search stays on the first screen. There is no Twitch API yet, so it never shows in production; `?directo=1` simulates it in development and on dev (`src/lib/site/live.ts`).
  - **Hero**: the `h1` holds the eyebrow "Guías de Dofus en español" and "Torrente Arcano" (Montserrat 700 at `--text-hero`, -0.02em), the lead, and Torre (172px at most, 1x and 2x) over "¿Qué misión estás haciendo?", the label of the quest search. Beside it (above it under 1024px) the Krosmoz island with the six primordial Dofus. The island is the LCP image on phones: AVIF and WebP at 480, 640 and 960, `fetchpriority="high"`. The eggs bob twice and stop within 5 seconds; nothing moves under reduced motion.
  - **Quest search**: a combobox (WAI-ARIA APG, list autocomplete, no automatic selection) on the shared engine (Search, above). The results float in a panel under the field (`position: absolute`), so opening it, typing, loading or finding nothing never moves the page. Arrow keys move the active option (an inset 1.5px `--color-accent` ring on `--color-raised`), Enter opens it or the first result, Esc closes and a second Esc clears, Tab and a click outside close. A screen reader hears the status from a `role="status"` region 400ms after typing stops. On phones the field scrolls to just under the header and the panel ends above the on-screen keyboard (`visualViewport`). While the field is on screen the header's search button is hidden with `visibility`, keeping its box; `Ctrl K` and `/` still open the dialog. Without JavaScript the form sends the query to the legacy site's search.
  - **Qué vas a encontrar**: first the quests banner, full width: the four «PNJ representativos» of the metalogros index (Meriana, Enviada de los Doce, Paula Sepe, Draconiros) standing in Astrub's square and breaking the top of the frame, then "Misiones y logros" and "{guides} misiones en {achievements} logros. Búscalas por nombre, zona o historia, de Astrub al Selocalipsis." with both figures in Lilita One and `--color-accent-2`. The figures come from `loadSiteCounts`, the same function as the header's. Then four cards: Guías de Dofus (three eggs), Checklists (three real steps of the Silvestre checklist), Clases (six class heads) and Mazmorras (the Crocantería's last room and the Crunchidor); four in a row from 1280px, 2 × 2 below, with only the title under 640px. Card titles are `h3`; the link is the title's text, stretched over the card with `::after`, and the line under it is its `aria-describedby`. Every card links where the header menu links (`SECTIONS` in `nav.ts`). Clases and Mazmorras are «Próximamente» (see Header): the card is a plain `li` (the tag in its title says the state), its art in grayscale at 55 percent, the title in `--color-ink-2` followed by the tag, no link and no hover effect.
  - **Una guía para cada misión**: four numbered points beside a small copy of the real guide of «Seis pies bajo tierra» with the same numbers on its parts (header, coordinates chip, screenshot, Torre's tip). The numbers sit on free corners or after the chip, never on text. Pointing at a point rings its part; on desktop windows at least 840px tall the guide is sticky and the point crossing the middle of the screen rings its part through scroll-driven CSS (`view-timeline`, the ring only changes opacity). No JavaScript: without scroll-driven animations or under reduced motion, the numbers do the pairing.
  - **Checklists para ir a por tu Dofus**: the three checklists of the menu with their egg and figure (100 pasos, 70 pasos, 337 almas; `src/components/home/data.ts`, copied from `silvestre-checklist` until the checklists move here).
  - **Las guías son de Torre**: his portrait, his line, one invitation (the Discord), and the live state: a headline with "Ver directo" while live, otherwise a small notice ("Ahora no está en directo.") above the Twitch, Kick and YouTube links.
  - **Footer on the home page**: no Torre column and no "Sigue a Torre", since the section above says it; the Comunidad cards keep the width they have in the three-column footer (24rem at most) with a 40px icon well. Done in CSS (`body:has(main.home)`), so the footer stays one component.
  - **Motion**: headings, cards and checklists enter on scroll with CSS scroll-driven animations inside `@supports`; nothing moves under reduced motion. The page adds no client JavaScript beyond the hero's search island.

## Components

Every interactive component has these states: default, hover (mouse only), focus-visible, pressed, disabled, and where it applies selected or done. Hover never moves layout; it changes fill, color or a transform.

| Component | Anatomy | States |
|---|---|---|
| Button, primary | pill, 44px high, 24px side padding, display 600 at `--text-sm` in normal case, transparent fill, 1.5px `--color-accent` border, `--color-accent` text (at least 6.08:1 on surface in every theme and mode). One per view. No color is ever a button fill | hover: `--color-raised` fill behind the same text and border (at least 4.93:1); pressed: `scale(.96)`; disabled: 40 percent opacity, no pointer |
| Button, secondary | pill, 40px, `--color-raised` fill, `--color-ink` text, optional leading icon | hover: `--color-line` fill (ink on line at least 9.62); pressed: scale |
| Button, ghost | pill, 36px, no fill, `--color-ink-2` text | hover: `--color-raised` fill |
| Icon button | 40px circle (44px under `pointer: coarse`), `aria-label` required | as secondary |
| Nav link | pill, 36px, `6px 14px` padding | hover: faint fill; current page: `--color-accent` text plus `aria-current="page"` |
| Dropdown panel | 16px radius, `--color-surface` at 92 percent with blur, 12px padding, rows of 40px with a 24px game icon | enter and exit per the motion table; Esc and outside click close; arrow keys move |
| Search dialog | native `<dialog>`, 640px wide, input at top, results grouped by type (misión, logro, Dofus, clase) with icons, keyboard selection | opens on `Ctrl K` or `/`; empty state with recent searches; no-results state with a suggestion |
| Card, collection (Dofus, class, dungeon) | the whole card is one `<a>`; art layer, shade, name in display 600, one line of meta; 1px border in `--color-section`; optional progress ring top right in `--color-accent` with the percentage in Lilita One and `--color-accent-2`. Light-mode treatment below | hover: a soft glow in `--color-section` around the border, art settles from `scale(1.04)` to 1; done: success ring; locked premium: lock badge and the meta says why |
| Stat tile | 14px radius, `--color-raised` fill, optional game icon, number in Lilita One at `--text-figure` in `--color-accent-2` (`white-space: nowrap`), micro label in `--color-ink-2`. The guide page no longer uses it (the XP and kamas rows of Recompensas replaced the Botín tiles); it stays in the catalog for the achievement and checklist pages | static |
| Chip | 22 to 26px pill, `--text-xs`, `--color-raised` fill, `--color-ink-2` text, optional 16px game icon | static; the coordinates chip is its own component (Quest guide components) |
| Segmented tabs | pill track in `--color-raised`; active segment `--color-surface` with `--color-accent` text | selected uses `aria-selected`; arrow keys move between tabs |
| Checkbox | 22px, `--radius-sm`, `--color-muted` border | checked: `--color-accent` fill with a `--color-bg` check mark (at least 5.55:1); pressed: `scale(.9)` for 100ms |
| Progress bar | 10 to 14px track in `--color-bg` (dark) or `--color-raised` with a hairline (light), `--color-accent` fill (at least 4.93:1 against raised, over the 3:1 a fill needs), optional chapter ticks, percentage beside it in Lilita One and `--color-accent-2` | animates `transform: scaleX()` on the fill, never `width` |
| Callout | `--radius-md`, 2px border in its color, its color at 9 percent over `--color-bg`, `16px 20px 18px` padding, `role="note"` named by its title. The title is a plain heading inside the box (Montserrat 600, 1.25rem, `--color-ink`): no ribbon, no tab, no glyph (decided 2026-11-05, guide v4). Text in `--color-ink` (at least 13.31:1 on every fill). In guides, the tip variant renders as Torre's tips instead (Quest guide components) | warning ("¡Importante!"), stop ("¡Alto!"), tip ("Consejo", outside guides) |
| Table | 44px rows, 1px `--color-line` between rows, sticky head row in micro labels, checkbox column first, numbers right-aligned | row hover: `--color-raised`; done rows keep their place and tick |
| Tooltip | `--color-raised`, 12px radius, `--text-xs`, 8px offset | shows on hover after 300ms and on focus; never holds the only copy of information |
| Dialog | native `<dialog>` with `showModal()`, 16px radius, `--shadow-dialog`, title in display 600, actions bottom right | confirm destructive actions with a dialog, never `confirm()`; offer "Deshacer" in a toast for 8 seconds after |
| Toast | bottom center, pill or 12px radius, `--color-raised` | auto-dismiss 4 seconds (8 with an undo action); `role="status"` |
| Mode switch | the egg medallion from Dofus Tools, now the dark and light toggle within the chosen theme. The ivory and ebony egg art stay as its two icons; the medallion keeps its own dark fill in both modes, so the art reads the same on every theme. The knob ring is `--color-accent` | `role="switch"` with `aria-checked`; the mode change uses the corner reveal of the old site where View Transitions exist, a plain swap otherwise |
| Theme picker | five swatch cards in a grid (three per row from 640px, two below): a strip of the theme's bg, surface, accent and accent-2, the theme name in display 600, and on the four premium ones a lock icon and a "Premium" label. The current theme has a `--color-accent` border and a check | entitled member: choosing saves the theme to the profile and the server re-renders the page with it. Everyone else: hover or focus shows a preview inside the card (a mini page in that theme's colors, scoped to the card with its own `data-theme`) without changing the page; choosing a premium theme opens the premium explainer, and nothing is saved |
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

Decided 2026-11-05 from the approved guide v4 prototype, revised 2026-11-06 by guide v5 (it replaced the option 3 variant B components: hero header, level medallion, summary ribbon, step cards with ticks, progress pill and Botín card; v5 removed the step numbers and the "Pasos" side list). They are server components; the only client code is one island that copies coordinates, plays videos, opens images fullscreen and opens and closes the rewards bag (see Coordinates chip, Video facade, Figure and fullscreen viewer, and Quest header). Generic parts live in `src/components/ui/`, game parts in `src/components/game/`. The page root sets `--color-section: var(--color-sec-misiones)`.

Rules shared by all of them:

- **Text never sits on art.** The quest giver's render stands beside the title, and its name is text under it.
- **Links** in the header and the prose are underlined, so they never rely on color alone.
- **Focus** follows Accessibility: a 2px `--color-ink` outline, or `--color-accent` on accent-colored controls (the coordinates chip, the copy button).
- **Motion** is CSS only. Every transition below drops to 0.01ms under `prefers-reduced-motion: reduce` through the global rule in `globals.css`.

#### New contrast pairs

Worst case over the five themes, in WCAG 2.x ratios.

| Pair | Dark | Light | Needs |
|---|---|---|---|
| accent on well (coordinates chip text) | 6.32 Brâkmar | 4.93 Ocre | 4.5 |
| accent on bg (chip border, links) | 6.46 Brâkmar | 5.55 Arcano | 3 / 4.5 |
| ink-2 on bg (subtitle) | 10.06 Arcano | 9.38 Amakna | 4.5 |
| ink on surface (rewards bag list) | 15.10 Arcano | 16.54 Amakna | 4.5 |
| ink on warning, danger or info at 9 % over bg (callouts) | 13.91 Arcano | 13.31 Amakna | 4.5 |
| ink on bg 82% over the video poster (play glyph) | 9.60 Arcano | 10.02 Amakna | 3 |
| ink on bg 92% over the page (viewer caption on the backdrop) | 13.42 Arcano | 12.75 Amakna | 4.5 |

#### Quest header

- **Anatomy**: a `<header>` with the `h1` (Montserrat 700, `clamp(2rem, 1.45rem + 2.1vw, 3rem)`, line height 1.06, -0.015em tracking, `--color-ink`, `text-wrap: balance`), the subtitle in `--color-ink-2`, and the three fact columns, closed by a 1px `--color-line` rule with 32px above it. The quest giver stands in a column to the left: 104px wide (112px from 1024px), a 40px gap (44px from 1024px), vertically centered on the text, so it adds no height to the top of the page.
- **Breadcrumb** (decided 2026-11-07 with guide v6, prototype `tmp/mockups/guia-v6/`, published at https://ta-prototipos.netlify.app/guia-v6/): the Breadcrumb of the achievement page (Achievement page components) right above the header, with the guide's parents only: «Metalogros / Astrub / La ocasión hace al ladrón». Under 40rem only the direct parent, «‹ La ocasión hace al ladrón». The achievement is the published achievement page that lists the guide's quest (the first by order if several do); when that page is «En preparación» it has no page, so the breadcrumb ends at the metalogro. A quest in no achievement page has no breadcrumb (`guideBreadcrumb` in `src/lib/achievements/page.ts`).
- **Subtitle**: exactly "Misión de {zona} - Nivel {n} - Misión {k} de {total}", the parts joined with " - ", with no trophy and no link: the breadcrumb names the achievement. The zone is the area of the quest's start map in DofusDB (`quests.zone`, "Astrub"); the level is the quest's minimum level; the position and the total are the quest's place among the quests of its achievement page (a row of alternatives, such as the class quest, counts as one), or DofusDB's (`quests.achievement`) when the quest has no achievement page. A missing part is left out ("Nivel 20" alone when the quest has no zone and no achievement); with no part at all there is no subtitle.
- **Quest giver**: the NPC that starts the quest, rendered by DofusDB and imported once into Media (see Imagery). From 576px: the render facing right (direction 1) at 84px wide (92px from 1024px), on a flat oval "floor" in `--color-raised` fading to transparent; under it the NPC name (Montserrat 600, 1.0625rem, line height 1.2, `--color-ink`) and the coordinates chip of the start position. Under 576px the header flips: the render facing left (direction 3), 50px wide in a 56px column, stands right of the title and subtitle, with the name only (0.9375rem); step 1 right below carries the same chip. The picture uses `<source media="(max-width: 35.99rem)">` for the left-facing render. The render is decorative (`alt=""`); a visually hidden "Empieza con " precedes the name. No render, no column: never a placeholder.
- **Facts**: three `<section>`s named by their `h2` (Montserrat 600, 1.25rem, `--color-ink`): Prerrequisitos and Necesitarás side by side (`auto 1fr`, 48px gap), Recompensas below at full width with its rows in a wrapping flex line (8px row gap, 32px column gap). Under 576px they stack. Each line is a row: a 44px slot with the icon, then the text in `--color-ink`, the amounts in Montserrat 800 with tabular figures ("**1 ×** Pico de tofu", "**9 800** a **16 380** XP").
  - **Prerrequisitos**: one row per line of the guide's summary, without the final period. A line that names one of the quest's prerequisite quests gets the quest book icon, and links to that quest's guide when it is published. Other lines ("Nivel mínimo 20") are plain text rows with no slot.
  - **Necesitarás**: the needed items (never quest items, DofusDB super type 14) with their item icon, each copying its name (Item chip and item slot, Copy), then the note lines. A note that starts with a quantity ("1 x Combate (solo).") shows it apart; a note about a combat gets the combat icon. Other notes are plain rows.
  - **Recompensas**: from the linked quest's DofusDB rewards: the XP range with the XP arrow, the kamas with the coin stack, then the rewards bag with the items in Torre's order (the reverse of DofusDB's). Without DofusDB rewards, the guide's rewards text, one plain row per line, never rows made up from it.
- **Rewards bag** (decided 2026-11-06, guide v5): the item rewards collapse into one row that opens their list. It is a `<button>` (`aria-expanded`, `aria-controls` pointing at the list) holding the game's inventory bag in its slot, "**4** objetos" ("1 objeto" for one) underlined in `--color-muted` (`currentColor` and 2px on hover, with the slot border in `--color-accent`), and a 16px chevron in `--color-ink-2` that turns 180 degrees when open. The list is a `<ul>` named "Objetos de recompensa", one row per item ("**1 ×** Pico de tofu" with its slot), 8px apart. From 576px it opens as a popover 6px under the button: `--color-surface`, 1px `--color-well-line`, 14px radius, `10px 14px 10px 10px` padding, `--shadow-float`, as wide as its longest row up to `min(440px, 100vw - 32px)`. Under 576px it opens inline under the button, without the shadow. It closes on a second click, Esc (focus returns to the button when it was inside), a click outside, or focus leaving it. Without JavaScript the list shows under the button: the inline `<head>` script sets `data-js` on `<html>` before first paint, and only then does the CSS hide the closed list (`visibility: hidden`, so a closed list is out of the tab order and the accessibility tree). The state lives in the button's `aria-expanded`, toggled by the guide island. No item rewards, no bag. Motion: the popover enters from `translateY(-6px) scale(.97)` and opacity 0 over `--duration-base` `--ease-out`, and leaves over 150ms.
- **XP range** (decided 2026-11-05): "9 800 a 16 380 XP" is the XP at the step's optimal level up to the XP at the cap, 1.5 times the optimal level, summed over the quest's steps with the game client's formula (`src/lib/dofusdb/quest-rewards.ts`, as DofusDB and Ganymede compute it). The quest stores both: `rewards.experienceMin` and `rewards.experience` (the level 200 value, which is the cap). When they are equal, or the minimum is missing, one figure. Kamas stay a single figure, the optimal level's, as on DofusDB.
- **Empty parts** are left out: a column with no rows is not rendered, and with no column at all there is no facts block.
- **Motion**: none. The title never animates in.

#### Icon slots and game icons

- **Slot**: 44px, 10px radius, `--color-slot` with a 1px `--color-slot-line` border, `aria-hidden`. The icon inside is drawn at 34px, or at its file size when the file is smaller, never upscaled. A missing item icon leaves the slot empty.
- **Game icons**: a fixed set of original game files, converted losslessly to WebP in `public/img/game/` and listed with their source in `src/components/game/game-icons.ts`. Never copies from fan sites.

| Icon | File | Source | Size |
|---|---|---|---|
| Combat | `combate.webp` | Dofus 3 client, `statistics/2x/21-96.png` (dofusdude/dofus3-main 3.7.13.17, `statistics_images_96`) | 96px |
| Kamas | `kamas.webp` | Dofus 3 client, `statistics/2x/78-96.png` (same export) | 96px |
| Quest book | `mision.webp` | `dofusdb.fr/icons/icon_quests.png` (game UI) | 70px |
| XP arrow | `xp.webp` | Dofus 3 client, `ui/guidebook/feature_494-24.png` (`ui_guidebook_images`) | 24px |
| Achievement trophy | `logro.webp` | Dofus 3 client, `misc/guildrank/87-28.png` (`misc_images`) | 28px |
| Inventory bag | `bolsa.webp` | Dofus 3 client, `ui/guidebook/feature_139-24.png` (`ui_guidebook_images`) | 24px |

The XP arrow, the inventory bag and the trophy only exist at 24 and 28px in the client exports, so they render at that size: the arrow and the bag at 24px in their slots, the trophy at 22px in the subtitle. Torre's avatar for his tips is `public/img/torre/avatar.webp`, 144px, from his own avatar.

#### Item chip and item slot

Two sizes of the same thing: a game item with its icon, quantity and name. Item icons come from our own media (Imagery); a missing icon leaves an empty well, never a placeholder glyph.

- **Item chip** (ribbon, prose): 32px pill, `--color-raised`, 24px icon inset 4px from the left edge, name in `--text-xs` 600 `--color-ink`, then `× 1` in `--color-ink-2` 500. The name copies itself (see Copy below).
- **Item slot** (catalog; the guide page uses the row of Quest header): a 72px well (`--radius-sm`, `--color-raised`, 1px `--color-line`) with the 48px icon; the quantity in Lilita One 0.9375rem `--color-accent-2` in the bottom-right corner, as in the game's inventory; the name under the well, centered, `--text-xs` `--color-ink-2`. Slots are 104 to 112px wide. The name copies itself (see Copy below).
- **Copy** (decided 2026-11-09, made quiet the same day after the user's review): every needed item copies its name, without the quantity, so the player clicks it and pastes the name in the game's search. That is each item row of Necesitarás (the quest header and the achievement page's «Necesitarás en total»), the item chip and the item slot; free-text notes and the rewards bag copy nothing. The name is the control (`CopyName` in `src/components/game/Item.tsx`): the guide's island (`PageEnhancements`) turns it into a button through the same `data-copy` as the coordinates chip, named «Copiar Pluma de Kwak de viento», and its `::after` covers the whole row, chip or slot (`copyhost`), so the icon copies too, with at least a 40px target (44px under `pointer: coarse`).
  - **At rest** the item looks exactly as before: no glyph, no button chrome. Only `cursor: pointer` says it does something.
  - **Hover** (mouse only, `@media (hover: hover) and (pointer: fine)`) on the name or its icon: the name takes `--color-accent` with a 1px underline, a 14px copy glyph fades in right after it (opacity only, `--duration-fast`), and the icon's slot gets a faint ring (1px, `--color-accent` at 55 percent). `:focus-visible` shows the same cue plus the standard focus outline. Pressed: `scale(.96)`.
  - **After copying** the glyph turns into a check for 1.6 s (`data-copied`) and the status region announces «Copiado: Pluma de Kwak de viento»; when the clipboard fails it says «No se pudo copiar. Busca «Pluma de Kwak de viento» en el juego.» (`data-copy-failed`).
  - **Touch screens**: no extra chrome; a tap copies and the status shows.
  - **Without JavaScript** it stays text and the glyphs are not drawn.
- **Quantities**: always shown, also `1`; thousands split with a space (`1 000`).
- **Accessibility**: icons have `alt=""` because the name is text next to them. The slot puts the quantity in a visually hidden prefix so it reads "1 × Pico de tofu"; the drawn quantity is `aria-hidden`.
- **Missing or not-owned items** (checklists later): the icon in `grayscale(1)` at 60 percent opacity, as Imagery says.

#### Monster chip and fight block

Decided 2026-11-06 with guide v5: a fight is a list of rows like the header's, not raised chips.

- **Fight block** (`fight`, "Combate" in the panel, allowed in the body and inside a step): monsters from the Monsters collection, each with a quantity (at least 1). The intro line stays in the text before it ("Vas a empezar una lucha contra:").
- **Anatomy**: a `<ul>` that wraps (8px row gap, 28px column gap). Each monster is a row: a 52px slot (`--color-slot`, 10px radius, like Icon slots) with the monster image at 42px, never upscaled, then "**1 ×** Ramán famélico" in `--color-ink`, the quantity in 800 with tabular figures. No level. A monster without an imported image leaves its slot empty.
- **From the import**: `pnpm import:guides` turns a list right after a paragraph ending in "lucha contra:" into the block when every row reads "N x Name" and every name matches a monster in DofusDB's Spanish names (case, extra spaces and a final period ignored; the lowest DofusDB ID wins a tie). One unmatched name keeps the whole list as text and is reported as an oddity ("Monstruo sin casar en un combate: …"). Guides imported before the block existed are converted by `pnpm guides:backfill` (`scripts/backfill-guides.ts`, shared code in `src/lib/guides/fight-lists.ts`).
- **States**: static. **Accessibility**: the list is a list; images have `alt=""`, since the name is text. **Motion**: none.

#### Coordinates chip

- **Anatomy**: an inline 32px chip, 8px radius, `--color-well` fill, a 1.5px `--color-accent` border, a 16px pin icon then the coordinates in Montserrat 800 at 0.9375rem with tabular figures, in `--color-accent` (at least 4.93:1 on the well). The label is the game's notation, `[7,-19]`.
- **What it copies**: `/travel 7,-19`. Pasted in the game chat it sets the autopilot, which is what a reader following a guide wants. The `[x,y]` map link stays as the visible label only; there is no second control to copy it. The start position uses the same chip, under the quest giver.
- **Coordinates in prose**: the renderer of the guide body turns every `[x,y]` written in a text node into a chip. The pattern is two signed integers in square brackets with optional spaces (`[7,-19]`, `[ -1 , 17 ]`); anything else stays text: decimals, a single number, three numbers, or coordinates inside a link or code. A step whose own X and Y do not appear in its text shows them as a chip on the first line of the step.
- **Without JavaScript**: the chip renders as plain text, readable and selectable. The island then turns each chip into a button (`role="button"`, `tabindex="0"`, Enter and Space) and gives it the name `[7,-19], copiar /travel 7,-19`, which starts with the visible text.
- **Feedback**: on copy, a toast "Copiado: /travel 7,-19" in a `role="status"` region (Toast). If the clipboard is refused, the toast says "Escribe /travel 7,-19 en el chat".
- **States**: hover (mouse only) fills it with `--color-raised`; pressed `scale(.95)` over `--duration-press`; focus-visible a 2px `--color-accent` outline. A transparent `::after` grows the target to 44px tall, centered on the chip, without changing the drawn chip or the line height.
- **Motion**: fill over `--duration-fast`; the toast enters per the motion table.

#### Steps

Decided 2026-11-05 (guide v4), revised 2026-11-06 (guide v5): the section is called "Pasos" everywhere a reader or Torre sees it; the panel block is `step` ("Paso"). Steps have no number, no title and no tick on the page, and there is no side list.

- **Anatomy**: a `<section>` named by a visually hidden `h2` "Pasos", holding an `<ol>` 8px under the header. Each step has 40px of padding above and below (32px under 640px) and a 1px `--color-line` rule on top; the first step has no rule and 32px on top. Inside, the step's blocks are 18px apart, prose capped at 68ch in `--color-ink`. The `<ol>` gives screen readers the count.
- **Screenshots** take the full width of the column, 14px radius, `--shadow-art`.
- **Anchor**: each step is `id="paso-N"`, with `scroll-margin-top: 88px`.
- **Fields**: the block has no title, only X, Y and its blocks (the optional panel-only title was removed on 2026-11-07; the migration moved the 4 imported titles into their steps as a first bold paragraph). The block's X and Y show as a chip on the first line only when the text does not already name them.
- **Start sentence**: the importer moves a bare start line ("Habla con Hupe Esse [7,-19] para empezar la misión.") from the body to `summary.startNpc`, `startX` and `startY`, which left step 1 with only its chip. When the first step has no text, the guide has a start NPC and the step's X and Y equal the start coordinates, the page writes that line back around the chip: "Habla con **{NPC}** [x,y] para empezar la misión." Any other step 1 renders as usual (`startSentenceNpc` in `src/lib/guides/step-nav.ts`).

#### Callouts and Torre's tips

- **Callout** ("¡Importante!", "¡Alto!"): as the Callout row of the components table, 18px from the blocks around it inside a step.
- **Torre's tips** (`TorreTips`): the tip callout of a guide is Torre speaking. His avatar in a 72px circle (2px `--color-well-line` ring, `alt=""`, lazy), then a speech bubble 18px away: `--color-surface`, 1px `--color-well-line`, 16px radius, `18px 22px 20px` padding, with a caret pointing at the avatar. Inside, the heading "Recomendaciones de Torre" (Montserrat 600, 1.25rem, `--color-ink`) and the text in `--color-ink`; its lists have hollow circle markers in `--color-accent`, items 10px apart. Inside a step it sits 32px under the block above it. An `<aside>` named by that heading. Under 640px the avatar (56px) sits above the bubble and the caret points up.
- The importer turns "NOTA" paragraphs and Torre's "RECOMENDACIONES" sections into tips (`README.md`, Guide import notes).

#### Figure and fullscreen viewer

Decided 2026-11-05: every guide image opens fullscreen. The component is `Figure` in `src/components/ui/`; the viewer lives in the guide island (`PageEnhancements`).

- **Anatomy**: a `<figure>` holding a link around the image (`<picture>`, AVIF then WebP) and the optional `<figcaption>`. The link is a block with the image's `--radius-card` and a `zoom-in` cursor; nothing else is drawn on it.
- **Without JavaScript**: the link points at the WebP file (`src`), the largest variant, so the image still opens, in the same tab.
- **Viewer**: with the island, a click (no modifier key) opens a native `<dialog>` with `showModal()`. The dialog covers the viewport and is transparent; its `::backdrop` is `--color-bg` at 92 percent. Inside: the image as a `<picture>` (AVIF, then WebP) at up to the viewport size and never past its file size (`max-width` and `max-height`, `object-fit: contain`, `--radius-md`, `--color-raised` while it loads), the caption under it in `--text-sm` `--color-ink`, centered, at most 72ch, and an Icon button "Cerrar" 12px from the top right corner. The page reserves 64px on top for the button, 16px on the other sides (32px from 768px) and 4rem under the image for the caption. The dialog copies `data-theme` and `data-mode` from the nearest ancestor that has them, so it matches the theme of the image it shows (the `/sistema` sections; on guide pages that is `<html>`).
- **States**: link default and focus-visible (the global 2px `--color-ink` outline, following the radius); viewer closed and open. No hover change on the link beyond the cursor.
- **Closing**: Esc (native), the "Cerrar" button, or a click anywhere outside the image, the caption and the button (the click lands on the dialog itself). Focus then returns to the link that opened it.
- **Accessibility**: the link's name is "Ver imagen a pantalla completa: {alt}" ("Ver imagen a pantalla completa" when the alt is empty), from `uiStrings.figure`. The dialog is named "Imagen a pantalla completa"; the image inside keeps the media record's alt. `showModal()` makes the page inert and moves focus to "Cerrar". The caption, `--color-ink` on the backdrop, keeps at least 12.75:1 (New contrast pairs).
- **Motion**: the backdrop fades in over `--duration-fast`; the image and caption enter from `opacity: 0; transform: translateY(12px) scale(.98)` over `--duration-slow` `--ease-out` (Motion, Dialogs), through `@starting-style`. Closing is instant. Under reduced motion the global rule, which also covers `::backdrop`, drops both to 0.01ms.
- **Priority**: the first image of a guide body, in document order, loads with `fetchpriority="high"` and no lazy loading, whether it is an Image block or an image inside a text or callout block. Exactly one image gets it. On phones it is usually below the header, and the LCP is the title; the rest stay lazy. The quest giver's render loads eagerly without `fetchpriority`.
- **Budget**: the viewer adds a few hundred bytes to the island and no dependency. On the page the browser picks the width the column needs through `srcset` and `sizes`; the viewer always loads the widest variant (Imagery).

#### Video facade

- **Anatomy**: a `<figure>` with a 16:9 frame (`--radius-card`, `--shadow-art`, `--color-raised`) holding a link: the poster image (`object-fit: cover`, `alt=""`) and a 72px play badge centered on it (`--color-bg` at 82 percent, 2px `--color-accent` ring, a triangle in `--color-ink`). The caption under it: the video title and "YouTube, Torrente Arcano" in `--text-sm` `--color-muted`.
- **No third-party code until the click**: the page loads no iframe, script or image from YouTube. The poster is our own copy of the thumbnail, stored as media; without one, the frame shows the play badge and the title on `--color-raised`, the title centered under the badge (`--text-lg` under 640px, `--text-xl` above, at most two lines), never over it.
- **Without JavaScript** the link opens the video on YouTube. With the island, a click swaps the link for a `youtube-nocookie.com` iframe with `autoplay=1`, the same title and `allow="autoplay; encrypted-media; picture-in-picture"`, and moves focus into it.
- **YouTube only** (decided 2026-11-05): guide videos are YouTube videos. All 44 video embeds in the 1796 legacy Squarespace pages are YouTube (21 of them wrapped in Embedly), so the video block in the panel accepts only an https link that resolves to a YouTube video ID (`youtube.com/watch`, `youtu.be`, `/embed/`, `/shorts/`). If stored data ever holds another URL, the component renders a plain link with the title as a defensive fallback; it is not a supported case.
- **States**: hover (mouse only) scales the badge to 1.06 over `--duration-fast`; focus-visible is a 3px `--color-ink` outline offset -3px inside the frame.
- **Accessibility**: the link's name is "Ver el vídeo: {title}"; the iframe gets the video title.

#### Achievement chain

- **Anatomy**: one line in `--text-sm` `--color-ink-2`: the achievement's 24px icon, "Logro" and the achievement as a link, then "misión 2 de 3:" and the quests of the chain in order, separated by `→` in `--color-ink-2`. Other quests are links; the current one is `--color-ink` 600 text with `aria-current="page"`.
- **Long chains** (more than five quests) show the first, the one before, the current, the one after and the last, with `…` between gaps.
- **Accessibility**: a `<nav aria-label="Cadena del logro">` with an `<ol>`; the arrows are CSS, so a screen reader hears a numbered list. **Motion**: none.

#### Next quest card

Decided 2026-11-06 with guide v5. It closes the guide, 24px under the outro.

- **Data**: the quest in the next position of the same achievement (DofusDB's order, stored per quest as `quests.achievement.position`), only when it has a published guide. The title and link are that guide's; "Nivel {n}" is the next quest's minimum level; "Te la da {NPC} [x,y]" is its first start position in DofusDB; the art is the first image of the next guide, in reading order. A missing part is left out; no next quest, or no published guide, no card (`nextQuestCard` in `src/lib/guides/page.ts`, `findNextQuest` in `src/lib/guides/queries.ts`).
- **Anatomy**: the whole card is one link. `--color-surface`, 1px `--color-well-line`, 16px radius. From 640px the art takes 280px on the left (at least 168px tall, `object-fit: cover`); below it sits on top at 16:10. The text, `20px 24px 22px` padding, 6px apart: "Siguiente misión" (1rem `--color-ink-2`), the title (Montserrat 600, `clamp(1.625rem, 1.3rem + 1.2vw, 2.125rem)`, line height 1.05) and "Nivel **25**. Te la da Kerubim Crepin **[3,-17]** al terminar esta." in `--color-ink-2` with the figures in `--color-ink`. The coordinates are plain text here, since a button cannot sit inside a link.
- **States**: hover (mouse only) turns the border `--color-accent` and the art settles from `scale(1.04)` to 1 over 600ms; focus-visible is a 3px `--color-ink` outline 4px out.

#### Content model gaps

The components above need data the guide does not store yet:

| Part | Needs |
|---|---|
| Video poster | the thumbnail stored as media at import |

### Achievement page components

Decided 2026-11-07 from the logro v2 prototype. Server components in `src/components/achievement/` and `src/components/site/Breadcrumb.tsx`; the only client code is the guide island, for the rewards bag. What each part shows comes from `achievementPageView` (`src/lib/achievements/page.ts`).

- **Breadcrumb** (shared with the quest guide): a `<nav aria-label="Ruta de navegación">` with an `<ol role="list">` of the parents only, since the h1 below names the page: «Metalogros / Astrub». Links are `--text-sm` 500 in `--color-accent`, underlined 1px (2px on hover), at least 40px tall, with «/» in `--color-muted` between them drawn by `::before`. 12px above the h1. Under 40rem only the direct parent shows, as a back link «‹ Astrub» 44px tall that may wrap and is never truncated. A JSON-LD `BreadcrumbList` with the current page goes inside the nav. Metalogros links to `/metalogros` and the metalogro to its panel there (`/metalogros#astrub`).
- **Achievement header**: the quest header with the achievement's icon where the quest giver stands, in a slot (60px, 80px from 576px, `--color-slot`, 14 to 16px radius), the h1, the subtitle «3 misiones - Niveles 15 a 25 - 10 puntos» (the parts joined with « - »; a missing part is left out) and the three fact columns of the quest header (`QuestFacts`), titled Prerrequisitos, «Necesitarás en total» and «Recompensas del logro». Prerrequisitos are the previous quests from outside the achievement, linked to their guide when published. «Necesitarás en total» adds up the items and the notes with a quantity («1 x Combate (solo).») of the published guides of the achievement's quests; a note without a quantity is a remark about that guide and is left out, and a quest with alternatives does not count. The rewards are the achievement's for a level 200 character: one XP figure, kamas and the rewards bag.
- **Quest cards** («Las misiones, en orden»): one card per quest of the achievement (a row of alternatives, such as the class quest, is one card with its name and the lowest level). The quest giver's render on a floor, «Misión 2 - Nivel 20» in `--color-ink-2` and the title (Montserrat 600, 1.25rem). `--color-surface`, 1px `--color-well-line`, 16px radius. When the quest's guide is published, the title is a link whose `::after` covers the card, so the whole card opens the guide (hover: `--color-accent` border); otherwise the card is plain text. Three per row where the main column is at least 600px wide (container query), a list below.
- **Metalogro column**: «Metalogro {name}» (Montserrat 600, 1.25rem) and the achievements of the metalogro in its order, each a 56px row with its icon in a slot, the name (600) and «6 misiones - Niveles 15 a 30» in `--text-xs` `--color-ink-2`. The current one has `--color-raised`, `--shadow-glow` and `aria-current="page"`. Then «Cuenta para»: the game's meta-achievements that require this one, directly or through another, with «Pide 6 logros. **20** puntos.».
- **Previous and next achievement**: the next quest card with the achievement's icon in a 72px slot instead of art, «Logro anterior» or «Siguiente logro», the name and «**4** misiones. Niveles 25 a 40.». Side by side where each gets about 320px. A `<nav>` named «Logros de {metalogro}».
- **En preparación**: an achievement Torre has not finished (`state: preparing`) has no page (404) and shows wherever it is listed as visible but disabled: a plain element with `aria-disabled="true"`, no link, a dashed `--color-line` border, its icon at 45 percent opacity in grayscale, and the «En preparación» tag (22px pill, `--color-raised`, `--color-ink-2`, 600 at 0.6875rem). It stays in the reading order.

### Metalogros index components

Decided 2026-11-07 from variant D. A server component (`src/components/achievement/MetalogrosIndex.tsx`) and one client island (`MetalogrosIsland.tsx`); what each part shows comes from `metalogrosIndexView` (`src/lib/achievements/metalogros.ts`).

- **Tile**: the metalogro's representative (an NPC render or a monster image, else the first achievement's icon in a slot) on a floor, 120px tall (96px under 40rem), the name (600) and one quiet count in `--color-muted` («7 logros», or its guides as «230 misiones» when it has no achievements). `--color-surface`, 1px `--color-well-line`, 16px radius. Six per row at 1440px, five at 1024px, two on phones. A metalogro «En preparación» carries the «En preparación» tag.
- **Panel**: with the island, a tile is a button (`aria-expanded`, `aria-controls`) that opens one panel across the whole row right under its row: an `<li>` holding a region named by the metalogro's heading, with its achievement cards and its loose guides («Otras guías»), and a «Cerrar» icon button. The URL hash follows (`#astrub`), back and forward work, and Esc or «Cerrar» close it and return focus to the tile. One panel at a time; the open tile is raised with an accent border and a notch pointing at the panel.
- **Achievement card**: the achievement's icon in a slot, the name and «3 misiones · Niv. 15–25»; the whole card links to its page.
- **Search**: a 56px field with a 2px `--color-accent` focus ring, as in the prototype (accent on surface passes 3:1 in every theme), and a combobox (WAI-ARIA APG, listbox popup) that finds metalogros, achievements and quests, accent-insensitive, every word in any order; short Spanish words (de, del, la, las, el, los, y, a, en) need not match, so «misiones del mundo» finds «Misiones de Mundo» (`src/lib/achievements/metalogros-search.ts`). Up to 4 metalogros, 7 achievements and 7 quests. A metalogro opens its panel; an achievement or a quest opens the achievement page. It takes focus on desktops with a mouse, never on touch screens. Hidden without JavaScript.
- **En preparación**: an achievement Torre has not finished is listed but disabled: no link, a dashed border, a muted icon, the tag and `aria-disabled`, in the reading order. A metalogro «En preparación» with at least one published achievement still opens; one with nothing published is a disabled tile (no panel), the state derived from the data rather than stored. The search lists both as options with `aria-disabled` that the arrow keys skip and Enter never opens.
- **Without JavaScript**: the tiles link to each metalogro's list, rendered under the grid.

### Component catalog

Every component above, and the generic ones in the components table that already exist in code, render on `/sistema` with real content, in the five themes and both modes (each section carries its own `data-theme` and `data-mode`). The page answers 404 in production: it renders only in development (`NODE_ENV=development`), on the dev environment (`APP_ENV=dev`, public but not indexed) and in the E2E run (`E2E_DESIGN_CATALOG=1`, set only by `playwright.config.ts`). `?tema=` and `?modo=` keep a single section, for screenshots. It is not in the Lighthouse list. A new component, or a new state, is added there in the same PR.

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
- Quest giver renders (decided 2026-11-05): `pnpm data:quests` saves each quest-starting NPC in the `npcs` collection with its `look` from DofusDB, then imports two renders into Media: `https://renderer.dofusdb.fr/look/{look as hex}/full/{1|3}/300_300.png`, direction 1 facing right and 3 facing left (`src/lib/dofusdb/npc-render.ts`). The 1000 × 1000 PNG is trimmed to the figure and capped at 720px high before upload; Payload makes its AVIF and WebP. Each file carries a key in `media.gameAsset` (NPC, direction and a hash of the look), so a rerun finds what it uploaded and never duplicates it; a new look uploads new renders and keeps the old ones, because they are ordinary Media records an editor may have used in a guide. A missing look or a renderer failure leaves the NPC without that render, and the next run retries.
- Item icons and monster images (decided 2026-11-06): `pnpm data:quests` imports the 128px PNG of every item that a quest rewards or needs, or that a guide's Necesitarás lists (`https://api.dofusdb.fr/img/items/{iconId}.png`), and of every monster that a quest needs or a fight block names (`https://api.dofusdb.fr/img/monsters/{gfxId}.png`), into Media, and links it from the item or monster (`image`). One file per image ID, keyed in `media.gameAsset` (`dofusdb-item-image:{iconId}`, `dofusdb-monster-image:{gfxId}`): items that share an icon share the file, and a rerun downloads nothing it already has. A failed download leaves the slot empty and the next run retries (`src/lib/dofusdb/game-images.ts`). `pnpm guides:backfill --apply` imports the images of the monsters it links. The whole catalog of tens of thousands of items is not imported.
- Every image has AVIF and WebP variants at fixed widths, generated once when the file is uploaded, in the panel or by the importer (decided 2026-11-05, replacing the offline conversion before the import). Payload makes them with sharp (`src/lib/media/sizes.ts`) and stores them next to the original. The app never optimizes images on request.
- Widths: 480, 800, 1200 and 1600 px, each in AVIF (quality 50) and WebP (quality 80). They come from the layout. 480 covers phones at 1x and the 280px card art up to 1.7x. 800 is `--width-prose` at 1x and phones at 2x. 1200 covers phones at 3x and the hero on tablets. 1600 is `--width-prose` at 2x and the full-bleed hero on desktops up to 1600px wide. A width larger than the original is never produced, so nothing is upscaled; 480 is the exception and comes out at the original width, so a 96px icon still gets one AVIF and one WebP. Uploading a 1920px PNG screenshot with all eight variants took about 0.6 s on an Apple M5 (about 2.2 s for a worst-case noise image).
- Lighthouse's image delivery check only warns (decided 2026-11-05). Lighthouse emulates a phone at 1.75 DPR: a 380px screenshot then needs 665 device pixels, the browser picks the 800w candidate, and the check counts the difference from the 380 CSS px as waste. Real phones at 2x to 3x get the right width from 480/800/1200/1600. In Lighthouse 13 that check also covers formats, so the AVIF and WebP rule is held by `Picture` and the media variants and their tests, not by Lighthouse.
- Markup: `<picture>` with an AVIF `<source>`, then the WebP `<img>`. Both carry `srcset` with `w` descriptors and the same `sizes`. The `<img>` `src`, `width` and `height` are those of the widest WebP, which reserves the space (no layout shift) and is the file the fullscreen viewer opens. An image with a single width gets no `srcset` or `sizes`. `mediaImageAsset` (`src/lib/media/image-asset.ts`) builds this from a media record; without variants yet, it falls back to the original. Next's `<Image>` only with a loader that maps to these variants and `unoptimized` set.
- `sizes` per component (`IMAGE_SIZES` in `src/components/ui/image-sizes.ts`):

| Component | `sizes` | Why |
|---|---|---|
| Figure (step screenshot) and the video poster | `(min-width: 58rem) 880px, (min-width: 40rem) calc(100vw - 48px), calc(100vw - 32px)` | the 880px reading column from 928px (880px plus the 24px gutters); below, the viewport minus the 24px gutters, and on phones minus the 16px gutters |
| Next quest card art | `(min-width: 40rem) 280px, calc(100vw - 32px)` | 280px beside the text from 640px; full card width above the text below |
| Icons (items, monsters, achievements) | none | one width; the icon well fixes the size |

- Changing a width or a format only affects new uploads. `pnpm media:sizes` generates what older records are missing (see `AGENTS.md`, Media).
- The `/sistema` catalog images are static files in `public/img/sistema`. Its screenshots have 480 and 800 widths made once by `scripts/build-catalog-images.ts`, so the catalog exercises `srcset` like real media; its icons keep one width.
- `loading="lazy"` and `decoding="async"` on everything below the first screen; the LCP image gets `fetchpriority="high"` and no lazy loading.
- Aspect ratios:

| Kind | Ratio | Notes |
|---|---|---|
| Step screenshot | source ratio, stored on the media record | `--radius-card`, `--shadow-art`, max `--width-prose` |
| Start map | 16:9 crop | 12px radius |
| Hero zone art | 21:9 on desktop, 4:3 on phones (art direction through `<source media>`) | fades into `--color-bg` with a `mask-image` gradient |
| Collection card art | card ratio (1:1 for Dofus, 1:1.1 for dungeons) | the NPC or boss render on top keeps its alpha |
| NPC and monster renders | transparent, natural ratio | `drop-shadow` filter as a static style, never animated |
| Quest giver render | transparent, natural ratio (about 1:2.2 once trimmed) | 84 to 92px wide beside the title, 50px on phones; one width, so no `srcset` |
| Icons (items, quests, jobs) and monster images | 1:1, 128px files for items and monsters | 34px in a 44px icon slot, 42px in a 52px monster slot, 24 to 28px for the game UI icons (10px radius, `--color-slot`) |

- Missing or not-yet-owned items show the icon in `grayscale(1)` at 60 percent opacity.
- Picking a zone background for a character: the character must read against the area where it sits. Avoid a zone in the same hue as the character; keep text over the darker part of the image or on a shade.
- Alt text comes from the media record. Decorative art (backgrounds, ornaments) has `alt=""`.

## Accessibility

- WCAG 2.2 AA in every theme and mode. The color tables above list every text pair; new pairs get a ratio before they ship.
- Focus: `outline: 2px solid var(--color-ink); outline-offset: 2px` on every interactive element, `:focus-visible` only. Cards use a 3px outline with 4px offset.
- Targets: 40px minimum, 44px under `pointer: coarse`.
- A control drawn smaller than the target (linked tag, secondary or ghost button, checkbox row) carries the `hit-target` class: a transparent `::after` grows the hit area to the target height without changing what is drawn.
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

Measured on a phone emulated at 412px and 1.75 DPR, with a slow 4G network (150 ms RTT, 1.6 Mbps) and a 4x slower CPU applied through DevTools, not simulated (decided 2026-11-05). The simulated mode (Lantern) charges every main-thread script that runs before the LCP to the LCP image: a guide whose first screenshot paints at about 150 ms scored about 3 s. Applied throttling measures when it paints.

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

None open. Answered on 2026-11-05:

1. **Image widths**: flexible widths, generated at upload by Payload: 480, 800, 1200 and 1600 px in AVIF and WebP, served with `srcset` and `sizes` (Imagery). Guide images open fullscreen at the widest variant (Figure and fullscreen viewer).
2. **Hero art**: guide v4 (2026-11-05) has no hero art; the quest giver's render stands beside the title instead (Quest header). A per-zone image library is no longer needed for the guide page.
3. **Callout icons**: game art may replace the `i`, `!` and `×` glyphs only if it clearly conveys the same meaning (tip or info, warning, stop); otherwise the glyphs stay (Callout row).
4. **Start place**: from DofusDB, editable in the panel. Already implemented for the start NPC and position (`startNpc`, `startX`, `startY`, filled through `src/lib/guides/summary.ts`).
5. **Video hosts**: YouTube only. All 44 video embeds in the 1796 legacy Squarespace pages are YouTube (Video facade).
