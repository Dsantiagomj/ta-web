// Una página de clase o de mazmorra de Torre en Squarespace, lista para su colección. Se lee
// como una página suelta (pages/convert.ts): su texto tal cual, sus capturas y sus vídeos en su
// orden, y su encabezado como título. En una clase, cada imagen bajo su encabezado «PVM» o
// «PVP» es una build, con el enlace que Torre le puso; el resto se queda en el texto.
import { convertPage, type ConvertedPage } from '../pages/convert'
import { normalizedText, parseHtml } from '../squarespace/dom'
import type { SectionPageEntry } from './catalog'

export type BuildMode = 'pvm' | 'pvp'

export interface ClassBuild {
  url: string
  alt: string
  link?: string
}

export interface ConvertedClassPage extends ConvertedPage {
  builds: Record<BuildMode, ClassBuild[]>
}

/** Un encabezado solo, «PVM» o «PVP», como los de sus páginas de builds. */
const BUILD_HEADING = /^<h[1-6]\b[^>]*>[\s\S]*<\/h[1-6]>$/u

function buildMode(html: string): BuildMode | null {
  if (!BUILD_HEADING.test(html.trim())) return null
  const text = normalizedText(parseHtml(html).body).toLocaleLowerCase('es')
  return text === 'pvm' || text === 'pvp' ? text : null
}

const asPage = (entry: SectionPageEntry) => ({ ...entry, state: 'preparing' as const })

/** Una página de mazmorra: como una página suelta. */
export function convertDungeonPage(
  html: string,
  entry: SectionPageEntry,
  live: (slug: string) => boolean,
): ConvertedPage {
  return convertPage(html, asPage(entry), live)
}

/** Una página de clase: sus builds de PVM y PVP y, aparte, el resto en su orden. */
export function convertClassPage(
  html: string,
  entry: SectionPageEntry,
  live: (slug: string) => boolean,
): ConvertedClassPage {
  const page = convertPage(html, asPage(entry), live)
  const builds: Record<BuildMode, ClassBuild[]> = { pvm: [], pvp: [] }
  const pieces: ConvertedPage['pieces'] = []
  const oddities = [...page.oddities]
  let mode: BuildMode | null = null
  for (const piece of page.pieces) {
    if (piece.type === 'html') {
      const next = buildMode(piece.html)
      if (next) {
        mode = next
        continue
      }
      // Un texto después de las builds acaba su lista: lo que siga ya no es una build.
      if (mode) oddities.push(`Texto tras las builds de ${mode.toUpperCase()}: va al texto`)
      mode = null
    }
    if (piece.type === 'image' && mode) {
      builds[mode].push({ url: piece.url, alt: piece.alt, ...(piece.link && { link: piece.link }) })
      continue
    }
    if (piece.type === 'video' && mode) {
      oddities.push(`Vídeo entre las builds de ${mode.toUpperCase()}: va al texto`)
    }
    pieces.push(piece)
  }
  return { ...page, pieces, builds, oddities }
}
