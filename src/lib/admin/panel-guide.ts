import type { CollectionConfig } from 'payload'

import { panelStrings } from './strings'

// La «Guía del panel» (A-14, src/components/admin/PanelGuide.tsx) y la línea que describe
// cada colección arriba de su lista. Los textos están en strings.ts.

/** Dónde vive la guía, bajo la ruta del panel: /admin/guia (payload.config.ts). */
export const PANEL_GUIDE_PATH = '/guia'

type DescribedCollection = keyof typeof panelStrings.collections

/** Pone a cada colección su línea de panelStrings.collections. */
export function withPanelDescriptions(collections: CollectionConfig[]): CollectionConfig[] {
  return collections.map((collection) => {
    const description = panelStrings.collections[collection.slug as DescribedCollection]
    return description ? { ...collection, admin: { ...collection.admin, description } } : collection
  })
}

/**
 * Cómo sale en la web lo publicado «En preparación», una línea por caso, con los mismos
 * textos que la línea «En la web» de cada página (A-16).
 */
export function preparingOnSite(): string[] {
  const { preparing } = panelStrings.publishStatus
  return panelStrings.guide.preparingCases.map(
    ({ label, key }) => `${label}: ${preparing[key].text.replace(/^En la web: /, '')}.`,
  )
}
