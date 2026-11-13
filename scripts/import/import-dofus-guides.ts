// Lleva a dofus-guides las guías de Dofus de la web de Torre: lee la página de cada Dofus del
// catálogo (scripts/import/dofus-guides/catalog.ts) y crea o actualiza su guía. Al repetirla
// no pisa lo que Torre haya cambiado en el panel (load.ts). Los objetos que faltan se traen de
// DofusDB con su icono; las capturas de Squarespace y las portadas de los vídeos, a Media.
// Uso: pnpm import:dofus-guides [--from <carpeta>] [--apply] [--remote] [--production]
// --from lee <carpeta>/<slug>.html en vez de descargar las páginas. Sin --apply solo cuenta y
// avisa: no escribe nada. Escribe en la base de DATABASE_URL (vacía: la de pnpm db:dev); contra
// una base remota pide --remote, y en producción --production.
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { getPayload } from 'payload'

import config from '@payload-config'
import { databaseScriptRefusal } from '@/lib/db/script-guard'
import { createDofusDbClient } from '@/lib/dofusdb/client'

import { DOFUS_CATALOG, DOFUS_INDEX_INTRO } from './dofus-guides/catalog'
import { gameItems } from './dofus-guides/game-items'
import { loadDofusGuides, loadDofusIndexIntro, type DofusGuideInput } from './dofus-guides/load'
import { parseDofusGuide } from './dofus-guides/parse'
import { createPosterFetcher, posterUrl } from './dofus-guides/video-poster'
import { mediaByUrl } from './media-by-url'
import { createHtmlToLexical } from './rich-text'
import { releaseDom } from './squarespace/dom'
import { createImageFetcher } from './squarespace/fetch-image'

const SITE = 'https://www.torrentearcano.com'
const USAGE = 'Uso: pnpm import:dofus-guides [--from <carpeta>] [--apply] [--remote] [--production]'

const args = process.argv.slice(2)
const fromIndex = args.indexOf('--from')
const from = fromIndex === -1 ? null : args[fromIndex + 1]
if (fromIndex !== -1 && (!from || from.startsWith('--'))) {
  console.error(USAGE)
  process.exit(1)
}
// Antes de arrancar Payload: un entorno equivocado no llega a conectarse.
const refusal = databaseScriptRefusal(process.env, args, 'importar las guías de Dofus')
if (refusal) {
  console.error(refusal)
  process.exit(1)
}
const apply = args.includes('--apply')

/** El HTML de la página de un Dofus: de la carpeta dada o de la web de Torre. */
async function pageHtml(slug: string): Promise<string> {
  if (from) return readFile(path.join(from, `${slug}.html`), 'utf8')
  const response = await fetch(`${SITE}/${slug}`, {
    headers: { 'User-Agent': 'ta-web/importacion' },
    signal: AbortSignal.timeout(30_000),
  })
  if (!response.ok) throw new Error(`${SITE}/${slug} respondió ${response.status}`)
  return response.text()
}

const guides: DofusGuideInput[] = []
for (const entry of DOFUS_CATALOG) {
  const html = entry.page ? await pageHtml(entry.slug) : null
  guides.push({ entry, source: html ? parseDofusGuide(html) : null })
}
// Los documentos leídos ya están en datos: se suelta lo que retiene el DOM.
await releaseDom()

const payload = await getPayload({ config })
try {
  const log = (message: string) => console.log(message)
  const items = gameItems(payload, { client: createDofusDbClient({ log }), log, dryRun: !apply })
  const images = mediaByUrl(payload, createImageFetcher(), { apply })
  const fetchPoster = createPosterFetcher()
  const posters = mediaByUrl(payload, (url) => fetchPoster(url.split('/vi/')[1]!.split('/')[0]!), {
    apply,
  })

  const htmlToLexical = await createHtmlToLexical(payload.config)
  const intro = await loadDofusIndexIntro(payload, {
    intro: DOFUS_INDEX_INTRO,
    apply,
    htmlToLexical,
  })
  console.log(`Entradilla del índice: ${intro}`)
  const report = await loadDofusGuides(payload, {
    guides,
    apply,
    htmlToLexical,
    ensureItem: items.ensureItem,
    findItem: items.findItem,
    mediaFor: images,
    posterFor: async (videoId) => {
      try {
        return await posters(posterUrl(videoId), 'Portada del vídeo')
      } catch (error) {
        console.log(`Portada del vídeo ${videoId} no disponible: ${String(error)}`)
        return null
      }
    },
    log,
  })

  console.log(
    `${apply ? 'Hecho' : 'En seco (sin --apply)'}: ${report.created} creadas, ` +
      `${report.updated} actualizadas, ${report.unchanged} sin cambios.`,
  )
  for (const { slug, field } of report.kept) {
    console.log(`Se respeta lo que cambió Torre en ${slug}: ${field}`)
  }
  for (const { slug, kind, name } of report.unmatched) {
    console.log(`Sin casar en ${slug}: ${kind} «${name}»`)
  }
  for (const { slug, achievement, torre, page } of report.differences) {
    console.log(
      `Misiones distintas en ${slug}, logro «${achievement}»:\n` +
        `  en la web de Torre: ${torre.join(' · ')}\n  en su página de logro: ${page.join(' · ')}`,
    )
  }
  await payload.destroy()
} catch (error) {
  console.error('La importación de las guías de Dofus falló:', error)
  await payload.destroy()
  process.exit(1)
}
