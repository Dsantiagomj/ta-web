// Los grupos de Necesitarás de las guías de Dofus: una lista fija, en el orden de las guías
// que Torre tiene bien ordenadas (Domakuro, Moteado, Vulbis: combates, mazmorras, recursos y
// lo demás). El panel la ofrece para elegir, la página pinta los grupos en este orden y la
// importación (scripts/import/dofus-guides/normalize-needs.ts) reparte las filas en ella.
// Código puro.
import { dofusNeedGroupLabels } from './strings'

export const NEED_GROUPS = [
  'combates',
  'mazmorras',
  'recursos',
  'equipables',
  'consumibles',
  'oficios',
  'emotes',
  'logros',
  'otros',
] as const

export type NeedGroup = (typeof NEED_GROUPS)[number]

export const needGroupLabel = (group: NeedGroup): string => dofusNeedGroupLabels[group]

/** Las opciones del campo del panel: el valor y su nombre en español. */
export const needGroupOptions = NEED_GROUPS.map((value) => ({
  value,
  label: needGroupLabel(value),
}))

/** Para ordenar grupos por la lista fija. */
export const byNeedGroup = (a: { name: NeedGroup }, b: { name: NeedGroup }) =>
  NEED_GROUPS.indexOf(a.name) - NEED_GROUPS.indexOf(b.name)

export const isNeedGroup = (value: unknown): value is NeedGroup =>
  NEED_GROUPS.includes(value as NeedGroup)

/** Sin mayúsculas, tildes, cantidad («1 x») ni signos: para comparar títulos. */
function headingKey(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLocaleLowerCase('es')
    .replace(/^\s*\d+\s*[x×]\s+/u, '')
    .replace(/[^a-z\s]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

// Cada grupo por su nombre y su singular: «Mazmorra» también es «Mazmorras».
const BY_HEADING = new Map<string, NeedGroup>(
  NEED_GROUPS.flatMap((group) => {
    const key = headingKey(needGroupLabel(group))
    return [key, key.replace(/s$/, '')].map((form) => [form, group] as const)
  }),
)

/**
 * El grupo que nombra un título de Torre («Combates», «1 x Mazmorra:»), o null si no es uno
 * de la lista: «Recursos y otras movidas» mezcla varios.
 */
export function headingGroup(heading: string | null | undefined): NeedGroup | null {
  if (!heading?.trim()) return null
  return BY_HEADING.get(headingKey(heading)) ?? null
}

// Los supertipos de objeto de DofusDB (item-super-types).
const RESOURCES = new Set([9])
const CONSUMABLES = new Set([6, 70])
// Amuleto, arma, anillo, cinturón, botas, escudo, sombrero, capa, mascota (también los
// dragopavos) y Dofus o trofeo.
const EQUIPMENT = new Set([1, 2, 3, 4, 5, 7, 10, 11, 12, 13])

/** El grupo de un objeto por su supertipo en DofusDB; null si no es ninguno de los tres. */
export function itemGroup(superTypeId: number | null | undefined): NeedGroup | null {
  if (superTypeId == null) return null
  if (RESOURCES.has(superTypeId)) return 'recursos'
  if (CONSUMABLES.has(superTypeId)) return 'consumibles'
  if (EQUIPMENT.has(superTypeId)) return 'equipables'
  return null
}
