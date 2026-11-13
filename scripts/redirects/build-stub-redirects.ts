// Escribe la sección `stubs` de src/lib/redirects/legacy-urls.json (backlog B-04): cada esbozo
// vacío de Squarespace va a la página de su logro (301) o da 410 (stub-map.ts). Lee los datos
// de la API pública de una web desplegada, como los ve un visitante: el mapa tiene que valer
// para lo publicado allí (dev hoy, producción en el corte), y así no pide credenciales.
// Uso: pnpm redirects:stubs [--from <origen>] [--dry-run]
// Sin --from lee de dev. Imprime el informe: qué fue adónde y lo que no tiene página. Con
// --dry-run no escribe nada. Repetirlo cuando Torre publique páginas de logro.
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

import prettier from 'prettier'

import { mapStubs, stubReport, stubsSection, type StubData } from './stub-map.ts'
import { LEGACY_STUBS } from './stubs.ts'

const DEFAULT_ORIGIN = 'https://ta-web-dev.up.railway.app'
const TABLE = path.resolve(import.meta.dirname, '../../src/lib/redirects/legacy-urls.json')
const SECTION = 'stubs'

const args = process.argv.slice(2)
const fromIndex = args.indexOf('--from')
const origin = (fromIndex === -1 ? DEFAULT_ORIGIN : (args[fromIndex + 1] ?? '')).replace(/\/+$/, '')
const dryRun = args.includes('--dry-run')
if (!/^https?:\/\//.test(origin)) {
  console.error('Uso: pnpm redirects:stubs [--from <origen>] [--dry-run]')
  process.exit(1)
}

type Doc = Record<string, unknown>

/** Una colección entera por la API REST, sin sesión: solo lo que ve un visitante. */
async function readAll(collection: string, fields: string[]): Promise<Doc[]> {
  const url = new URL(`/api/${collection}`, origin)
  url.searchParams.set('pagination', 'false')
  url.searchParams.set('depth', '0')
  for (const field of fields) url.searchParams.set(`select[${field}]`, 'true')
  const response = await fetch(url)
  if (!response.ok) throw new Error(`${url}: ${response.status}`)
  return ((await response.json()) as { docs: Doc[] }).docs
}

const [achievements, quests, pages, guides, groups, dofus, checklists] = await Promise.all([
  readAll('achievements', ['dofusId', 'name', 'quests']),
  readAll('quests', ['name', 'achievement']),
  readAll('achievement-pages', ['slug', 'state', 'achievement']),
  readAll('quest-guides', ['slug']),
  readAll('achievement-groups', ['slug']),
  readAll('dofus-guides', ['slug', 'state']),
  readAll('checklists', ['slug', 'state']),
])

const published = (doc: Doc) => doc.state === 'published'
const data: StubData = {
  achievements: achievements as StubData['achievements'],
  quests: quests as StubData['quests'],
  pages: pages as StubData['pages'],
  documents: [
    // La API no da borradores a un visitante: cada guía que llega se ve.
    ...guides.map((d) => ({ slug: String(d.slug), collection: 'quest-guides', page: true })),
    ...pages.map((d) => ({
      slug: String(d.slug),
      collection: 'achievement-pages',
      page: published(d),
    })),
    // Un metalogro es un panel de /metalogros: su slug no es una página.
    ...groups.map((d) => ({ slug: String(d.slug), collection: 'achievement-groups', page: false })),
    ...dofus.map((d) => ({ slug: String(d.slug), collection: 'dofus-guides', page: published(d) })),
    ...checklists.map((d) => ({
      slug: String(d.slug),
      collection: 'checklists',
      page: published(d),
    })),
  ],
}

type Section = { description: string; moved?: Record<string, string>; gone?: string[] }
const table = JSON.parse(readFileSync(TABLE, 'utf8')) as Record<string, Section>
const taken = new Set(
  Object.entries(table)
    .filter(([name]) => name !== SECTION)
    .flatMap(([, section]) => [...Object.keys(section.moved ?? {}), ...(section.gone ?? [])]),
)

const outcomes = mapStubs(LEGACY_STUBS, data, { taken })
console.log(`Datos de ${origin}\n`)
console.log(stubReport(outcomes))

if (dryRun) {
  console.log('\n--dry-run: no se escribe nada.')
} else {
  table[SECTION] = { description: table[SECTION]?.description ?? '', ...stubsSection(outcomes) }
  const json = await prettier.format(JSON.stringify(table), { filepath: TABLE })
  writeFileSync(TABLE, json)
  console.log(`\nEscrito: ${path.relative(process.cwd(), TABLE)}`)
}
