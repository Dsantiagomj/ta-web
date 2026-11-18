// Lo que hace pnpm import:golden-refresh, sin red ni disco (los pasa quien llama): baja cada
// página de oro de la web de Torre, una tras otra y con una pausa entre ellas, guarda su fuente
// recortada (trim-source.ts) y compara lo que sale del conversor con la salida revisada. No
// escribe las salidas: el diff es para que una persona lo revise y las acepte con
// pnpm test:import -u.
import type { GoldenPage } from './catalog'
import { lineDiff } from './line-diff'
import { stableJson } from './stable-json'
import { trimSource } from './trim-source'

export interface FetchedPage {
  status: number
  /** La URL final, tras las redirecciones. */
  url: string
  html: string
}

export interface RefreshDeps {
  pages: GoldenPage[]
  fetchPage: (slug: string) => Promise<FetchedPage>
  /** La salida revisada de la página, o null si aún no la tiene. */
  readExpected: (slug: string) => Promise<string | null>
  writeSource: (slug: string, html: string) => Promise<void>
  convert: (page: GoldenPage, html: string) => unknown
  sleep: (ms: number) => Promise<void>
  /** La pausa entre una descarga y la siguiente. */
  delayMs: number
}

export interface RefreshReport {
  changed: { slug: string; diff: string[] }[]
  unchanged: string[]
  failed: { slug: string; reason: string }[]
}

/** Por qué una respuesta no es la página del slug, o null si lo es. */
function rejection(slug: string, page: FetchedPage): string | null {
  if (page.status !== 200) return `respondió ${page.status}`
  const path = new URL(page.url).pathname.replace(/\/+$/u, '')
  return path === `/${slug}` ? null : `redirige a ${path}`
}

export async function refreshGoldenPages(deps: RefreshDeps): Promise<RefreshReport> {
  const report: RefreshReport = { changed: [], unchanged: [], failed: [] }
  for (const [index, page] of deps.pages.entries()) {
    if (index > 0) await deps.sleep(deps.delayMs)
    try {
      const fetched = await deps.fetchPage(page.slug)
      const rejected = rejection(page.slug, fetched)
      if (rejected) {
        report.failed.push({ slug: page.slug, reason: rejected })
        continue
      }
      const trimmed = trimSource(fetched.html)
      const output = stableJson(deps.convert(page, trimmed))
      if (output !== stableJson(deps.convert(page, fetched.html))) {
        report.failed.push({
          slug: page.slug,
          reason: 'el recorte cambia lo que lee el conversor: hay que ampliar trim-source.ts',
        })
        continue
      }
      await deps.writeSource(page.slug, trimmed)
      const diff = lineDiff((await deps.readExpected(page.slug)) ?? '', output)
      if (diff.length) report.changed.push({ slug: page.slug, diff })
      else report.unchanged.push(page.slug)
    } catch (error) {
      report.failed.push({
        slug: page.slug,
        reason: error instanceof Error ? error.message : String(error),
      })
    }
  }
  return report
}
