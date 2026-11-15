// Una página suelta de Torre en Squarespace, lista para la colección pages: su texto tal
// cual, sus capturas y sus vídeos en su orden, y el SEO que escribió en Squarespace. Nada se
// pierde, se junta ni se reescribe: solo su primer encabezado pasa a ser el título, y solo si
// el título del catálogo es ese encabezado con otras mayúsculas. Código puro, salvo el DOM de
// happy-dom (squarespace/dom.ts), que suelta quien llama.
import { siteHref } from '../dofus-guides/site-links'
import { normalizedText, parseHtml } from '../squarespace/dom'
import { parsePage, type TextElement } from '../squarespace/parse-page'
import type { PageEntry } from './catalog'

export type PagePiece =
  | { type: 'html'; html: string }
  | { type: 'image'; url: string; alt: string }
  | { type: 'video'; url: string; title?: string }

export interface ConvertedPage {
  title: string
  pieces: PagePiece[]
  /** Lo que Torre escribió en el SEO de Squarespace; vacío si no escribió nada. */
  seo: { metaTitle?: string; metaDescription?: string }
  /** Lo que no encajó, para revisarlo en el panel. */
  oddities: string[]
}

/** La descripción SEO más larga que guarda la colección. */
const DESCRIPTION_MAX = 160

// Squarespace añade el nombre del sitio al título de la pestaña: «AVISO LEGAL — Torrente Arcano».
const SITE_SUFFIX = /\s*[—–-]\s*Torrente Arcano\s*$/u

const HEADING = /^h[1-6]$/

/** El texto de un trozo de HTML de la cabecera, con sus entidades (&mdash;, &quot;) resueltas. */
const decoded = (raw: string) => normalizedText(parseHtml(`<p>${raw}</p>`).body)

/** Lo que Torre escribió en el SEO de Squarespace, si no es el título de la página. */
function squarespaceSeo(html: string, pageTitle: string | null, oddities: string[]) {
  const seo: ConvertedPage['seo'] = {}
  const title = /<title>([\s\S]*?)<\/title>/u.exec(html)?.[1]
  const metaTitle = title ? decoded(title).replace(SITE_SUFFIX, '') : ''
  if (metaTitle && metaTitle !== pageTitle?.trim()) seo.metaTitle = metaTitle
  const description = /<meta name="description" content="([^"]*)"/u.exec(html)?.[1]
  const metaDescription = description ? decoded(description) : ''
  if (metaDescription.length > DESCRIPTION_MAX) {
    oddities.push('La descripción SEO de Squarespace pasa de 160 caracteres: no se importa')
  } else if (metaDescription) {
    seo.metaDescription = metaDescription
  }
  return seo
}

/** Un párrafo sin texto ni imagen: el hueco que Torre dejaba junto a una captura. */
function isSpacer(element: TextElement): boolean {
  return element.text === '' && !/<(img|iframe|video)\b/iu.test(element.html)
}

const ANCHOR_HREF = /(<a\b[^>]*?\bhref=")([^"]*)(")/giu

/** Sus enlaces a su propia web, relativos solo si este sitio ya enseña la página. */
function withSiteLinks(html: string, live: (slug: string) => boolean): string {
  return html.replace(ANCHOR_HREF, (_, before: string, href: string, after: string) => {
    const resolved = siteHref(href.replace(/&amp;/gu, '&'), live)
    return `${before}${resolved.replace(/&/gu, '&amp;')}${after}`
  })
}

/**
 * La página de Squarespace (su HTML) con el título del catálogo. live dice si este sitio
 * enseña /<slug>, para sus enlaces.
 */
export function convertPage(
  html: string,
  entry: PageEntry,
  live: (slug: string) => boolean,
): ConvertedPage {
  const page = parsePage(html)
  const oddities: string[] = []
  const pieces: PagePiece[] = []
  const addHtml = (markup: string) => {
    const last = pieces.at(-1)
    if (last?.type === 'html') last.html += markup
    else pieces.push({ type: 'html', html: markup })
  }

  let first = true
  for (const block of page.blocks) {
    if (block.type === 'unknown') {
      oddities.push(`Bloque de Squarespace sin convertir: ${block.sqspType}`)
      continue
    }
    if (block.type !== 'text') {
      first = false
      pieces.push(block)
      continue
    }
    for (const element of block.elements) {
      if (isSpacer(element)) continue
      if (first) {
        first = false
        if (HEADING.test(element.tag)) {
          if (element.text.toLocaleLowerCase('es') === entry.title.toLocaleLowerCase('es')) continue
          oddities.push(
            `El título «${entry.title}» no es el encabezado de Torre («${element.text}»): ` +
              'el encabezado se queda en el texto',
          )
        } else {
          oddities.push('La página no empieza por un encabezado: el título sale del catálogo')
        }
      }
      addHtml(withSiteLinks(element.html, live))
    }
  }

  return { title: entry.title, pieces, seo: squarespaceSeo(html, page.title, oddities), oddities }
}
