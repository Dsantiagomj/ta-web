// Lleva a las colecciones class-pages y dungeon-pages las páginas de clase y de mazmorra de
// Torre en Squarespace (section-pages/catalog.ts): su texto tal cual, sus capturas y, en las
// clases, sus builds de PVM y PVP con su enlace (section-pages/convert.ts). Crea las que faltan
// como borrador En preparación y, al repetirla, no pisa lo que Torre cambió en el panel
// (section-pages/load.ts). Las imágenes se suben a Media desde el CDN de Squarespace una vez.
// Uso: pnpm import:section-pages [--from <carpeta>] [--apply] [--remote] [--production]
// --from lee <carpeta>/<slug>.html (páginas guardadas) en vez de descargarlas.
// Sin --apply solo cuenta y avisa: no escribe ni sube nada. Escribe en la base de
// DATABASE_URL (vacía: la de pnpm db:dev); contra una base remota pide --remote, y en
// producción --production.
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { getPayload } from 'payload'

import config from '@payload-config'
import { databaseScriptRefusal } from '@/lib/db/script-guard'
import { LEGACY_SITE_ORIGIN } from '@/lib/site/legacy'

import { liveSiteSlugs } from './live-slugs'
import { mediaByUrl } from './media-by-url'
import { createHtmlToLexical } from './rich-text'
import { CLASS_CATALOG, DUNGEON_CATALOG, type SectionPageEntry } from './section-pages/catalog'
import { convertClassPage, convertDungeonPage } from './section-pages/convert'
import { loadSectionPages } from './section-pages/load'
import { releaseDom } from './squarespace/dom'
import { createImageFetcher } from './squarespace/fetch-image'

const USAGE =
  'Uso: pnpm import:section-pages [--from <carpeta>] [--apply] [--remote] [--production]'

const args = process.argv.slice(2)
const fromIndex = args.indexOf('--from')
const from = fromIndex === -1 ? null : args[fromIndex + 1]
if (fromIndex !== -1 && (!from || from.startsWith('--'))) {
  console.error(USAGE)
  process.exit(1)
}
// Antes de arrancar Payload: un entorno equivocado no llega a conectarse.
const refusal = databaseScriptRefusal(process.env, args, 'importar las clases y las mazmorras')
if (refusal) {
  console.error(refusal)
  process.exit(1)
}
const apply = args.includes('--apply')

/** El HTML de la página de Squarespace de un slug, o null si no la hay. */
async function pageHtml(slug: string): Promise<string | null> {
  if (from) {
    try {
      return await readFile(path.join(from, `${slug}.html`), 'utf8')
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null
      throw error
    }
  }
  const response = await fetch(`${LEGACY_SITE_ORIGIN}/${slug}`, {
    headers: { 'User-Agent': 'ta-web/importacion' },
    signal: AbortSignal.timeout(30_000),
  })
  if (response.status === 404) return null
  if (!response.ok) throw new Error(`${LEGACY_SITE_ORIGIN}/${slug} respondió ${response.status}`)
  return response.text()
}

const SECTIONS = [
  { collection: 'class-pages', name: 'Clases', catalog: CLASS_CATALOG, convert: convertClassPage },
  {
    collection: 'dungeon-pages',
    name: 'Mazmorras',
    catalog: DUNGEON_CATALOG,
    convert: convertDungeonPage,
  },
] as const

const payload = await getPayload({ config })
try {
  // Los enlaces de Torre a su propia web quedan relativos solo si este sitio ya la enseña.
  const live = await liveSiteSlugs(payload)
  const htmlToLexical = await createHtmlToLexical(payload.config)
  const mediaFor = mediaByUrl(payload, createImageFetcher())

  for (const { collection, name, catalog, convert } of SECTIONS) {
    const pages: { entry: SectionPageEntry; page: ReturnType<typeof convert> | null }[] = []
    for (const entry of catalog) {
      const html = await pageHtml(entry.slug)
      pages.push({ entry, page: html ? convert(html, entry, (slug) => live.has(slug)) : null })
      // happy-dom retiene cada documento: ya es texto, se suelta.
      await releaseDom()
    }
    const report = await loadSectionPages(payload, {
      collection,
      pages,
      apply,
      htmlToLexical,
      mediaFor,
      log: (message) => console.log(message),
    })
    console.log(
      `${name}, ${apply ? 'hecho' : 'en seco (sin --apply)'}: ${catalog.length} en el catálogo, ` +
        `${report.images} imágenes. ${report.created.length} ` +
        `${apply ? 'creadas' : 'se crearían'}, ${report.updated.length} ` +
        `${apply ? 'actualizadas' : 'se actualizarían'} y ${report.unchanged.length} sin cambios.`,
    )
    for (const { slug, message } of report.oddities) console.log(`Rareza en ${slug}: ${message}`)
    for (const { slug, field } of report.kept) {
      console.log(`Se respeta lo que escribió Torre en ${slug}: ${field}`)
    }
    console.log(`Sin página en Squarespace: ${report.missing.join(', ') || 'ninguna'}`)
    console.log(
      `Con la dirección de otra página del sitio, sin crear: ${report.taken.join(', ') || 'ninguna'}`,
    )
  }
  await payload.destroy()
} catch (error) {
  console.error('La importación de las clases y las mazmorras falló:', error)
  await payload.destroy()
  process.exit(1)
}
