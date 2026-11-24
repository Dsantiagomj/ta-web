// Adónde lleva un enlace del texto enriquecido de Torre. Código puro: lo usan la prosa de las
// guías (src/components/game/GuideRichText.tsx) y la ficha de la guía de Dofus, que pinta un
// prerrequisito que es solo un enlace como una fila de misión (src/lib/dofus-guides/page.ts).

import { isPlaceholderHref } from '@/lib/site/site-links'

/** Solo enlaces web, de correo o del propio sitio; cualquier otro protocolo se descarta. */
export function safeHref(url: unknown): string | null {
  if (typeof url !== 'string' || !url.trim()) return null
  const href = url.trim()
  if (href.startsWith('/') || href.startsWith('#')) return href.startsWith('//') ? null : href
  try {
    return ['http:', 'https:', 'mailto:'].includes(new URL(href).protocol) ? href : null
  } catch {
    return null
  }
}

export interface LinkFields {
  url?: string
  newTab?: boolean
  linkType?: 'custom' | 'internal'
  doc?: { relationTo?: string; value?: unknown }
}

// Un enlace interno a otra guía lleva a su página; a cualquier otra cosa, todavía a nada. Los
// enlaces de Torre a su propia web llegan ya resueltos por la página (withSiteLinks,
// src/lib/site/site-links.ts): relativos si el sitio sirve esa ruta. Las coordenadas que
// Squarespace dejó enlazadas a la propia guía con un «#» vacío no llevan a ninguna parte, así
// que quedan como texto.
export function linkHref(fields: LinkFields): string | null {
  if (fields.linkType !== 'internal') {
    const href = safeHref(fields.url)
    return href && !isPlaceholderHref(href) ? href : null
  }
  const value = fields.doc?.value
  if (fields.doc?.relationTo !== 'quest-guides' || !value || typeof value !== 'object') return null
  const slug = (value as { slug?: unknown }).slug
  return typeof slug === 'string' ? `/${slug}` : null
}
