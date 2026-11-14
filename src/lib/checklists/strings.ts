// Los textos de las checklists: el panel y el índice /checklists. Un segundo idioma sería
// traducir este módulo.

/** El índice /checklists (DESIGN.md, Checklists index). Sin cifras: Torre suma checklists. */
export const checklistIndexStrings = {
  eyebrow: 'Paso a paso hasta tu Dofus',
  title: 'Checklists',
  lead:
    'Marca lo hecho y ve lo que falta, de la primera misión al Dofus. Sin cuenta: el progreso ' +
    'se guarda en tu navegador.',
  preparing: 'En preparación',
  legacy: 'Por ahora, se abre en la web anterior',
  empty: 'Todavía no hay checklists publicadas. Vuelve pronto: Torre está preparando la primera.',
  seo: {
    title: 'Checklists de Dofus',
    description:
      'Las checklists de Torre para conseguir cada Dofus paso a paso: marca lo hecho y ve lo ' +
      'que falta.',
  },
} as const

export const checklistStrings = {
  segmentKinds: {
    plain: 'Normal',
    stop: 'Detente aquí',
    resolve: 'Aquí se resuelve',
  },
  questKinds: {
    mandatory: 'Obligatoria',
    optional: 'Opcional',
    take: 'Solo tomarla',
  },
  needCategories: {
    resources: 'Recursos',
    consumables: 'Consumibles',
    equipment: 'Equipables',
    souls: 'Almas',
    creatures: 'Criaturas',
    cosmetics: 'Cosméticos',
  },
  achievementModes: {
    all: 'Completo',
    some: 'Solo algunas misiones',
  },
  admin: {
    nameDescription: 'El nombre de la checklist, como sale en su página y en el menú.',
    slugDescription: 'La de la checklist, la misma que en tu web: checklist-nebuloso.',
    stateDescription:
      'Publicada: se ve y se puede abrir. En preparación: sale en el menú sin página propia y ' +
      'enlaza a la checklist de Squarespace. Lo decides tú; la importación no lo cambia. ' +
      'Además, pulsa «Publicar cambios» arriba para que lo que cambies salga en la web.',
    orderDescription: 'Su lugar en la lista de checklists: la 1 sale primero.',
    descriptionDescription:
      'Una frase para el índice y el menú. Sin cifras de pasos ni de misiones: cambian.',
    dofusGuideDescription: 'La guía de su Dofus: de ella salen el huevo y el color de la página.',
    legacyHrefDescription:
      'La checklist en Squarespace mientras esta no esté lista. Deja de usarse al publicarla.',
    prerequisitesDescription: 'Lo que hay que tener antes de empezar, por grupos.',
    prerequisitesIntroDescription: 'El texto sobre las listas de prerrequisitos.',
    prerequisiteKeyDescription:
      'Guarda lo que cada persona marcó. Se escribe al crear la fila y luego queda fija: ' +
      'otra clave borraría esas marcas.',
    stepsDescription: 'Los pasos de la guía, en tu orden.',
    stepIdDescription:
      'Guarda el progreso de cada persona en este paso. Se crea al guardar y no cambia. ' +
      'Cópialo para «Pasos que termina» o «La termina el paso».',
    stepIdCopyLabel: 'el identificador del paso',
    segmentsDescription:
      'El texto del paso, por tramos y en orden. Un tramo «Detente aquí» dice hasta dónde ' +
      'avanzar una misión; uno «Aquí se resuelve» termina las misiones que otros pasos dejaron a medias.',
    segmentQuestDescription: 'La misión que se deja a medias.',
    segmentQuestRequired: 'Elige la misión que se deja a medias',
    stopObjectiveDescription:
      'El objetivo de esa misión donde hay que parar, contando desde 0 en la lista de ' +
      'objetivos de la misión, etapa tras etapa.',
    stopObjectiveRequired: 'Indica el objetivo donde hay que parar',
    stopObjectiveInvalid: 'El objetivo es un número entero desde 0',
    stopObjectiveOutOfRange: (last: number) =>
      `Esta misión tiene objetivos del 0 al ${last}: elige uno de ellos`,
    questWithoutObjectives:
      'Esta misión no tiene objetivos guardados todavía: refresca los datos de DofusDB',
    closesDescription:
      'Los identificadores de los pasos cuyas misiones termina este tramo. Cada paso tiene ' +
      'el suyo en «Datos técnicos», al final del paso.',
    closesRequired: 'Indica qué pasos termina este tramo',
    stepRefUnknown: (stepId: string) =>
      `Ningún paso de esta checklist tiene el identificador ${stepId}`,
    noteDescription: 'Una nota del paso, aparte de su texto.',
    achievementOnDescription: 'Las misiones del logro que se hacen en este paso: 1, 2…',
    questNoteDescription: 'Una nota corta junto a la misión.',
    optionalDoneByDescription:
      'El identificador del paso que termina esta misión opcional, si otro paso la termina. ' +
      'Está en «Datos técnicos», al final de ese paso.',
    needQuestsDescription: 'Las misiones que piden este objeto.',
    needItemDescription:
      'El objeto del juego. Si no es un objeto (kamas, un hechizo), deja el texto.',
    needLabelDescription:
      'Lo que se necesita, cuando no es un objeto del juego: «Kama», un hechizo…',
    needItemOrLabel: 'Elige un objeto del juego o escribe qué se necesita',
    needCategoryDescription: 'El grupo en el que sale en «Necesitarás».',
    needCountsInTotalDescription:
      'Desmárcalo si sale en el paso pero no cuenta en los totales de lo que hay que reunir.',
    iconDescription: 'El icono del paso: la recompensa de su logro, su jefe o el icono del logro.',
    figureDescription: 'La imagen del paso: un PNJ o una imagen subida.',
    figureRoleDescription: 'Qué papel tiene, como «Inicia el paso».',
    bossesDescription: 'Los jefes que hay que vencer en el paso.',
    bannerDescription: 'La imagen de cabecera del paso, normalmente el mapa donde empieza.',
    zoneDescription:
      'La zona del paso en la lista, como «Anutropía». Agrupa los pasos: no tiene por qué ser donde empiezan sus misiones.',
  },
} as const

