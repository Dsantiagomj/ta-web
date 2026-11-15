// Las miniaturas del selector de bloques del panel (src/lib/admin/block-thumbnails.ts): captura
// cada marco del grupo «Bloques del panel» del catálogo /sistema en Arcano oscuro y lo guarda
// como WebP de 480 × 320 en public/img/panel/bloques. Necesita la app en marcha con el catálogo
// abierto (pnpm dev). Uso: pnpm panel:block-thumbs [--url http://localhost:3000]
import { chromium } from '@playwright/test'
import { mkdirSync, readdirSync, rmSync, statSync } from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

import {
  BLOCK_THUMBNAIL_DIR,
  BLOCK_THUMBNAIL_SIZE,
  blockThumbnailSlugs,
} from '../src/lib/admin/block-thumbnails.ts'

const urlFlag = process.argv.indexOf('--url')
const base = (urlFlag > 0 ? process.argv[urlFlag + 1] : undefined) ?? 'http://localhost:3000'
const dir = path.resolve('public', BLOCK_THUMBNAIL_DIR.replace(/^\//, ''))

const browser = await chromium.launch()
try {
  // Captura al doble y reduce después: el texto sale nítido a 480 × 320.
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    reducedMotion: 'reduce',
  })
  const response = await page.goto(`${base}/sistema?tema=arcano&modo=dark`)
  if (!response?.ok()) {
    throw new Error(
      `${base}/sistema respondió ${response?.status()}: arranca la app con pnpm dev (el catálogo solo abre en desarrollo).`,
    )
  }
  mkdirSync(dir, { recursive: true })

  let total = 0
  for (const slug of blockThumbnailSlugs) {
    const frame = page.locator(`[data-block-thumb="${slug}"]`)
    if ((await frame.count()) !== 1) {
      throw new Error(`Falta el marco de «${slug}» en /sistema (sistema/BlockThumbs.tsx).`)
    }
    await frame.scrollIntoViewIfNeeded()
    // Las imágenes del marco van diferidas: espera a que carguen todas.
    await frame.evaluate((node) =>
      Promise.all(
        [...node.querySelectorAll('img')].map((img) =>
          img.complete ? img.decode().catch(() => {}) : img.decode(),
        ),
      ),
    )
    const shot = await frame.screenshot({ animations: 'disabled' })
    const file = path.join(dir, `${slug}.webp`)
    await sharp(shot)
      .resize(BLOCK_THUMBNAIL_SIZE.width, BLOCK_THUMBNAIL_SIZE.height, { fit: 'cover' })
      .webp({ quality: 78, effort: 6 })
      .toFile(file)
    const size = statSync(file).size
    total += size
    console.log(`${slug}.webp  ${(size / 1024).toFixed(1)} KB`)
  }

  // Un bloque que ya no existe deja de tener miniatura.
  const wanted = new Set(blockThumbnailSlugs.map((slug) => `${slug}.webp`))
  for (const name of readdirSync(dir)) {
    if (name.endsWith('.webp') && !wanted.has(name)) {
      rmSync(path.join(dir, name))
      console.log(`${name} borrada: ya no es de ningún bloque`)
    }
  }
  console.log(`${blockThumbnailSlugs.length} miniaturas, ${(total / 1024).toFixed(1)} KB en total.`)
} finally {
  await browser.close()
}
