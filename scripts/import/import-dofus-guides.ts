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
import { needGroupLabel } from '@/lib/dofus-guides/need-groups'

import { DOFUS_CATALOG, DOFUS_INDEX_INTRO } from './dofus-guides/catalog'
import { gameItems } from './dofus-guides/game-items'
import { loadDofusGuides, loadDofusIndexIntro, type DofusGuideInput } from './dofus-guides/load'
import { achievementName } from './dofus-guides/normalize-needs'
import { parseDofusGuide, type NeedRow } from './dofus-guides/parse'
import { createPosterFetcher, posterUrl } from './dofus-guides/video-poster'
import { ImageDownloadError, mediaByUrl } from './media-by-url'
import { createHtmlToLexical } from './rich-text'
import { releaseDom } from './squarespace/dom'
import { createImageFetcher } from './squarespace/fetch-image'

const SITE = 'https://www.torrentearcano.com'

type RawJob = { id: number; name?: { es?: string } | null }
type RawAchievement = RawJob

/** Los nombres de logro de las filas «Logro:» de Necesitarás de una guía. */
function achievementRows(source: DofusGuideInput['source']): string[] {
  const rows = (list: NeedRow[]): NeedRow[] =>
    list.flatMap((row) => [row, ...rows(row.children ?? [])])
  return rows((source?.needs?.groups ?? []).flatMap((group) => group.rows)).flatMap(
    (row) => achievementName(row.text) ?? [],
  )
}
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
  const client = createDofusDbClient({ log })
  const items = gameItems(payload, { client, log, dryRun: !apply })
  // Los oficios de DofusDB («Minero»), para el grupo «Oficios» de Necesitarás. «Base» no lo es.
  const jobs = (await client.fetchAll<RawJob>('jobs', { select: ['id', 'name'] }))
    .map((job) => job.name?.es ?? '')
    .filter((name) => name && name !== 'Base')
  // Las filas «Logro: “Cazamonturas”» que nombran un logro de DofusDB van a «Logros».
  const achievements: string[] = []
  // De una vez: el endpoint de logros no acepta $regex, pero sí $in con los nombres exactos
  // que escribió Torre (de 50 en 50, lo que da una página).
  const names = [...new Set(guides.flatMap(({ source }) => achievementRows(source)))]
  for (let start = 0; start < names.length; start += 50) {
    const query = Object.fromEntries(
      names.slice(start, start + 50).map((name, index) => [`name.es[$in][${index}]`, name]),
    )
    const found = await client.fetchWhere<RawAchievement>('achievements', query, {
      select: ['id', 'name'],
    })
    achievements.push(...found.flatMap((row) => row.name?.es ?? []))
  }
  // En seco no se sube nada: lo que falta da 0, un ID que nunca se escribe.
  const findImage = mediaByUrl(payload, createImageFetcher())
  const images = async (url: string, alt: string) =>
    (await findImage(url, alt, { upload: apply })) ?? 0
  const fetchPoster = createPosterFetcher()
  const findPoster = mediaByUrl(payload, (url) => fetchPoster(url.split('/vi/')[1]!.split('/')[0]!))
  const posters = async (url: string, alt: string) =>
    (await findPoster(url, alt, { upload: apply })) ?? 0

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
    findItem: items.matchItem,
    jobs,
    achievements,
    mediaFor: images,
    posterFor: async (videoId) => {
      try {
        return await posters(posterUrl(videoId), 'Portada del vídeo')
      } catch (error) {
        // Solo una descarga fallida; un error de la base para la importación.
        if (!(error instanceof ImageDownloadError)) throw error
        console.log(`Portada del vídeo ${videoId} no disponible: ${error.message}`)
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
  for (const { slug, text, item } of report.withoutQuantity) {
    console.log(`Fila sin cantidad casada en ${slug}: «${text}» → «${item}» (1)`)
  }
  for (const { slug, text, item } of report.singular) {
    console.log(`Fila casada en singular en ${slug}: «${text}» → «${item}»`)
  }
  for (const { slug, text, error } of report.lookupFailures) {
    console.log(`Búsqueda fallida en ${slug}, queda como nota: «${text}» (${error})`)
  }
  for (const { slug } of report.kept.filter((kept) => kept.field === 'needs')) {
    console.log(`Necesitarás sin normalizar en ${slug}: Torre lo cambió en el panel`)
  }
  for (const { slug, groups } of report.needsAfter) {
    console.log(`Necesitarás después de normalizar en ${slug}:`)
    for (const { name, subtitle, rows } of groups) {
      const head = subtitle ? `${needGroupLabel(name)} › «${subtitle}»` : needGroupLabel(name)
      console.log(`  ${head}: ${rows.map((row) => `«${row}»`).join(' · ')}`)
    }
  }
  for (const { slug, subtitle, groups } of report.mixedSubtitles) {
    const names = groups.map(needGroupLabel).join(', ')
    console.log(`Subtítulo con filas de varios grupos en ${slug}: «${subtitle}» (${names})`)
  }
  let previous = ''
  for (const { slug, text, from, to, reason } of report.needGroups) {
    if (slug !== previous) console.log(`Grupos de Necesitarás en ${slug}:`)
    previous = slug
    console.log(`  «${text}»: ${from ?? '(suelta)'} → ${needGroupLabel(to)} (${reason})`)
  }
  for (const { slug, text } of report.needGroups.filter((row) => row.to === 'otros')) {
    console.log(`Sin clasificar en ${slug}, va a Otros: «${text}»`)
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
