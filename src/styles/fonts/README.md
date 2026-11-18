# Fonts

The site's web fonts, self-hosted through `next/font/local` in `src/styles/fonts.ts`. The build never downloads fonts: with `next/font/google` every build fetched them from Google, and a failed fetch broke the build.

Each file is the latin subset that the Google Fonts API (`css2`, Chrome user agent) served on 2026-11-18, byte for byte the file `next/font/google` used to ship. Only latin is here; it covers Spanish and the punctuation the site uses.

| File | Family | Weights | Bytes | Source | License |
|---|---|---|---|---|---|
| `montserrat-latin.woff2` | Montserrat (variable, `wght`) | 400, 500, 600, 700, 800 | 35,508 | `fonts.gstatic.com/s/montserrat/v31/JTUSjIg1_i6t8kCHKm459WlhyyTh89Y.woff2` | `OFL-montserrat.txt` |
| `rowdies-700-latin.woff2` | Rowdies | 700 | 11,468 | `fonts.gstatic.com/s/rowdies/v19/ptRMTieMYPNBAK219gtm1On4KCFtpe4.woff2` | `OFL-rowdies.txt` |
| `lexend-latin.woff2` | Lexend (variable, `wght`) | 500, 600, 700 | 39,692 | `fonts.gstatic.com/s/lexend/v26/wlpwgwvFAVdoq2_v-6QU82RHaA.woff2` | `OFL-lexend.txt` |
| `lilita-one-400-latin.woff2` | Lilita One | 400 | 10,676 | `fonts.gstatic.com/s/lilitaone/v17/i7dPIFZ9Zz-WBtRtedDbYEF8RXi4EwQ.woff2` | `OFL-lilita-one.txt` |

All four are under the SIL Open Font License 1.1. The `OFL-*.txt` files are each family's license as published in `github.com/google/fonts` (`ofl/<family>/OFL.txt`), with its copyright notice. The OFL lets us bundle and serve the fonts unchanged; it forbids selling them on their own.

## Updating a font

1. Request the family from `https://fonts.googleapis.com/css2?family=<Family>:wght@<weights>&display=swap` with a current Chrome user agent, so the API answers with woff2.
2. Download the URL of the `/* latin */` block and replace the file here. Keep the name.
3. Update the table and, if Google changed it, the latin `unicode-range` in `fonts.ts`.
4. A new family also needs its `<Family> Fallback` and `<Family> Fallback Linux` faces in `src/styles/fonts-fallback.css` (`tests/unit/fonts.test.ts` checks them) and its license file here.
