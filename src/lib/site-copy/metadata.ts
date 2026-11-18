import type { Metadata } from 'next'

import { siteShareImage } from '../seo/share-card'
import type { IndexSeo } from './defaults'
import type { SiteSettings } from './resolve'

/** Lo que comparte toda página al compartirse: el nombre del sitio y el idioma. */
export function openGraphDefaults(settings: SiteSettings) {
  return { siteName: settings.name, locale: 'es_ES' }
}

/**
 * La imagen al compartir la portada y los índices (backlog S-19): la de «Ajustes del sitio» si
 * Torre subió una; si no, la tarjeta de la marca (/og). Las páginas de /<slug> llevan la suya.
 */
function siteImages(settings: SiteSettings): Pick<Metadata, 'twitter'> & {
  images: ReturnType<typeof siteShareImage>[]
} {
  const image = siteShareImage(settings.ogImage, settings.name)
  return { images: [image], twitter: { card: 'summary_large_image', images: [image] } }
}

/** Los metadatos del layout: los de la portada y los que hereda cualquier página. */
export function siteMetadata(settings: SiteSettings): Metadata {
  const { images, twitter } = siteImages(settings)
  return {
    title: settings.name,
    description: settings.description,
    openGraph: { type: 'website', ...openGraphDefaults(settings), images },
    twitter,
  }
}

/** Los metadatos de un índice (/metalogros, /guias-dofus, /checklists), de «Portada e índices». */
export function indexMetadata(path: string, seo: IndexSeo, settings: SiteSettings): Metadata {
  const { images, twitter } = siteImages(settings)
  return {
    title: seo.title,
    description: seo.description,
    alternates: { canonical: path },
    openGraph: {
      type: 'website',
      title: seo.title,
      description: seo.description,
      url: path,
      ...openGraphDefaults(settings),
      images,
    },
    twitter,
  }
}
