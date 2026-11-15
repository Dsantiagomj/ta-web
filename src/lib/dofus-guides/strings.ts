import { achievementPageStrings } from '../achievements/strings'
import { dofusIndexIslandStrings } from '@/components/dofus/index-island-strings'

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
    eggDescription:
      'Opcional. Si la subes, este huevo sale en la tarjeta del índice, el menú, el póster de ' +
      'su checklist y la cabecera de la guía, en lugar del de DofusDB.',
    nameDescription: 'El nombre del Dofus, como sale en la tarjeta y en el título de la página.',
    slugDescription: 'La de la guía, la misma que en tu web: dofus-abisal.',
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
    needGroupDescription:
      'En la guía, los grupos salen siempre en el orden de esta lista, elijas el que elijas.',
    needGroupSubtitleDescription:
      'Opcional: sale bajo el nombre del grupo, encima de sus filas. Por ejemplo «1 x Mazmorra» ' +
      'o «Dependiendo de tu nivel».',
    needsNoteDescription: 'Opcional: una nota sobre todo Necesitarás, encima de los grupos.',
    needItemNameDescription:
      'El nombre si el objeto no está enlazado. Enlazado, sale el nombre del objeto.',
    needItemNameRequired: 'Enlaza el objeto o escribe su nombre',
    partsDescription:
      'Los logros y las misiones en el orden en que se hacen. Cada logro enseña tus misiones, ' +
      'como las escribes aquí, o las de su página de logro.',
    pageQuestsLabel: 'Misiones de su página de logro',
    pageQuestsDescription:
      'Marcado: salen las misiones de la página del logro. Sin marcar: salen las de la lista ' +
      'de abajo, como las escribes tú, aunque esté vacía.',
    ownQuestsLabel: 'Tus misiones',
    ownQuestsDescription:
      'En el orden en que se hacen. Cuentan en las cifras de la guía y del índice.',
    ownQuestTitleDescription:
      'Tal como quieres que salga: «Heh, ¿dónde está Bizcana?» o «La fatalidad - El destino - ' +
      'La rivalidad».',
    ownQuestGuidesDescription:
      'La guía a la que lleva. Con varias, cada trozo del texto separado por « - » o « o » ' +
      'lleva a la suya, en orden.',
    achievementLinkLabel: 'Enlace mientras esté en preparación',
    achievementLinkDescription:
      'La dirección del logro en tu web de siempre (/en-marcha-hacia-la-aventura). Mientras ' +
      'su página esté «En preparación», el nombre lleva allí.',
    questTitleDescription: 'Vacío: el título de la guía.',
    looseQuestLinkDescription:
      'Si la fila no es una misión («Logro: Cazadores cazados»), a dónde lleva: ' +
      '/cazadores-cazados. Sale sin número.',
    looseQuestRequired: 'Elige la guía o escribe el texto',
    siteLinkInvalid:
      'Tiene que ser una dirección de la web que empiece por / (/cazadores-cazados) o una URL ' +
      'que empiece por http:// o https://',
    noteDescription: 'Una nota corta junto al nombre, como «(solo empezarla)».',
    bodyDescription: 'Para las guías paso a paso, como la Piñata de pino.',
    videoDescription: 'Enlace al vídeo de la guía en YouTube (youtube.com o youtu.be).',
    videoPosterDescription:
      'La imagen que se ve antes de reproducir el vídeo. La importación trae la de YouTube.',
    indexDescription:
      'El índice /guias-dofus: las tarjetas salen de las guías de Dofus, en su orden.',
    indexIntroDescription: 'El texto bajo el título del índice.',
    /** Las pestañas del formulario (A-22). */
    tabs: { content: 'Contenido', facts: 'Ficha', needs: 'Necesitarás' },
    checklistDescription: 'La checklist de este Dofus, si tiene: sale como tarjeta en la guía.',
  },
} as const

/** Los grupos de Necesitarás (need-groups.ts), en el panel y en la página. */
export const dofusNeedGroupLabels = {
  combates: 'Combates',
  mazmorras: 'Mazmorras',
  recursos: 'Recursos',
  equipables: 'Equipables',
  consumibles: 'Consumibles',
  oficios: 'Oficios',
  emotes: 'Emotes',
  logros: 'Logros',
  otros: 'Otros',
} as const

/** El índice de las guías de Dofus, /guias-dofus (DESIGN.md, Dofus guides index). */
export const dofusIndexStrings = {
  // El antetítulo, el título y el SEO del índice son de «Portada e índices»
  // (src/lib/site-copy/defaults.ts).
  ...dofusIndexIslandStrings,
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
