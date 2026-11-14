// Las checklists de Torre, en el orden del hub de silvestre-checklist (src/embeds/hub/
// manifest.js). Las que tienen `ported` se traen enteras (y siguen En preparación hasta que
// Torre las publique); las demás se crean En preparación, sin pasos, con su enlace a
// Squarespace. Las descripciones no llevan cifras:
// cambian con la guía.

const SITE = 'https://www.torrentearcano.com'

export interface ChecklistCatalogEntry {
  /** El nombre del Dofus en silvestre-checklist (src/dofus/<id>/). */
  id: string
  slug: string
  name: string
  description: string
  order: number
  /** El slug de la guía de su Dofus en dofus-guides. */
  dofusGuide: string
  legacyHref: string
  /** Si se trae entera desde silvestre-checklist. */
  ported: boolean
}

const entry = (fields: Omit<ChecklistCatalogEntry, 'legacyHref'>): ChecklistCatalogEntry => ({
  ...fields,
  legacyHref: `${SITE}/${fields.slug}`,
})

export const CHECKLIST_CATALOG: ChecklistCatalogEntry[] = [
  entry({
    id: 'silvestre',
    slug: 'checklist-silvestre',
    name: 'Dofus Silvestre',
    description: 'Todo el Mundo de los Doce con la guía de Sandglass, hasta Silvosse.',
    order: 1,
    dofusGuide: 'dofus-silvestre',
    ported: true,
  }),
  entry({
    id: 'hielos',
    slug: 'checklist-dofus-de-los-hielos',
    name: 'Dofus de los Hielos',
    description: 'Los misterios de la isla de Frigost, hasta el temible Conde Kontatrás.',
    order: 2,
    dofusGuide: 'dofus-de-los-hielos',
    ported: false,
  }),
  entry({
    id: 'nebuloso',
    slug: 'checklist-nebuloso',
    name: 'Dofus Nebuloso',
    description: 'Anutropía, Sramvil y Xelorium, con el Dofus de los Vigilantes por el camino.',
    order: 3,
    dofusGuide: 'misiones-nebuloso',
    ported: true,
  }),
  entry({
    id: 'ocre',
    slug: 'lista-ocre',
    name: 'Almas del Ocre',
    description: 'Las almas de la eterna cosecha, una a una, hasta el Dofus Ocre.',
    order: 4,
    dofusGuide: 'dofus-ocre',
    ported: false,
  }),
]
