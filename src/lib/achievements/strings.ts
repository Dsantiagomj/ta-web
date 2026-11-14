import { formatAmount } from '../guides/display'
import { indexIslandStrings } from './index-strings'

// Textos de las páginas de logro y de los metalogros: el panel, la página del logro y el
// índice de metalogros.
// Un segundo idioma sería traducir este módulo.

/** Las tres partes del índice de metalogros. */
export type GroupSection = 'stories' | 'zones' | 'seasonal'

/** Si la página se ve en el sitio: lo decide Torre, nunca el refresco de DofusDB. */
export const PAGE_STATES = ['published', 'preparing'] as const
export type PageState = (typeof PAGE_STATES)[number]

/** Si un valor es uno de los estados de «Visible en la web». */
export const isPageState = (value: unknown): value is PageState =>
  PAGE_STATES.includes(value as PageState)

export const achievementStrings = {
  sections: {
    stories: 'Misiones generales e historias',
    zones: 'Zonas',
    seasonal: 'Eventos de temporada',
  } satisfies Record<GroupSection, string>,
  states: {
    published: 'Publicada',
    preparing: 'En preparación',
  } satisfies Record<PageState, string>,
  admin: {
    /** Las pestañas del formulario (A-22). */
    tabs: { quests: 'Misiones', text: 'Texto', rewards: 'Recompensas' },
    noAchievement: 'Sin logro de DofusDB: escribe tú este dato.',
    nameRequired: 'Escribe un nombre o enlaza el dato de DofusDB.',
    noCategory: 'Sin categoría de DofusDB: escribe tú este dato.',
    alternatives: (name: string, count: number) => `${name} (una de ${count})`,
    stateDescription:
      'Publicada: se ve y se puede abrir. En preparación: se ve apagada, sin enlace, con la ' +
      'etiqueta «En preparación». Lo decides tú; el refresco de DofusDB no lo cambia. ' +
      'Además, pulsa «Publicar cambios» arriba para que lo que cambies salga en la web.',
    slugTaken: (slug: string, owner: string) =>
      `/${slug} ya es la página de ${owner}: elige otra dirección.`,
  },
} as const

/** La página del logro, /<slug> (DESIGN.md, Achievement page). */
export const achievementPageStrings = {
  quests: (count: number) => (count === 1 ? '1 misión' : `${count} misiones`),
  /** La palabra sola, cuando la cifra va aparte en negrita. */
  questsWord: (count: number) => (count === 1 ? 'misión' : 'misiones'),
  levels: (min: number, max: number) => (min === max ? `Nivel ${min}` : `Niveles ${min} a ${max}`),
  points: (count: number) => (count === 1 ? '1 punto' : `${count} puntos`),
  pointsWord: (count: number) => (count === 1 ? 'punto' : 'puntos'),
  metaSeparator: ' - ',
  index: 'Metalogros',
  needsTotal: 'Necesitarás en total',
  rewards: 'Recompensas del logro',
  questsHeading: 'Las misiones, en orden',
  questKicker: (position: number, level?: number) =>
    level ? `Misión ${position} - Nivel ${level}` : `Misión ${position}`,
  /** Bajo el título de la misión, en la lista numerada: el número ya dice su lugar. */
  questLevel: (level: number) => `Nivel ${level}`,
  needsGroups: {
    items: 'Objetos',
    tasks: 'Combates y mazmorras',
    // Provisional: Torre puede cambiarlo.
    others: 'Otros',
  },
  countsFor: 'Cuenta para',
  countsForLine: (achievements: number) => `Pide ${achievements} logros.`,
  previous: 'Logro anterior',
  next: 'Siguiente logro',
  navLabel: (group: string) => `Logros de ${group}`,
  preparing: 'En preparación',
  seo: {
    title: (name: string) => `${name}: logro de Dofus`,
    description: (name: string, quests: number) =>
      `Las ${quests} misiones del logro ${name} de Dofus, en orden, con la guía de cada una, ` +
      'lo que necesitas y las recompensas.',
  },
} as const

/** El índice de metalogros, /metalogros (DESIGN.md, Metalogros index). */
export const metalogrosStrings = {
  ...indexIslandStrings,
  title: 'Todos los metalogros',
  lead: 'Busca una zona, un logro o una misión, o elige una zona para ver sus logros.',
  zones: (count: number) => (count === 1 ? '1 zona' : `${formatAmount(count)} zonas`),
  achievements: (count: number) => (count === 1 ? '1 logro' : `${formatAmount(count)} logros`),
  quests: (count: number) => (count === 1 ? '1 misión' : `${formatAmount(count)} misiones`),
  questResult: (position: number, achievement: string, zone: string) =>
    `→ misión ${position} de ${achievement} · ${zone}`,
  level: (level: number) => `Niv. ${level}`,
  levels: (min: number, max: number) => `Niv. ${min}–${max}`,
  prepPartial: (missing: number, total: number) =>
    `En preparación: ${missing} de sus ${total} logros`,
  sectionDescriptions: {
    stories: 'Las que no son de una zona, en el orden del juego.',
    zones: 'De la A a la Z.',
    seasonal: 'Islas que solo abren en su época del año.',
  } satisfies Record<GroupSection, string>,
  otherGuides: 'Otras guías',
  guides: 'Guías',
  searchLabel: 'Busca una zona, un logro o una misión',
  searchPlaceholder: 'Por ejemplo, Esto hace aguas',
  results: 'Resultados',
  seo: {
    title: 'Todos los metalogros de Dofus',
    description:
      'Los metalogros de Dofus por zona, con sus logros y sus misiones en orden. Busca una ' +
      'zona, un logro o una misión.',
  },
} as const
