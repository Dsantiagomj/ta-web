// Lleva a la colección pages las páginas sueltas de Torre en Squarespace (pages/catalog.ts):
// los emotes, los cómo llegar y las páginas legales, con su texto tal cual, sus capturas y sus
// vídeos (pages/convert.ts). Crea las que faltan y, al repetirla, no pisa lo que Torre cambió
// en el panel ni su «Visible en la web» (pages/load.ts). Las capturas se suben a Media desde
// el CDN de Squarespace una vez: si ya están (por su URL de origen), se reutilizan.
// Uso: pnpm import:pages [--from <carpeta>] [--apply] [--remote] [--production]
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
import { PAGE_CATALOG } from './pages/catalog'
import { convertPage, type ConvertedPage } from './pages/convert'
import { loadSitePages } from './pages/load'
import { createHtmlToLexical } from './rich-text'
import { releaseDom } from './squarespace/dom'
import { createImageFetcher } from './squarespace/fetch-image'

const USAGE = 'Uso: pnpm import:pages [--from <carpeta>] [--apply] [--remote] [--production]'

const args = process.argv.slice(2)
const fromIndex = args.indexOf('--from')
const from = fromIndex === -1 ? null : args[fromIndex + 1]
if (fromIndex !== -1 && (!from || from.startsWith('--'))) {
  console.error(USAGE)
  process.exit(1)
}
// Antes de arrancar Payload: un entorno equivocado no llega a conectarse.
const refusal = databaseScriptRefusal(process.env, args, 'importar las páginas sueltas')
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

const payload = await getPayload({ config })
try {
  // Los enlaces de Torre entre estas páginas quedan relativos si la página ya se ve o se
  // verá al importarla (Publicada en el catálogo); si no, van a Squarespace.
  const live = await liveSiteSlugs(payload)
  for (const entry of PAGE_CATALOG) if (entry.state === 'published') live.add(entry.slug)

  const pages: { entry: (typeof PAGE_CATALOG)[number]; page: ConvertedPage | null }[] = []
  for (const entry of PAGE_CATALOG) {
    const html = await pageHtml(entry.slug)
    pages.push({ entry, page: html ? convertPage(html, entry, (slug) => live.has(slug)) : null })
    // happy-dom retiene cada documento: ya es texto, se suelta.
    await releaseDom()
  }

  const report = await loadSitePages(payload, {
    pages,
    apply,
    htmlToLexical: await createHtmlToLexical(payload.config),
    mediaFor: mediaByUrl(payload, createImageFetcher()),
    log: (message) => console.log(message),
  })

  console.log(
    `${apply ? 'Hecho' : 'En seco (sin --apply)'}: ${PAGE_CATALOG.length} páginas en el catálogo, ` +
      `${report.images} capturas. ${report.created.length} ${apply ? 'creadas' : 'se crearían'}, ` +
      `${report.updated.length} ${apply ? 'actualizadas' : 'se actualizarían'} y ` +
      `${report.unchanged.length} sin cambios.`,
  )
  for (const { slug, message } of report.oddities) console.log(`Rareza en ${slug}: ${message}`)
  for (const { slug, field } of report.kept) {
    console.log(`Se respeta lo que escribió Torre en ${slug}: ${field}`)
  }
  console.log(`Con un borrador a medias, sin tocar: ${report.drafts.join(', ') || 'ninguna'}`)
  console.log(`Sin página en Squarespace: ${report.missing.join(', ') || 'ninguna'}`)
  console.log(
    `Con la dirección de otra página del sitio, sin crear: ${report.taken.join(', ') || 'ninguna'}`,
  )
  await payload.destroy()
} catch (error) {
  console.error('La importación de las páginas falló:', error)
  await payload.destroy()
  process.exit(1)
}
