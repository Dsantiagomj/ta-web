// Genera el favicon y el icono de iOS desde el dibujo del emblema y los colores de Arcano en
// theme.css (DESIGN.md, Brand). Next los enlaza solos por su nombre (convenciones icon y
// apple-icon del App Router). Uso: node scripts/build-icons.ts
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

import { emblemColors, emblemSvg, faviconSvg } from '../src/components/brand/emblem-art.ts'
import { readPalette } from '../src/lib/theme/palette.ts'

const dir = path.resolve('src/app/(frontend)')
const palette = readPalette(readFileSync('src/styles/theme.css', 'utf8'))
const arcano = palette['arcano-dark']
const colors = emblemColors(arcano)

/** Pinta el SVG a su tamaño, como lo rasteriza un navegador. */
const png = (svg: string, file: string) =>
  sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(path.join(dir, file))

// icon2.svg va detrás de icon1.png en el <head>: los navegadores con favicon SVG lo prefieren.
writeFileSync(path.join(dir, 'icon2.svg'), faviconSvg(palette))
// Respaldo para navegadores sin favicon SVG: 32 px, la versión simplificada en oscuro.
await png(
  emblemSvg({
    colors,
    variant: 'simple',
    size: 32,
    backdrop: { shape: 'tile', color: arcano.bg, radius: 14 },
  }),
  'icon1.png',
)
// iOS redondea las esquinas por su cuenta: placa cuadrada y el emblema completo con aire.
await png(
  emblemSvg({ colors, size: 180, backdrop: { shape: 'tile', color: arcano.bg }, padding: 0.16 }),
  'apple-icon.png',
)
console.log('Favicon e icono de iOS listos en src/app/(frontend).')
