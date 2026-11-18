// Genera el favicon y el icono de iOS desde el dibujo del emblema y los colores del tema por
// defecto (Amakna) en theme.css (DESIGN.md, Brand). Next los enlaza solos por su nombre (convenciones icon y
// apple-icon del App Router). Uso: node scripts/build-icons.ts
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

import { emblemColors, emblemSvg, faviconSvg } from '../src/components/brand/emblem-art.ts'
import { readPalette } from '../src/lib/theme/palette.ts'
import { DEFAULT_THEME } from '../src/lib/theme/theme.ts'

const dir = path.resolve('src/app/(frontend)')
const palette = readPalette(readFileSync('src/styles/theme.css', 'utf8'))
const dark = palette[`${DEFAULT_THEME}-dark`]
const colors = emblemColors(dark)

/** Pinta el SVG a su tamaño, como lo rasteriza un navegador. */
const png = (svg: string, file: string) =>
  sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(path.join(dir, file))

// icon2.svg va detrás de icon1.png en el <head>: los navegadores con favicon SVG lo prefieren.
writeFileSync(path.join(dir, 'icon2.svg'), faviconSvg(palette, DEFAULT_THEME))
// Respaldo para navegadores sin favicon SVG: 32 px, la versión simplificada en oscuro.
await png(
  emblemSvg({
    colors,
    variant: 'simple',
    size: 32,
    backdrop: { shape: 'tile', color: dark.bg, radius: 14 },
  }),
  'icon1.png',
)
// iOS redondea las esquinas por su cuenta: placa cuadrada y el emblema completo con aire.
await png(
  emblemSvg({ colors, size: 180, backdrop: { shape: 'tile', color: dark.bg }, padding: 0.16 }),
  'apple-icon.png',
)
// El logo del editor en el JSON-LD (src/lib/seo/json-ld.ts): una URL fija, que Next no
// renombra como el icono de iOS (apple-icon-<hash>.png). 512 px, como el icono de iOS.
await sharp(
  Buffer.from(
    emblemSvg({ colors, size: 512, backdrop: { shape: 'tile', color: dark.bg }, padding: 0.16 }),
  ),
)
  .png({ compressionLevel: 9 })
  .toFile(path.resolve('public/img/marca/logo.png'))
console.log('Favicon, icono de iOS y logo listos en src/app/(frontend) y public/img/marca.')
