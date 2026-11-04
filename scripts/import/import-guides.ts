// Importa guías de misiones de Squarespace como borradores en quest-guides.
// Uso: pnpm import:guides <carpeta de la migración> [slug…]
// La carpeta es la del inventario (raw/pages/<slug>.html y out/quest_matches.csv). Sin
// slugs importa las cinco de GUIDE_SLUGS. Escribe en la base de DATABASE_URL (vacía: la
// de pnpm db:dev) y sube las imágenes adonde apunte el almacenamiento (disco o R2).
// Corre con `payload run`, como scripts/refresh-quests.ts.
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { getPayload } from 'payload'

import config from '@payload-config'

import { loadQuestGuides, type ImageFile } from './load-quest-guides'
import { parsePage } from './squarespace/parse-page'
import { parseQuestMatches } from './squarespace/quest-matches'
import { GUIDE_SLUGS, toQuestGuide } from './squarespace/to-quest-guide'

const started = Date.now()
const seconds = () => ((Date.now() - started) / 1000).toFixed(1)

const [sourceDir, ...requested] = process.argv.slice(2)
if (!sourceDir) {
  console.error('Uso: pnpm import:guides <carpeta de la migración> [slug…]')
  process.exit(1)
}
const slugs = requested.length ? requested : [...GUIDE_SLUGS]

const ORIGINAL_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
}

async function fetchImage(url: string): Promise<ImageFile> {
  // El CDN de Squarespace sirve WebP a quien lo acepte, también con */*. Pidiendo solo
  // el tipo de la extensión devuelve el archivo original, que es el que se guarda.
  const accept = ORIGINAL_TYPES[path.extname(new URL(url).pathname).toLowerCase()] ?? '*/*'
  const response = await fetch(url, {
    headers: { accept },
    signal: AbortSignal.timeout(30_000),
  })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  const data = Buffer.from(await response.arrayBuffer())
  // Squarespace codifica los espacios del nombre como "+".
  const name = decodeURIComponent(path.basename(new URL(url).pathname).replace(/\+/g, ' '))
  const mimetype = response.headers.get('content-type')?.split(';')[0] ?? 'application/octet-stream'
  return { data, mimetype, name, size: data.length }
}

const payload = await getPayload({ config })
try {
  const matches = parseQuestMatches(
    await readFile(path.join(sourceDir, 'out', 'quest_matches.csv'), 'utf8'),
  )
  const guides = []
  for (const slug of slugs) {
    const html = await readFile(path.join(sourceDir, 'raw', 'pages', `${slug}.html`), 'utf8')
    const match = matches.get(slug)
    // Un cruce ambiguo no se enlaza: lo decide Torre en el panel.
    const converted = toQuestGuide(parsePage(html), {
      slug,
      questDofusIds: match && !match.ambiguous ? match.questIds : [],
    })
    if (match?.ambiguous) converted.oddities.push('Cruce ambiguo con DofusDB, sin enlazar')
    guides.push(converted)
  }
  console.log(`Leídas ${guides.length} páginas (${seconds()} s). Cargando…`)

  const result = await loadQuestGuides(payload, guides, {
    fetchImage,
    log: (message) => console.log(message),
  })

  for (const [slug, oddities] of Object.entries(result.oddities)) {
    for (const oddity of oddities) console.log(`Rareza en ${slug}: ${oddity}`)
  }
  const { guides: g, media: m } = result
  console.log(
    `Listo en ${seconds()} s: ${g.created} guías creadas, ${g.updated} actualizadas, ` +
      `${g.unchanged} sin cambios, ${g.skipped} saltadas; ${m.created} imágenes subidas, ${m.reused} reutilizadas.`,
  )
  await payload.destroy()
} catch (error) {
  console.error('La importación de guías falló:', error)
  await payload.destroy()
  // `payload run` sale con 0 cuando el script termina sin lanzar: el fallo se marca aquí.
  process.exit(1)
}
