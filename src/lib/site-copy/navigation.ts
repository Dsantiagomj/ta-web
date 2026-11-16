// «Navegación» (src/globals/Navigation.ts): lo que la web pinta de las secciones del menú y
// de los Dofus destacados, lo que acepta el panel al guardar y lo que llena pnpm
// seed:site-copy. Lo que Torre escribió y, donde no escribió nada, lo de siempre
// (navigationDefaults). Código puro.

import { DOFUS_FEATURED, type GameImage, navSection, type Section } from '@/components/site/nav'
import { dofusEgg } from '@/lib/dofus-guides/egg'
import { mediaImageAsset } from '@/lib/media/image-asset'

import {
  NAV_SECTION_KEYS,
  type NavSectionRow,
  navigationDefaults,
  type SectionKey,
} from './defaults'
import { asRecord, filled } from './resolve'
import { siteCopyStrings } from './strings'

const s = siteCopyStrings.navigation

/** Los huevos del menú se pintan a 60px como mucho: basta su archivo de 128px. */
const EGG_SIZE = 128

/** Los textos de una sección, con su campo en el panel. */
const TEXT_FIELDS = ['label', 'title', 'description'] as const

const DEFAULT_ROWS = new Map(navigationDefaults.sections.map((row) => [row.key, row]))

const isKey = (value: unknown): value is SectionKey =>
  (NAV_SECTION_KEYS as readonly unknown[]).includes(value)

const keyOf = (row: unknown) => asRecord(row).key

const sectionName = (key: SectionKey) => `«${DEFAULT_ROWS.get(key)!.title}»`

const names = (keys: SectionKey[]) => keys.map(sectionName).join(', ')

/**
 * Las filas guardadas en el orden de Torre, una por sección: la primera de cada una cuenta y
 * una desconocida no. Una sección que falta va al final, en el orden de siempre.
 */
function orderedRows(stored: unknown): { row: Record<string, unknown>; key: SectionKey }[] {
  const seen = new Set<SectionKey>()
  const rows: { row: Record<string, unknown>; key: SectionKey }[] = []
  for (const row of Array.isArray(stored) ? stored : []) {
    const key = keyOf(row)
    if (!isKey(key) || seen.has(key)) continue
    seen.add(key)
    rows.push({ row: asRecord(row), key })
  }
  for (const key of NAV_SECTION_KEYS) if (!seen.has(key)) rows.push({ row: {}, key })
  return rows
}

/** Una fila con lo de siempre donde Torre no escribió o no marcó nada. */
function withRowDefaults(row: Record<string, unknown>, key: SectionKey): NavSectionRow {
  const defaults = DEFAULT_ROWS.get(key)!
  const text = (field: (typeof TEXT_FIELDS)[number]) =>
    filled(row[field]) ? row[field] : defaults[field]
  const flag = (field: 'visible' | 'soon') =>
    typeof row[field] === 'boolean' ? row[field] : defaults[field]
  return {
    key,
    label: text('label'),
    title: text('title'),
    description: text('description'),
    visible: flag('visible'),
    soon: flag('soon'),
  }
}

/** El huevo de una guía de Dofus elegida, si está poblada y tiene uno. */
function featuredEgg(guide: unknown): GameImage | null {
  if (!guide || typeof guide !== 'object') return null
  const egg = mediaImageAsset(dofusEgg(guide as Parameters<typeof dofusEgg>[0]))
  return egg ? { src: egg.src, size: EGG_SIZE } : null
}

export interface SiteNavigation {
  /** Las secciones que salen, en el orden de Torre. */
  sections: Section[]
  /** Los huevos de la tarjeta de las guías de Dofus del menú. */
  featured: GameImage[]
}

/**
 * Lo que pintan el menú, el móvil, el pie y la portada. Las guías destacadas llegan pobladas
 * como las ve un visitante: una sin publicar o sin huevo no sale y, sin ninguna, los tres
 * huevos de siempre.
 */