/** La página de una checklist, /<slug> (prototipo A, tmp/mockups/checklist-a). */
export const checklistPageStrings = {
  title: (name: string) => `Checklist del ${name}`,
  lead: 'La guía de Torrente Arcano, paso a paso, con sus misiones y objetivos.',
  index: 'Guías de Dofus',
  windowLabel: 'Checklist',
  tabsLabel: 'Partes de la checklist',
  tabs: { diary: 'Diario', prerequisites: 'Prerrequisitos', items: 'Objetos' },
  search: 'Buscar paso por número o texto',
  searchLabel: 'Buscar un paso por número o texto',
  stepsLabel: 'Pasos',
  stepPrefix: (n: number) => `Paso ${n}: `,
  guideText: 'Texto de la guía',
  legendStop: 'Hasta dónde llegar',
  legendResolve: 'Lo que se resuelve',
  closedIn: (n: number) => `se cierra en el ${n}`,
  closes: (n: number) => `cierra el ${n}`,
  note: 'Nota de la checklist.',
  needs: 'Necesitarás',
  achievements: 'Logros',
  achievementSome: 'Solo algunas misiones',
  bosses: 'Jefes',
  quests: 'Misiones',
  questsHowto:
    'El nombre de cada misión abre su guía de Torrente Arcano, con adónde ir y qué hacer.',
  noQuests: 'Este paso no tiene misiones en DofusDB.',
  questLevel: (level: number) => `Niv. ${level}`,
  questKinds: { optional: 'Opcional', take: 'Solo tomarla' },
  guideTitle: 'Guía de Torrente Arcano',
  previous: 'Paso anterior',
  next: 'Paso siguiente',
  close: 'Cerrar el paso',
  totalsIntro: 'Todo lo que piden los pasos, sumado. Lo que solo hace falta tener no cuenta.',
  totalsSteps: (steps: number[]) =>
    steps.length === 1
      ? `Paso ${steps[0]}`
      : `Pasos ${steps.slice(0, -1).join(', ')} y ${steps.at(-1)}`,
  otherNeeds: 'Otros',
  /** Lo que nombra un objetivo de DofusDB cuando no tenemos su nombre. */
  unnamed: { npc: 'un PNJ', item: 'un objeto', monster: 'un monstruo' },
  credit:
    'Guía original de Torrente Arcano. Texto reproducido tal cual; misiones e imágenes vía DofusDB.',
  seoDescription: (name: string) =>
    `La checklist del ${name}: los pasos de la guía de Torre con sus misiones y objetivos y lo que necesitas.`,
} as const
