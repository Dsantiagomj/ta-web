// Las checklists de Torre, en el orden del hub de silvestre-checklist (src/embeds/hub/
// manifest.js), con el arte de su tarjeta en ese hub (pnpm import:checklist-cards). Las que tienen `ported` se traen enteras (y siguen En preparación hasta que
// Torre las publique); las demás se crean En preparación, sin pasos, con su enlace a
// Squarespace. Las descripciones no llevan cifras:
// cambian con la guía.

import type { CardArt } from './cards'

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
  /**
   * Una checklist de almas (el Ocre): sus filas salen de las almas que pide `soulsQuest` (su ID
   * de DofusDB) y de sus monstruos, no de pasos.
   */
  kind?: 'souls'
  soulsQuest?: number
  /** El arte de su tarjeta en el índice, el del hub antiguo (pnpm import:checklist-cards). */
  card?: CardArt
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
    card: {
      scene: { path: 'zones/reino-de-amakna.jpg', alt: 'El Reino de Amakna' },
      npc: { path: 'hub/silvosse.png', alt: 'Silvosse' },
    },
  }),
  entry({
    id: 'hielos',
    slug: 'checklist-dofus-de-los-hielos',
    name: 'Dofus de los Hielos',
    description: 'Los misterios de la isla de Frigost, hasta el temible Conde Kontatrás.',
    order: 2,
    dofusGuide: 'dofus-de-los-hielos',
    ported: true,
    card: {
      scene: { path: 'zones/isla-de-frigost.jpg', alt: 'La isla de Frigost' },
      // Su imagen es cuadrada y la figura estrecha: más grande y más a la derecha, que asome.
      npc: { path: 'hub/conde-kontatras.png', alt: 'El Conde Kontatrás' },
      npcFit: { height: 70, right: -30, top: 4 },
    },
  }),
  entry({
    id: 'nebuloso',
    slug: 'checklist-nebuloso',
    name: 'Dofus Nebuloso',
    description: 'Anutropía, Sramvil y Xelorium, con el Dofus de los Vigilantes por el camino.',
    order: 3,
    dofusGuide: 'misiones-nebuloso',
    ported: true,
    card: {
      scene: { path: 'zones/xelorium.jpg', alt: 'Xelorium' },
      // Khelebragón, a quien libera «En busca del pájaro del tiempo», la misión del último paso.
      npc: { path: 'hub/khelebragon.png', alt: 'Khelebragón' },
      npcFit: { height: 72, right: -30, top: 4 },
    },
  }),
  entry({
    id: 'ocre',
    slug: 'lista-ocre',
    name: 'Dofus Ocre',
    description: 'Las almas de la eterna cosecha, una a una, hasta el Dofus Ocre.',
    order: 4,
    dofusGuide: 'dofus-ocre',
    ported: true,
    // «La eterna cosecha»: las 337 almas, de los objetivos que guarda la misión.
    kind: 'souls',
    soulsQuest: 439,
    card: {
      scene: { path: 'zones/pueblo-de-la-canopea.jpg', alt: 'El Pueblo de la Canopea' },
      // Otomai, el sabio de su isla: su asistente recibe las almas de «La eterna cosecha».
      npc: { path: 'hub/otomai.png', alt: 'Otomai' },
      npcFit: { height: 74, right: -40, top: 6 },
    },
  }),
]

/** Si se traen sus pasos de silvestre-checklist (src/dofus/<id>/steps.js): las de almas no tienen. */
export const hasLegacySteps = (entry: ChecklistCatalogEntry): boolean =>
  entry.ported && entry.kind !== 'souls'