export function resolveNavigation(stored: unknown): SiteNavigation {
  const doc = asRecord(stored)
  const sections = orderedRows(doc.sections)
    .map(({ row, key }) => withRowDefaults(row, key))
    .filter((row) => row.visible)
    .map(navSection)
  const picks = Array.isArray(doc.featuredDofus) ? doc.featuredDofus : []
  const eggs = picks.map(featuredEgg).filter((egg): egg is GameImage => egg !== null)
  return { sections, featured: eggs.length ? eggs : DOFUS_FEATURED }
}

/** Al guardar: cada sección, una vez. Para quitar una, se desmarca «Sale en la web». */
export function validateNavSections(value: unknown): true | string {
  const keys = (Array.isArray(value) ? value : []).map(keyOf)
  const missing = NAV_SECTION_KEYS.filter((key) => !keys.includes(key))
  if (missing.length) return s.errors.missing(names(missing))
  const repeated = NAV_SECTION_KEYS.filter((key) => keys.indexOf(key) !== keys.lastIndexOf(key))
  if (repeated.length) return s.errors.repeated(names(repeated))
  return keys.every(isKey) ? true : s.errors.missing(names([...NAV_SECTION_KEYS]))
}

/** Al guardar: los tres Dofus de la tarjeta, o ninguno. */
export function validateFeaturedDofus(value: unknown): true | string {
  const count = Array.isArray(value) ? value.length : 0
  return count === 0 || count === 3 ? true : s.errors.featured
}

/** Una guía de Dofus de la base, para elegir los destacados de siempre por su slug. */
export interface FeaturedGuide {
  id: number
  slug: string
  name: string
}

export interface NavigationSeed {
  /** Lo que se llena, con su camino y su valor. */
  fills: { path: string; value: string }[]
  /** Lo que la carga no pudo hacer. */
  notes: string[]
  /** El global entero, con lo de Torre tal cual y lo vacío lleno. */
  data: { sections: Record<string, unknown>[]; featuredDofus: number[] }
}

const relationId = (value: unknown) =>
  typeof value === 'number' ? value : (asRecord(value).id as number | undefined)

/**
 * pnpm seed:site-copy: lo de siempre en cada texto vacío de las secciones, las secciones que
 * falten al final y, sin destacados elegidos, las guías de los tres de siempre por su slug
 * (solo si están las tres). Lo que Torre escribió, marcó u ordenó se queda.
 */
export function navigationSeed(stored: unknown, guides: FeaturedGuide[]): NavigationSeed {
  const doc = asRecord(stored)
  const fills: NavigationSeed['fills'] = []
  const notes: string[] = []
  const sections = orderedRows(doc.sections).map(({ row, key }) => {
    const defaults = DEFAULT_ROWS.get(key)!
    for (const field of TEXT_FIELDS) {
      if (defaults[field] && !filled(row[field])) {
        fills.push({ path: `sections.${key}.${field}`, value: defaults[field] })
      }
    }
    return { ...(row.id !== undefined && { id: row.id }), ...withRowDefaults(row, key) }
  })

  let featuredDofus = (Array.isArray(doc.featuredDofus) ? doc.featuredDofus : [])
    .map(relationId)
    .filter((id): id is number => typeof id === 'number')
  if (!featuredDofus.length) {
    const bySlug = new Map(guides.map((guide) => [guide.slug, guide]))
    const picks = navigationDefaults.featuredDofus.map((slug) => bySlug.get(slug))
    const missing = navigationDefaults.featuredDofus.filter((slug) => !bySlug.has(slug))
    if (missing.length) {
      notes.push(s.seed.missingGuide(missing.map((slug) => `«${slug}»`).join(', ')))
    } else {
      featuredDofus = picks.map((guide) => guide!.id)
      fills.push({ path: 'featuredDofus', value: picks.map((guide) => guide!.name).join(', ') })
    }
  }
  return { fills, notes, data: { sections, featuredDofus } }
}
