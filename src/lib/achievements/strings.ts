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
    noCategory: 'Sin categoría de DofusDB: escribe tú este dato.',
    alternatives: (name: string, count: number) => `${name} (una de ${count})`,
    stateDescription:
      'Publicada: se ve y se puede abrir. En preparación: se ve apagada, sin enlace, con la ' +
      'etiqueta «En preparación». Lo decides tú; el refresco de DofusDB no lo cambia.',
    slugTaken: (slug: string, owner: string) =>
      `/${slug} ya es la página de ${owner}: elige otro slug.`,
  },
} as const
