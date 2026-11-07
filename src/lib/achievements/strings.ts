// Textos de las páginas de logro y de los metalogros: el panel y, más adelante, la página.
// Un segundo idioma sería traducir este módulo.

/** Las tres partes del índice de metalogros. */
export type GroupSection = 'stories' | 'zones' | 'seasonal'

/** Si la página se ve en el sitio: lo decide Torre, nunca el refresco de DofusDB. */
export type PageState = 'published' | 'preparing'

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
    noAchievement: 'Sin logro de DofusDB: escribe tú este dato.',
    nameRequired: 'Escribe un nombre o enlaza el dato de DofusDB.',
    noCategory: 'Sin categoría de DofusDB: escribe tú este dato.',
    alternatives: (name: string, count: number) => `${name} (una de ${count})`,
    stateDescription:
      'Publicada: se ve y se puede abrir. En preparación: se ve apagada, sin enlace, con la ' +
      'etiqueta «En preparación». Lo decides tú; el refresco de DofusDB no lo cambia.',
    slugTaken: (slug: string, owner: string) =>
      `/${slug} ya es la página de ${owner}: elige otro slug.`,
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
  group: (name: string) => `Metalogro ${name}`,
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
