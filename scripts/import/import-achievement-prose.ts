// Lleva a la entrada y el cierre de cada página de logro la prosa de Torre en su página de
// Squarespace (achievements/prose.ts): el texto tal cual, con sus capturas y sus vídeos en su
// sitio. Al repetirla no pisa lo que Torre haya escrito en el panel (achievements/load-prose.ts).
// Las capturas se suben a Media desde el CDN de Squarespace y las portadas de los vídeos
// desde YouTube, una vez: si ya están (por su URL de origen), se reutilizan.
// Uso: pnpm import:achievement-prose [--from <carpeta>] [--apply] [--remote] [--production]
// --from lee <carpeta>/<slug>.html (las páginas cacheadas del rastreo) en vez de descargarlas.
// Sin --apply solo cuenta y avisa: no escribe ni sube nada. Escribe en la base de
// DATABASE_URL (vacía: la de pnpm db:dev); contra una base remota pide --remote, y en
// producción --production.
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { getPayload } from 'payload'

import config from '@payload-config'
import { databaseScriptRefusal } from '@/lib/db/script-guard'

import { loadAchievementProse } from './achievements/load-prose'
import { readAchievementPages } from './achievements/read-pages'
import { createPosterFetcher, posterUrl } from './dofus-guides/video-poster'
import { mediaByUrl } from './media-by-url'
import { createHtmlToLexical } from './rich-text'
import { createImageFetcher } from './squarespace/fetch-image'

const SITE = 'https://www.torrentearcano.com'
const USAGE =
  'Uso: pnpm import:achievement-prose [--from <carpeta>] [--apply] [--remote] [--production]'

const args = process.argv.slice(2)
const fromIndex = args.indexOf('--from')
const from = fromIndex === -1 ? null : args[fromIndex + 1]
if (fromIndex !== -1 && (!from || from.startsWith('--'))) {
  console.error(USAGE)
  process.exit(1)
}
// Antes de arrancar Payload: un entorno equivocado no llega a conectarse.
const refusal = databaseScriptRefusal(process.env, args, 'importar la prosa de los logros')
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
  const response = await fetch(`${SITE}/${slug}`, {
    headers: { 'User-Agent': 'ta-web/importacion' },
    signal: AbortSignal.timeout(30_000),
  })
  if (response.status === 404) return null
  if (!response.ok) throw new Error(`${SITE}/${slug} respondió ${response.status}`)
  return response.text()
}

const payload = await getPayload({ config })
try {
  const log = (message: string) => console.log(message)
  const { docs } = await payload.find({
    collection: 'achievement-pages',
    select: { slug: true },
    depth: 0,
    draft: true,
    pagination: false,
    overrideAccess: true,
  })
  const pages = await readAchievementPages(
    docs.map((doc) => doc.slug),
    pageHtml,
  )

  // Una descarga fallida (ImageDownloadError) la anota la carga; cualquier otro error para.
  const images = mediaByUrl(payload, createImageFetcher())
  const fetchPoster = createPosterFetcher()
  const posters = mediaByUrl(payload, (url) => fetchPoster(url.split('/vi/')[1]!.split('/')[0]!))
  const report = await loadAchievementProse(payload, {
    pages,
    apply,
    htmlToLexical: await createHtmlToLexical(payload.config),
    mediaFor: images,
    posterFor: (videoId, options) => posters(posterUrl(videoId), 'Portada del vídeo', options),
    log,
  })

  console.log(
    `${apply ? 'Hecho' : 'En seco (sin --apply)'}: ${docs.length} páginas de logro; ` +
      `${report.withProse.length} con prosa en Squarespace (${report.videos} vídeos y ` +
      `${report.images} capturas), ${report.withoutProse.length} sin prosa y ` +
      `${report.missing.length} sin página en Squarespace. ${report.updated} ` +
      `${apply ? 'actualizadas' : 'se actualizarían'} y ${report.unchanged} sin cambios.`,
  )
  for (const { slug, message } of report.oddities) console.log(`Rareza en ${slug}: ${message}`)
  for (const { slug, field } of report.kept) {
    console.log(`Se respeta lo que escribió Torre en ${slug}: ${field}`)
  }
  console.log(`Sin prosa en Squarespace: ${report.withoutProse.join(', ') || 'ninguna'}`)
  console.log(`Sin página en Squarespace: ${report.missing.join(', ') || 'ninguna'}`)
  await payload.destroy()
} catch (error) {
  console.error('La importación de la prosa de los logros falló:', error)
  await payload.destroy()
  process.exit(1)
}
