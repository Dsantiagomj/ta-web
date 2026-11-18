// Leer un inventario del disco: el HTML guardado de cada página y lo que cambió respecto a otro
// inventario (pages.ts). Lo usan pnpm import:inventory y pnpm import:delta.
import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { comparePage, pageFeatures, pageFileSlug, sitemapPaths, type PageDelta } from './pages.ts'

const readText = (file: string) =>
  readFile(file, 'utf8').catch((error: NodeJS.ErrnoException) => {
    if (error.code === 'ENOENT') return null
    throw error
  })

/** El HTML guardado de una página del inventario, por su slug de archivo, o null. */
export const readInventoryPage = (dir: string, slug: string) =>
  readText(path.join(dir, 'raw', 'pages', `${slug}.html`))

/** Las rutas del sitemap guardado de un inventario. */
export async function inventoryPaths(dir: string): Promise<string[]> {
  return sitemapPaths((await readText(path.join(dir, 'raw', 'sitemap.xml'))) ?? '')
}

/**
 * Qué cambió de cada ruta de los dos sitemaps entre el inventario anterior y el nuevo. Una ruta
 * que sale de un sitemap cuenta como sin página en ese inventario.
 */
export async function compareInventories(previous: string, next: string): Promise<PageDelta[]> {
  const oldPaths = await inventoryPaths(previous)
  const newPaths = await inventoryPaths(next)
  const features = async (dir: string, pathname: string) => {
    const html = await readInventoryPage(dir, pageFileSlug(pathname))
    return html === null ? null : pageFeatures(html)
  }
  const deltas: PageDelta[] = []
  for (const pathname of [...new Set([...oldPaths, ...newPaths])]) {
    const before = oldPaths.includes(pathname) ? await features(previous, pathname) : null
    const after = newPaths.includes(pathname) ? await features(next, pathname) : null
    if (before || after) deltas.push(comparePage(pathname, before, after))
  }
  return deltas
}
