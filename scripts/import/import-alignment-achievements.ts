// Crea las páginas de los logros de Alineamiento, que DofusDB da sin misiones y el refresco no
// crea (backlog S-06): lee la lista «Alineamiento» del índice /logros de Torre, casa cada logro
// con su página por el nombre, crea las que faltan con su slug, «En preparación», y les trae su
// prosa (la entrada y el cierre, con capturas y vídeos) como pnpm import:achievement-prose.
// Va después de pnpm data:refresh, que guarda los logros con su descripción y sus objetivos.
// Uso: pnpm achievements:alineamiento [--from <carpeta>] [--apply] [--remote] [--production]
// --from lee <carpeta>/<slug>.html (las páginas cacheadas del rastreo) en vez de descargarlas.
// Sin --apply solo cuenta y avisa: no escribe ni sube nada. Escribe en la base de
// DATABASE_URL (vacía: la de pnpm db:dev); contra una base remota pide --remote, y en
// producción --production.
import { getPayload } from 'payload'

import config from '@payload-config'
import { databaseScriptRefusal } from '@/lib/db/script-guard'

import { alignmentLinks } from './achievements/alignment'
import { loadAlignmentPages } from './achievements/load-alignment'
import { loadAchievementProse } from './achievements/load-prose'
import { readAchievementPages } from './achievements/read-pages'
import { proseMedia, squarespacePageReader } from './achievements/squarespace-source'
import { releaseDom } from './squarespace/dom'
import { parsePage } from './squarespace/parse-page'

const USAGE =
  'Uso: pnpm achievements:alineamiento [--from <carpeta>] [--apply] [--remote] [--production]'
/** El índice de logros de Torre, con la lista «Alineamiento». */
const INDEX_SLUG = 'logros'

const args = process.argv.slice(2)
const fromIndex = args.indexOf('--from')
const from = fromIndex === -1 ? null : args[fromIndex + 1]
if (fromIndex !== -1 && (!from || from.startsWith('--'))) {
  console.error(USAGE)
  process.exit(1)
}
// Antes de arrancar Payload: un entorno equivocado no llega a conectarse.
const refusal = databaseScriptRefusal(process.env, args, 'crear las páginas de Alineamiento')
if (refusal) {
  console.error(refusal)
  process.exit(1)
}
const apply = args.includes('--apply')
const pageHtml = squarespacePageReader(from)

const index = await pageHtml(INDEX_SLUG)
if (!index) {
  console.error(`No se encontró la página /${INDEX_SLUG} de Torre.`)
  process.exit(1)
}
const links = alignmentLinks(parsePage(index).blocks)
await releaseDom()

const payload = await getPayload({ config })
try {
  const log = (message: string) => console.log(message)
  const report = await loadAlignmentPages(payload, { links, apply, log })
  if (report.category === null) {
    console.error('Falta la categoría Alineamiento de DofusDB: ejecuta antes pnpm data:refresh.')
    await payload.destroy()
    process.exit(1)
  }

  // La prosa de Torre, solo en las páginas con su slug: las creadas ahora y las que ya lo
  // tenían. Una página con otro slug es de Torre y la lleva pnpm import:achievement-prose.
  const slugs = [
    ...report.created.map((row) => row.slug),
    ...report.existing.filter((row) => row.slug === row.torreSlug).map((row) => row.slug),
  ]
  const pages = await readAchievementPages(
    // DofusDB no les da misiones: las listas de Torre son suyas.
    slugs.map((slug) => ({ slug, dofusDb: true, quests: false })),
    pageHtml,
  )

  console.log(
    `${apply ? 'Hecho' : 'En seco (sin --apply)'}: ${report.achievements.length} logros de ` +
      `${report.category} en DofusDB y ${links.length} en la lista de Torre; ` +
      `${report.created.length} páginas ${apply ? 'creadas' : 'se crearían'}, ` +
      `${report.existing.length} ya existían y ${report.taken.length} con el slug ocupado.`,
  )
  const proseLine = (slug: string) => {
    const prose = pages.get(slug)
    if (!prose) return 'sin prosa importable'
    const items = [...prose.intro, ...prose.outro]
    const count = (type: string) => items.filter((item) => item.type === type).length
    return `prosa: ${count('html')} bloques de texto, ${count('image')} capturas, ${count('video')} vídeos`
  }
  for (const { name, slug } of report.created) {
    console.log(`  ${name} → /${slug} (${apply ? 'creada' : 'se crearía'}; ${proseLine(slug)})`)
  }
  for (const { name, slug } of report.existing) console.log(`  ${name} → /${slug} (ya existía)`)
  for (const { name, slug } of report.taken) console.log(`  ${name} → /${slug} (slug ocupado)`)
  for (const { slug, torreSlug, name } of report.existing) {
    if (slug !== torreSlug)
      console.log(`${name} ya tiene página en /${slug}; Torre usa /${torreSlug}`)
  }
  console.log(
    `Logros de DofusDB sin página de Torre: ${report.withoutTorrePage.map((row) => row.name).join(', ') || 'ninguno'}`,
  )
  console.log(
    `Páginas de Torre sin logro de DofusDB: ${report.withoutAchievement.map((row) => `${row.name} (/${row.slug})`).join(', ') || 'ninguna'}`,
  )

  if (apply && slugs.length > 0) {
    const only = new Set(slugs)
    const prose = await loadAchievementProse(payload, {
      pages,
      apply,
      ...(await proseMedia(payload)),
      only: (slug) => only.has(slug),
      log,
    })
    console.log(
      `Prosa: ${prose.updated} páginas actualizadas, ${prose.unchanged} sin cambios y ` +
        `${prose.kept.length} campos de Torre respetados.`,
    )
    for (const { slug, message } of prose.oddities) console.log(`Rareza en ${slug}: ${message}`)
  }
  await payload.destroy()
} catch (error) {
  console.error('La creación de las páginas de Alineamiento falló:', error)
  await payload.destroy()
  process.exit(1)
}
