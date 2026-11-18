# Golden pages of the Squarespace import

`pnpm test:import` (`tests/import/golden-pages.test.ts`) runs these 30 pages through the import converters and compares the result with the reviewed output in `expected/`. A converter change that alters real content fails here before the delta import, the last re-import before the domain cutover (backlog S-15, `docs/legacy/plan.md` §8.1).

| Folder | What |
|---|---|
| `pages/<slug>.html` | The live page, trimmed by `scripts/import/golden/trim-source.ts` to what the converters read: `<title>`, the SEO description, the collection title of the context JSON and every `<article>`, minus attributes no converter reads (`srcset`, `data-block-scripts`, …) |
| `expected/<slug>.json` | The converter output, reviewed block by block against the live page. Keys sorted at every depth, arrays in reading order, media by original URL |

The list of pages and the branch each one pins is in `scripts/import/golden/catalog.ts`. `scripts/import/golden/convert.ts` calls each converter the way the `import-*.ts` scripts do, up to the Payload load. Two inputs that the load takes from elsewhere are fixed there. Quest guides get no DofusDB match (it comes from the inventory's `quest_matches.csv`). No page counts as live on this site, so Torre's links to his own pages go to Squarespace unless they hit a reserved route or the redirect table. The test also converts every HTML fragment of the output to Lexical (`scripts/import/rich-text.ts`) and checks that no text or link is lost.

## Refresh before the delta import

```sh
pnpm import:golden-refresh   # downloads the 30 pages, one per second, and prints the diff
pnpm test:import             # fails on every page whose output changed
pnpm test:import -u          # after reviewing each diff against the live page
git diff tests/fixtures/import-golden/
```

The refresh writes only `pages/`. It refuses a page that no longer answers 200, that redirects to another slug, or whose trimmed copy converts differently from the full page. That page keeps its old copy and the script exits 1. The diff shows what Torre changed on Squarespace as the import reads it. Accept it only after checking it against the page.

## Why these 30

The picks come from running the converters over the 1 272 cached quest guides of the inventory crawl and grouping them by the branches they take (oddities, callouts, steps, videos, summary fields).

| Kind | Converter | Pages | Branch pinned |
|---|---|---|---|
| Quest guide | `squarespace/parse-page.ts`, `squarespace/to-quest-guide.ts` | `el-cazador-cazado` | the common shape: start line with NPC and coordinates, steps with coordinates and screenshots |
| | | `intoxicacion-profunda` | a YouTube video after the closing line |
| | | `operacion-envenenamiento` | numbered heading that differs from the title (flagged) |
| | | `seis-pies-bajo-tierra` | IMPORTANTE (warning) and RECOMENDACIONES (tip) callouts, lists inside steps |
| | | `el-safari-de-almas` | steps marked «ETAPA n:», laid out two by two; no start line |
| | | `entretanto-un-renacer` | the long one: 23 steps, 44 screenshots, side-by-side images |
| | | `gajes-de-la-chocolateria`, `wali-y-la-fabrica-de-chocolate` | rewards by level («Si eres nivel 1 a 109: …»); the second has no Necesitarás |
| | | `torcer-el-brazo` | two videos, a RECOMENDACIONES callout, no start line |
| | | `un-lamentable-descuido` | an empty Squarespace image block (flagged, nothing lost) |
| | | `el-destino` | no steps (the guide stays prose) and eight empty image blocks |
| | | `como-entrar-a-la-casa-de-keprinus` | a «cómo entrar» page: no summary, no steps |
| | | `el-calendario-de-la-siega` | a list of links to other guides |
| | | `toma-de-sangre` | a link to another website |
| | | `emote-dar-un-beso` | an emote published as a quest guide |
| | | `ron-marino` | video inside the last step, steps without coordinates, misspelled «Prerequisitos» |
| Achievement prose | `achievements/prose.ts` | `draguisla-tortilla` | intro with screenshots, a RECOMENDACIONES paragraph and a video |
| | | `el-guardian-del-puente-de-la-muerte` | a single-quest achievement: long outro with nine screenshots, template lists dropped |
| | | `el-perforar-se-va-a-acabar` | outro with two videos; quest, needs and rewards lists dropped |
| Dofus guide | `dofus-guides/parse.ts` | `dofus-de-los-hielos` | checklist banner, achievements and a «misiones random» quest group |
| | | `dofus-plateado` | numbered meta-achievements in two columns |
| | | `dofus-cacao` | video, four Necesitarás groups, dungeons by level |
| | | `piata-de-pino` | step-by-step body with screenshots and rewards |
| Site page | `pages/convert.ts` | `emotes-global` | the emote index, links to the emote pages |
| | | `emote-soltar-los-gases` | text, two screenshots side by side, a link back to the index |
| | | `acceso-pandala-3` | a «cómo llegar» page with eight screenshots in pairs |
| | | `aviso-legal` | a long legal page |
| Class page | `section-pages/convert.ts` | `feca-1` | PVM and PVP builds with their dofusbook links |
| | | `yopuka-1` | no builds yet: spell text with GIFs and 18 empty image blocks |
| Dungeon page | `section-pages/convert.ts` | `mazmorra-templo-del-dios-kao` | monster portraits next to their spells, SEO description over 160 characters |

Checklists are not here: their import reads a copy of `silvestre-checklist`, not Squarespace.

## Review notes

The 30 outputs were compared with the live pages on 2026-11-18: every text element, image, video and link of each `<article>`, and the reading order where Squarespace places blocks side by side. Findings that are not converter bugs:

- Empty image blocks (`un-lamentable-descuido`, `el-destino`, `yopuka-1`) have no image on Squarespace either. The live page shows nothing there.
- `emote-dar-un-beso` repeats «En ese mismo instante, le tendrás que entregar 1 x Pinza de cangrejo.» because the live page has that sentence in two text blocks.
- `feca-1` uses the same four build images under PVM and PVP on the live page.
- Side-by-side blocks follow the desktop grid, row first, then column. An image that starts one row above the text beside it comes first (`yopuka-1`, `mazmorra-templo-del-dios-kao`). Each image stays next to its text.
