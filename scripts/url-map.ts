// El mapa de URL viejas (backlog B-08): cada URL del sitemap de Squarespace y lo que este
// sitio hará con ella tras el cambio de dominio (mismo slug, redirección, 410, aplazada o
// falta, con quién la desbloquea). Lee el sitemap y la base, nunca escribe en ella. Con
// --write escribe docs/research/url-map.md. Lógica en scripts/legacy-links/url-map.ts.
// Uso: pnpm urls:map [--write] [--sitemap <url o archivo>] [--remote] [--production]
// Lee la base de DATABASE_URL (vacía: la de pnpm db:dev); una base remota pide --remote, y
// producción --production. Contra dev:
// railway run -s web -e dev -- pnpm urls:map --remote --write
// El día del corte, antes de mover el dominio (después el sitemap de Squarespace ya no está):
// railway run -s web -e production -- pnpm urls:map --production --write
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

import { getPayload } from 'payload'

import config from '@payload-config'
import { databaseScriptRefusal } from '@/lib/db/script-guard'
import { LEGACY_SITE_ORIGIN } from '@/lib/site/legacy'

import { readSiteIndex } from './legacy-links/site-index'
import { buildUrlMap, parseSitemap, urlMapMarkdown, urlMapSummary } from './legacy-links/url-map'
import { runPayloadScript } from './payload-script'

// pnpm corre los scripts desde la raíz del repo.
const OUT = path.resolve('docs/research/url-map.md')

const args = process.argv.slice(2)
const refusal = databaseScriptRefusal(process.env, args, 'leer el mapa de URL de esa base')
if (refusal) {
  console.error(refusal)
  process.exit(1)
}
const sitemapIndex = args.indexOf('--sitemap')
const sitemap = sitemapIndex === -1 ? `${LEGACY_SITE_ORIGIN}/sitemap.xml` : args[sitemapIndex + 1]
if (!sitemap) {
  console.error(
    'Uso: pnpm urls:map [--write] [--sitemap <url o archivo>] [--remote] [--production]',
  )
  process.exit(1)
}

/** Un sitemap, de la web o de un archivo. Uno tras otro, sin prisa: es la web de Torre. */
async function readSitemap(source: string): Promise<string> {
  if (!/^https?:\/\//u.test(source)) return readFileSync(source, 'utf8')
  const response = await fetch(source, { headers: { 'User-Agent': 'ta-web url map' } })
  if (!response.ok) throw new Error(`${source}: ${response.status}`)
  return response.text()
}

/** Las rutas de todas las páginas, siguiendo los sitemaps de un índice. */
async function readOldPaths(source: string): Promise<string[]> {
  const paths = new Set<string>()
  const queue = [source]
  const seen = new Set<string>()
  while (queue.length > 0) {
    const next = queue.shift()!
    if (seen.has(next)) continue
    seen.add(next)
    const { pages, sitemaps } = parseSitemap(await readSitemap(next))
    for (const page of pages) paths.add(page)
    queue.push(...sitemaps)
  }
  return [...paths]
}

await runPayloadScript(
  () => getPayload({ config }),
  async (payload) => {
    const [paths, site] = await Promise.all([readOldPaths(sitemap), readSiteIndex(payload)])
    const rows = buildUrlMap(paths, site)
    for (const line of urlMapSummary(rows)) console.log(line)
    if (!args.includes('--write')) {
      console.log('\nSin --write: no se escribe nada.')
      return
    }
    const markdown = urlMapMarkdown(rows, {
      generated: new Date().toISOString().slice(0, 10),
      source: process.env.RAILWAY_ENVIRONMENT_NAME?.trim() || 'local',
      sitemap,
    })
    writeFileSync(OUT, markdown)
    console.log(`\nEscrito: ${path.relative(process.cwd(), OUT)}`)
  },
  { label: 'El mapa de URL viejas' },
)
