// Los datos estructurados (JSON-LD) de las páginas de /<slug> (backlog S-19, AGENTS.md, SEO).
// Un Article por guía de misión, logro, guía de Dofus y página suelta; no HowTo, cuyos
// resultados enriquecidos quitó Google. Las migas van en src/components/site/Breadcrumb.tsx.
// Código puro.

import { shareStrings } from './strings'

/**
 * El logo del editor: el emblema en Amakna oscuro, 512 × 512, de scripts/build-icons.ts. No el
 * icono de iOS, que Next sirve con un hash en el nombre.
 */
const LOGO = { path: '/img/marca/logo.png', size: 512 }

/** Google corta el titular a 110 letras. */
const HEADLINE_MAX = 110

export interface ArticleInput {
  siteUrl: string
  siteName: string
  /** La ruta de la página, «/la-ocasion». */
  path: string
  headline: string
  description: string
  /** La imagen al compartir, ruta u origen absoluto. */
  image: string
  published: string | null
  modified: string | null
  /** Las redes de Torre («Ajustes del sitio»). */
  sameAs: string[]
}

const absolute = (siteUrl: string, path: string) =>
  /^https?:\/\//.test(path) ? path : `${siteUrl}${path.startsWith('/') ? '' : '/'}${path}`

const clip = (text: string, max: number) =>
  text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`

export function articleJsonLd(input: ArticleInput) {
  const url = absolute(input.siteUrl, input.path)
  const home = `${input.siteUrl}/`
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: clip(input.headline, HEADLINE_MAX),
    description: input.description,
    image: [absolute(input.siteUrl, input.image)],
    ...(input.published && { datePublished: input.published }),
    ...(input.modified && { dateModified: input.modified }),
    inLanguage: 'es',
    url,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    author: { '@type': 'Person', name: shareStrings.author, url: home, sameAs: input.sameAs },
    publisher: {
      '@type': 'Organization',
      name: input.siteName,
      url: home,
      logo: {
        '@type': 'ImageObject',
        url: absolute(input.siteUrl, LOGO.path),
        width: LOGO.size,
        height: LOGO.size,
      },
    },
  }
}

/** El JSON-LD dentro de <script>: sin «<», para que ningún nombre pueda cerrar la etiqueta. */
export function jsonForScript(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c')
}
