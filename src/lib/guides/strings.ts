// Textos de las guías de misiones: el resumen sacado de DofusDB, el SEO que se rellena
// solo y lo que ve Torre en el panel. Un segundo idioma sería traducir este módulo.

export const guideStrings = {
  summary: {
    /** Cada línea del resumen acaba en punto, como en las guías de Torre, salvo si ya cierra. */
    line: (text: string) => (/[.!?…]$/.test(text) ? text : `${text}.`),
    // Las cifras llegan ya con los miles separados
    experience: (amount: string) => `${amount} XP`,
    kamas: (amount: string) => `${amount} kamas`,
    quantity: (quantity: number, name: string) => `${quantity} x ${name}`,
    requiredLevel: (level: number) => `Nivel mínimo ${level}`,
    walksMaps: 'Caminar mapas',
  },
  seo: {
    metaTitle: (name: string) => `${name}: guía de la misión de Dofus`,
    metaDescription: ({
      name,
      level,
      experience,
    }: {
      name: string
      level: number | null
      experience: string | null
    }) =>
      `Guía paso a paso de la misión ${name} de Dofus${level ? `, de nivel ${level}` : ''}: ` +
      `requisitos, recompensas${experience ? ` (${experience} XP)` : ''} ` +
      'y cómo completarla.',
  },
  /** Slug de reserva cuando el nombre de la misión no deja ni una letra. */
  fallbackSlug: 'guia',
  admin: {
    questsDescription:
      'Elige primero la misión de DofusDB: rellena el título, el slug, el SEO y el resumen. ' +
      'Luego solo te queda escribir la guía.',
    titleDescription: 'Si lo dejas vacío, se usa el nombre de la misión.',
    slugDescription:
      'La URL de la guía, como aprendizaje-escudero. Si la dejas vacía, sale del nombre de la misión.',
    summaryDescription:
      'Vacío significa que se muestra lo que da DofusDB, que ves debajo de cada campo. ' +
      'Escribe solo para cambiarlo.',
    seoDescription:
      'Se rellena solo desde la misión si lo dejas vacío. Puedes cambiarlo cuando quieras.',
    titleRequired: 'Escribe un título o elige una misión de DofusDB para sacarlo de ella.',
    inherited: (value: string) => `De DofusDB: ${value}`,
    inheritedEmpty: 'DofusDB no da nada aquí.',
    inheritedLoading: 'Cargando los datos de DofusDB…',
    inheritedUnavailable: 'No se pudieron cargar los datos de DofusDB.',
    noQuest: 'Sin misión de DofusDB: solo se muestra lo que escribas aquí.',
  },
} as const
