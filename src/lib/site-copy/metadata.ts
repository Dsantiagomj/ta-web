import type { Metadata } from 'next'

import type { IndexSeo } from './defaults'
import type { SiteSettings } from './resolve'

/** Lo que comparte toda página al compartirse: el nombre del sitio y la imagen de Torre. */
export function openGraphDefaults(settings: SiteSettings) {
  return {
    siteName: settings.name,
    locale: 'es_ES',
    ...(settings.ogImage && { images: [settings.ogImage] }),
  }
}

/** Los metadatos del layout: los de la portada y los que hereda cualquier página. */
export function siteMetadata(settings: SiteSettings): Metadata {
  return {
    title: settings.name,
    description: settings.description,
    openGraph: { type: 'website', ...openGraphDefaults(settings) },
  }
}

/** Los metadatos de un índice (/metalogros, /guias-dofus, /checklists), de «Portada e índices». */
export function indexMetadata(path: string, seo: IndexSeo, settings: SiteSettings): Metadata {
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
    },
  }
}
