// Un enlace de Torre que nadie desbloquea y que es una errata del slug de una página que este
// sitio sirve («/operacion-envenenacion» por «/operacion-envenenamiento»): el informe de
// pnpm links:legacy dice cuál quería, y Torre lo corrige en el panel. Código puro.
import { editDistance } from '@/lib/text/edit-distance'

import type { LegacyLinkEntry } from './report'
import { slugOfPath } from './blockers'
import { ownSitePath } from '@/lib/site/site-links'

/**
 * La página que quería un slug que no existe, o null. Una errata clara: las mismas palabras
 * (separadas por guiones) y como mucho un cambio por cada cinco letras del slug más largo.
 * Si dos páginas quedan igual de cerca, no elige ninguna.
 */
export function typoTarget(slug: string, served: readonly string[]): string | null {
  const words = slug.split('-').length
  let best: string | null = null
  let bestDistance = Infinity
  let tie = false
  for (const candidate of served) {
    if (candidate === slug) return null
    if (candidate.split('-').length !== words) continue
    const limit = Math.max(1, Math.floor(Math.max(slug.length, candidate.length) / 5))
    if (Math.abs(slug.length - candidate.length) > limit) continue
    const distance = editDistance(slug, candidate)
    if (distance > limit) continue
    if (distance < bestDistance) {
      best = candidate
      bestDistance = distance
      tie = false
    } else if (distance === bestDistance) {
      tie = true
    }
  }
  return tie ? null : best
}

/** Lo sin decidir que es una errata pasa a Torre, con la página que quería; lo demás, igual. */
export function withTypoTarget(entry: LegacyLinkEntry, served: readonly string[]): LegacyLinkEntry {
  if (entry.blocker !== 'undecided') return entry
  const path = ownSitePath(entry.href)
  const target = path === null ? null : typoTarget(slugOfPath(path), served)
  if (!target) return entry
  return { ...entry, blocker: 'typo', note: `quería /${target}` }
}
