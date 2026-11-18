// Un inventario nuevo de la web de Torre para la importación delta: baja el sitemap y cada una
// de sus páginas a <carpeta>/raw (raw/sitemap.xml, raw/pages/<slug>.html y raw/pages/_meta.json,
// como el inventario del 2026-11-02) y dice qué cambió respecto al anterior: páginas nuevas,
// esbozos que ahora tienen contenido, cambios de texto, imágenes, vídeos, código y enlaces.
// No se fía del lastmod del sitemap: compara cada página.
// Uso: pnpm import:inventory --to <carpeta nueva> [--previous <inventario anterior>]
//        [--delay <ms>] [--refresh] [--compare-only]
// Baja de una en una con una pausa (1 s por defecto). Si se corta, repetirlo sigue donde iba:
// solo baja lo que falta o falló; --refresh lo baja todo otra vez. --compare-only no baja nada y
// solo compara. Escribe el informe en <carpeta>/out/delta.json y delta.txt. Nunca escribe en el
// inventario anterior. Sale con 1 si alguna página no se pudo bajar.
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { fetchPage } from './inventory/crawl.ts'
import { inventoryReport, pageFileSlug, sitemapPaths, SITE } from './inventory/pages.ts'
import { compareInventories } from './inventory/read.ts'

const USAGE =
  'Uso: pnpm import:inventory --to <carpeta nueva> [--previous <inventario anterior>] ' +
  '[--delay <ms>] [--refresh] [--compare-only]'

const args = process.argv.slice(2)
const option = (name: string) => {
  const index = args.indexOf(name)
  if (index === -1) return null
  const value = args[index + 1]
  if (!value || value.startsWith('--')) {
    console.error(USAGE)
    process.exit(1)
  }
  return value
}
const to = option('--to')
const previous = option('--previous')
const delay = Number(option('--delay') ?? 1000)
if (!to || !Number.isFinite(delay) || delay < 500) {
  console.error(to ? 'La pausa mínima entre páginas es de 500 ms.' : USAGE)
  process.exit(1)
}
if (previous && path.resolve(previous) === path.resolve(to)) {
  console.error('El inventario nuevo va en otra carpeta: el anterior no se toca.')
  process.exit(1)
}

interface MetaEntry {
  status: number
  final_status: number
  redirects: string[]
  bytes: number
  fetched_at?: string
}

const pagesDir = path.join(to, 'raw', 'pages')
const metaFile = path.join(pagesDir, '_meta.json')
await mkdir(pagesDir, { recursive: true })
await mkdir(path.join(to, 'out'), { recursive: true })

const readText = (file: string) =>
  readFile(file, 'utf8').catch((error: NodeJS.ErrnoException) => {
    if (error.code === 'ENOENT') return null
    throw error
  })

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))
const meta = JSON.parse((await readText(metaFile)) ?? '{}') as Record<string, MetaEntry>
// Una página que dio un 5xx o no respondió se vuelve a bajar en la siguiente pasada.
const fetched = (entry: MetaEntry | undefined) =>
  entry !== undefined && entry.final_status > 0 && entry.final_status < 500

let failed: string[] = []
if (!args.includes('--compare-only')) {
  const response = await fetch(`${SITE}/sitemap.xml`, { signal: AbortSignal.timeout(30_000) })
  if (!response.ok) throw new Error(`${SITE}/sitemap.xml respondió ${response.status}`)
  const xml = await response.text()
  await writeFile(path.join(to, 'raw', 'sitemap.xml'), xml)
  const paths = sitemapPaths(xml)
  const todo = args.includes('--refresh') ? paths : paths.filter((p) => !fetched(meta[p]))
  console.log(`${paths.length} páginas en el sitemap; ${todo.length} por bajar.`)
  const started = Date.now()
  for (const [index, pathname] of todo.entries()) {
    if (index > 0) await sleep(delay)
    try {
      const page = await fetchPage(pathname)
      await writeFile(path.join(pagesDir, `${pageFileSlug(pathname)}.html`), page.html)
      meta[pathname] = {
        status: page.status,
        final_status: page.finalStatus,
        redirects: page.redirects,
        bytes: Buffer.byteLength(page.html),
        fetched_at: new Date().toISOString(),
      }
      if (page.finalStatus >= 500) failed.push(`${pathname} (${page.finalStatus})`)
    } catch (error) {
      failed.push(`${pathname} (${(error as Error).message})`)
      meta[pathname] = { status: -1, final_status: -1, redirects: [], bytes: 0 }
    }
    if ((index + 1) % 25 === 0 || index === todo.length - 1) {
      await writeFile(metaFile, JSON.stringify(meta, null, 1))
      const minutes = ((Date.now() - started) / 60_000).toFixed(1)
      console.log(`${index + 1}/${todo.length} (${minutes} min, ${failed.length} fallidas)`)
    }
  }
} else {
  failed = Object.entries(meta)
    .filter(([, entry]) => !fetched(entry))
    .map(([pathname]) => pathname)
}

if (previous) {
  const deltas = await compareInventories(previous, to)
  const report = inventoryReport(deltas)
  const changed = deltas.filter((delta) => delta.status !== 'same')
  await writeFile(
    path.join(to, 'out', 'delta.json'),
    JSON.stringify({ previous: path.resolve(previous), pages: changed }, null, 1),
  )
  await writeFile(path.join(to, 'out', 'delta.txt'), `${report.join('\n')}\n`)
  for (const line of report) console.log(line)
  console.log(`\nInforme: ${path.join(to, 'out', 'delta.txt')}`)
}

if (failed.length) {
  console.error(`\nSin bajar (${failed.length}); repite el comando para reintentarlas:`)
  for (const line of failed) console.error(`- ${line}`)
  process.exit(1)
}
