// Los logros de Alineamiento de DofusDB (categoría 43, dentro de Misiones) no tienen misiones,
// así que el refresco no les crea página (src/lib/achievements/ensure-pages.ts). Torre sí tiene
// una por logro en Squarespace, enlazada desde su índice /logros bajo «Alineamiento», con sus
// slugs («logro-a-sus-ordenes», no «a-sus-ordenes»). Aquí, lo puro: leer esa lista y casar
// cada logro con su página. La carga está en load-alignment.ts.
import { parseHtml } from '../squarespace/dom'
import type { PageBlock } from '../squarespace/parse-page'

/** La categoría de logros «Alineamiento» de DofusDB. */
export const ALIGNMENT_CATEGORY = 43

/** El título de la lista en el índice de logros de Torre. */
const HEADING = 'Alineamiento'

/** Un logro de la lista de Torre: su nombre, el slug de su página y su nota («(Orden 1: títulos).»). */
export interface TorreAchievementLink {
  name: string
  slug: string
  note: string
}

/** Un logro de DofusDB de la categoría, guardado en `achievements`. */
export interface AlignmentAchievement {
  /** Su ID de Payload. */
  id: number
  dofusId: number
  name: string
}

export interface AlignmentMatch {
  matched: { achievement: AlignmentAchievement; link: TorreAchievementLink }[]
  /** Logros de DofusDB que Torre no lista. */
  withoutTorrePage: AlignmentAchievement[]
  /** Páginas de Torre sin logro de DofusDB con su nombre. */
  withoutAchievement: TorreAchievementLink[]
}

/** El slug de un enlace de Torre a su web: «/en-guardia» o la URL completa. */
function slugOf(href: string): string | null {
  try {
    const url = new URL(href, 'https://www.torrentearcano.com')
    if (!/(^|\.)torrentearcano\.com$/.test(url.hostname)) return null
    const slug = url.pathname.replace(/^\/+|\/+$/g, '')
    return slug && !slug.includes('/') ? slug.toLowerCase() : null
  } catch {
    return null
  }
}

/** Un título de la lista: un bloque de texto sin enlaces. */
const isHeading = (block: PageBlock) =>
  block.type === 'text' && block.elements.every((element) => !/<a\s/i.test(element.html))

/**
 * Los logros que Torre enlaza bajo «Alineamiento» en /logros, en su orden: desde ese título
 * hasta el siguiente. De cada párrafo, su primer enlace a su web y el resto del texto como nota.
 */
export function alignmentLinks(blocks: PageBlock[]): TorreAchievementLink[] {
  const start = blocks.findIndex(
    (block) => block.type === 'text' && block.elements.some((element) => element.text === HEADING),
  )
  if (start === -1) return []
  const links: TorreAchievementLink[] = []
  for (const block of blocks.slice(start + 1)) {
    if (block.type !== 'text') continue
    if (isHeading(block)) break
    for (const element of block.elements) {
      const anchor = parseHtml(element.html).querySelector('a[href]')
      const slug = anchor && slugOf(anchor.getAttribute('href') ?? '')
      if (!anchor || !slug) continue
      const name = (anchor.textContent ?? '').replace(/\s+/g, ' ').trim()
      const note = element.text.startsWith(name) ? element.text.slice(name.length).trim() : ''
      links.push({ name, slug, note })
    }
  }
  return links
}

/** Un nombre para comparar: sin mayúsculas, tildes ni signos. */
function fold(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLocaleLowerCase('es')
    .replace(/[^a-z0-9ñ]+/g, ' ')
    .trim()
}

/** Cada logro con el enlace de Torre de su mismo nombre; cada uno casa una vez como mucho. */
export function matchAlignment(
  achievements: AlignmentAchievement[],
  links: TorreAchievementLink[],
): AlignmentMatch {
  const free = new Map<string, AlignmentAchievement>()
  for (const achievement of achievements) {
    const key = fold(achievement.name)
    if (!free.has(key)) free.set(key, achievement)
  }
  const matched: AlignmentMatch['matched'] = []
  const withoutAchievement: TorreAchievementLink[] = []
  for (const link of links) {
    const key = fold(link.name)
    const achievement = free.get(key)
    if (!achievement) {
      withoutAchievement.push(link)
      continue
    }
    free.delete(key)
    matched.push({ achievement, link })
  }
  const used = new Set(matched.map(({ achievement }) => achievement.id))
  return {
    matched,
    withoutTorrePage: achievements.filter((achievement) => !used.has(achievement.id)),
    withoutAchievement,
  }
}
