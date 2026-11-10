import { achievementPageStrings } from '../achievements/strings'

// Los textos de las guías de Dofus: el panel, la página de cada Dofus y el índice. Un
// segundo idioma sería traducir este módulo.

export const dofusGuideStrings = {
  tags: {
    primordial: 'Primordial',
    event: 'Evento',
  },
  admin: {
    dofusDescription:
      'El objeto Dofus de DofusDB: de él sale el huevo de la tarjeta, del menú y de la página.',
    nameDescription: 'El nombre del Dofus, como sale en la tarjeta y en el título de la página.',
    slugDescription: 'La URL de la guía, la misma que en la web de Torre: dofus-abisal.',
    orderDescription: 'Su lugar en la lista de guías: el 1 sale primero.',
    levelDescription: 'El nivel del Dofus en DofusDB.',
    tagDescription: 'Los filtros del índice. Vacío si no es primordial ni de evento.',
    colorDescription: 'El brillo detrás del huevo, en hexadecimal (#2a5aaa).',
    colorInvalid: 'Tiene que ser un color hexadecimal de seis cifras: #2a5aaa',
    aliasesDescription:
      'Otros nombres con los que se busca, separados por comas (zanahoria, kaliptus).',
    needsDescription:
      'Lo que pide el Dofus, por grupos. Un objeto enlazado sale con su icono y se copia de un clic.',
    needsTitleDescription: 'Vacío: «Necesitarás».',
    needItemNameDescription:
      'El nombre si el objeto no está enlazado. Enlazado, sale el nombre del objeto.',
    needItemNameRequired: 'Enlaza el objeto o escribe su nombre',
    partsDescription:
      'Los logros y las misiones en el orden en que se hacen. Las misiones de cada logro ' +
      'salen de su página de logro: se cambian allí.',
    noteDescription: 'Una nota corta junto al nombre, como «(solo empezarla)».',
    bodyDescription: 'Para las guías paso a paso, como la Piñata de pino.',
    videoDescription: 'Enlace al vídeo de la guía en YouTube (youtube.com o youtu.be).',
    videoPosterDescription:
      'La imagen que se ve antes de reproducir el vídeo. La importación trae la de YouTube.',
    indexDescription:
      'El índice /guias-dofus: las tarjetas salen de las guías de Dofus, en su orden.',
    indexIntroDescription: 'El texto bajo el título del índice.',
    checklistDescription: 'La checklist de este Dofus, si tiene: sale como tarjeta en la guía.',
  },
} as const

/** El índice de las guías de Dofus, /guias-dofus (DESIGN.md, Dofus guides index). */
export const dofusIndexStrings = {
  title: 'Guías de Dofus',
  eyebrow: 'Misiones y logros de cada Dofus',
  filters: { all: 'Todos', primordial: 'Primordiales', event: 'Evento' },
  filtersLabel: 'Filtrar por tipo',
  search: 'Buscar un Dofus',
  searchLabel: 'Buscar un Dofus por su nombre',
  found: (count: number) => (count === 1 ? '1 encontrado' : `${count} encontrados`),
  none: (query: string) =>
    query ? `Ningún Dofus se llama «${query}».` : 'Ningún Dofus con este filtro.',
  seo: {
    title: 'Guías de Dofus',
    description:
      'Las guías de Torre para conseguir cada Dofus: qué pide, qué logros y misiones lo dan y ' +
      'en qué orden hacerlos.',
  },
} as const

/** La página de una guía de Dofus, /<slug> (DESIGN.md, Dofus guide page). */
export const dofusPageStrings = {
  index: 'Guías de Dofus',
  achievements: (count: number) => (count === 1 ? '1 logro' : `${count} logros`),
  quests: achievementPageStrings.quests,
  points: achievementPageStrings.points,
  level: (level: number) => `Nivel ${level}`,
  metaSeparator: achievementPageStrings.metaSeparator,
  prerequisites: 'Prerrequisitos',
  needs: 'Necesitarás',
  rewards: 'Recompensas',
  partsHeading: (achievements: number) =>
    achievements === 1 ? 'El logro' : 'Los logros, en orden',
  questHeading: 'La misión',
  metalogro: (number: number) => `Metalogro ${number}`,
  questKicker: achievementPageStrings.questKicker,
  /** Una misión que es una parte por sí sola, sin número. */
  questAlone: (level?: number) => (level ? `Misión - Nivel ${level}` : 'Misión'),
  noGuide: 'Sin guía todavía',
  preparing: achievementPageStrings.preparing,
  body: 'Paso a paso',
  video: 'El vídeo de Torre',
  videoCaption: (name: string) => `${name} · YouTube, Torrente Arcano`,
  checklist: 'Ya hay checklist',
  side: 'Guías de Dofus',
  previous: 'Dofus anterior',
  next: 'Siguiente Dofus',
  navLabel: 'Guías de Dofus',
  seo: {
    title: (name: string) => `${name}: guía de Dofus`,
    description: (name: string) =>
      `Cómo conseguir el ${name} en Dofus: qué pide, qué logros y misiones lo dan, en orden, ` +
      'con la guía de cada misión.',
  },
} as const
