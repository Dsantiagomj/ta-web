// Los textos de las checklists: el panel y el índice /checklists. Un segundo idioma sería
// traducir este módulo.
import { objectiveStrings } from './objective-strings'

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
    note: 'Nota',
    tip: 'Consejo',
    must: 'Hay que hacerlo',
    includes: 'Incluye',
  },
  kinds: {
    steps: 'Pasos de una guía',
    souls: 'Almas de una misión',
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
    upto: 'Hasta una misión',
  },
  admin: {
    nameDescription: 'El nombre de la checklist, como sale en su página y en el menú.',
    kindDescription:
      'Pasos de una guía, como el Silvestre, o las almas que pide una misión, como el Ocre.',
    soulsQuestDescription:
      'La misión cuyas almas se marcan («La eterna cosecha»). Las almas salen de sus objetivos y de sus monstruos: no se escriben aquí.',
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
      'Guarda el progreso de cada persona en este paso. Se crea al guardar y no cambia.',
    stepIdCopyLabel: 'el identificador del paso',
    segmentsDescription:
      'El texto del paso, por tramos y en orden. Un tramo «Detente aquí» dice hasta dónde ' +
      'avanzar una misión; uno «Aquí se resuelve» termina las misiones que otros pasos dejaron a medias.',
    segmentQuestDescription:
      'La misión que se deja a medias. Déjala vacía si el tramo solo avisa y ninguna misión para aquí.',
    segmentQuestRequired: 'Elige la misión que se deja a medias',
    stopLaterDescription:
      'Márcalo si esta misión no la termina el paso que cierra este, sino uno posterior que también la lleva.',
    stopLineDescription:
      'El texto de la parada dentro de la misión, si no es el del tramo. Vacío: el del tramo.',
    stopResumeLineDescription:
      'El texto dentro de la misión cuando el paso se resuelve en sí mismo, si no es el de su tramo «Aquí se resuelve».',
    stopMoreDescription:
      'Otras misiones u objetivos donde para este mismo texto, cuando son varios.',
    stopObjectiveDescription:
      'La línea roja va justo antes de este objetivo: se hacen los anteriores y este se deja para después.',
    stopObjectiveRequired: 'Elige el objetivo antes del que hay que parar',
    stopObjectiveInvalid: 'Elige uno de los objetivos de la misión',
    stopObjectiveOutOfRange: (count: number) =>
      `Esta misión tiene ${count} objetivos: elige uno del 1 al ${count}`,
    questWithoutObjectives:
      'Esta misión no tiene objetivos guardados todavía: refresca los datos de DofusDB',
    closesDescription: 'Los pasos cuyas misiones termina este tramo.',
    stepClosesDescription:
      'Los pasos cuyas misiones termina este paso sin un tramo «Aquí se resuelve». Con ese tramo, van en él.',
    stepUpdatesDescription:
      'Los pasos cuyas misiones avanza este sin terminarlas. En ellos sale «Se retoma en el paso N».',
    stepRefUnknown: (stepId: string) =>
      `Ningún paso de esta checklist tiene el identificador ${stepId}`,
    noteDescription: 'Una nota del paso, aparte de su texto.',
    achievementOnDescription: 'Las misiones del logro que se hacen en este paso: 1, 2…',
    questNoteDescription: 'Una nota corta junto a la misión.',
    questLabelDescription:
      'Para una fila que vale con cualquiera de varias misiones («Misión de clase»): el nombre que sale en lugar del de la misión.',
    questAlternativesDescription:
      'Las demás misiones que también valen para esta fila, como la de cada clase o alineamiento. La fila queda hecha con cualquiera.',
    completedByDescription:
      'Misiones que el juego termina solas al terminar otras, como «Bienvenido a Frigost». Salen hechas sin marcarlas.',
    completedByByDescription: 'Las misiones que, terminadas todas, terminan esta.',
    optionalDoneByDescription: 'El paso que termina esta misión opcional, si la termina otro paso.',
    needQuestsDescription: 'Las misiones que piden este objeto.',
    needItemDescription:
      'El objeto del juego. Si no es un objeto (kamas, un hechizo), deja el texto.',
    needLabelDescription:
      'Lo que se necesita, cuando no es un objeto del juego: «Kama», un hechizo…',
    needItemOrLabel: 'Elige un objeto del juego o escribe qué se necesita',
    needCategoryDescription: 'El grupo en el que sale en «Necesitarás».',
    needCountsInTotalDescription:
      'Desmárcalo si sale en el paso pero no cuenta en los totales de lo que hay que reunir.',
    needAlternativesDescription:
      'Otras opciones que valen en lugar de esta, cada una con su cantidad: «Pandaburg o Pandapils».',
    needGroupDescription:
      'Un grupo dentro de su categoría, como «Misión opcional». Vacío: sin grupo.',
    needReusableDescription:
      'Márcalo si se conserva tras usarlo: en los totales cuenta la mayor cantidad, no la suma.',
    prerequisiteNotesDescription:
      'Avisos sobre los prerrequisitos, como empezar el Dofus Ocre cuanto antes.',
    prerequisiteNeedsDescription: 'Los objetos que piden los prerrequisitos.',
    needPrerequisiteDescription:
      'La clave del prerrequisito en el que se gasta, como l11. Al marcarlo, el objeto deja de faltar.',
    needPrerequisiteUnknown: (key: string) => `Ningún prerrequisito tiene la clave ${key}`,
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
  updates: (n: number) => `avanza el ${n}`,
  resumedIn: (n: number) => `se retoma en el ${n}`,
  note: 'Nota de la checklist.',
  needs: 'Necesitarás',
  achievements: 'Logros',
  achievementSome: 'Solo algunas misiones',
  achievementUpto: (n: number) => `Hasta la misión ${n}`,
  /** Entre las opciones de una fila de Necesitarás: «Pandaburg o Pandapils». */
  needOr: 'o',
  prerequisiteNeeds: 'Objetos para los prerrequisitos',
  /** Para qué prerrequisito es un objeto de los prerrequisitos. */
  prerequisiteFor: (text: string) => `Para «${text}»`,
  /** Una opción de «Necesitarás» cuyo objeto se borró de la base. */
  unknownItem: 'Un objeto que ya no existe',
  bosses: 'Jefes',
  quests: 'Misiones',
  questsHowto:
    'El nombre de cada misión abre su guía de Torrente Arcano, con adónde ir y qué hacer.',
  noQuests: 'Este paso no tiene misiones en DofusDB.',
  questLevel: (level: number) => `Niv. ${level}`,
  questKinds: { optional: 'Opcional', take: 'Solo tomarla' },
  /** Una fila que vale con cualquiera de varias misiones («Misión de clase»). */
  questAnyOf: (n: number) => `Vale con cualquiera de sus ${n} misiones`,
  guideTitle: 'Guía de Torrente Arcano',
  previous: 'Paso anterior',
  next: 'Paso siguiente',
  close: 'Cerrar el paso',
  totalsIntro: 'Todo lo que piden los pasos, sumado. Lo que solo hace falta tener no cuenta.',
  /** Dónde se pide un objeto de Objetos; el 0 son los prerrequisitos. */
  totalsSteps: (steps: number[]) => {
    const own = steps.filter((n) => n > 0)
    const list =
      own.length === 0
        ? ''
        : own.length === 1
          ? `paso ${own[0]}`
          : `pasos ${own.slice(0, -1).join(', ')} y ${own.at(-1)}`
    const text = steps.includes(0) ? (list ? `Prerrequisitos y ${list}` : 'Prerrequisitos') : list
    return text.charAt(0).toUpperCase() + text.slice(1)
  },
  otherNeeds: 'Otros',
  /** Lo que nombra un objetivo de DofusDB cuando no tenemos su nombre. */
  unnamed: objectiveStrings.unnamed,
  credit:
    'Guía original de Torrente Arcano. Texto reproducido tal cual; misiones e imágenes vía DofusDB.',
  seoDescription: (name: string) =>
    `La checklist del ${name}: los pasos de la guía de Torre con sus misiones y objetivos y lo que necesitas.`,
} as const

/** La página de una checklist de almas, el Ocre (src/components/checklist/SoulsParts.tsx). */
export const soulsStrings = {
  lead: 'Las almas que pide «La eterna cosecha», una a una, hasta el Dofus Ocre.',
  bosses: 'Jefes',
  archis: 'Archis',
  stage: (n: number, kind: string) => `Etapa ${n} · ${kind}`,
  noRegion: 'Sin región',
  groupBy: 'Agrupar',
  byStage: 'Por etapa',
  byRegion: 'Por región',
  typeLabel: 'Tipo de alma',
  types: { all: 'Todas', boss: 'Jefes', archi: 'Archis' },
  search: 'Buscar alma, mazmorra, zona o región',
  searchLabel: 'Buscar un alma por su nombre, su mazmorra, su zona o su región',
  hideDone: 'Ocultar las que tengo',
  level: (level: number) => `Nv. ${level}`,
  bossTag: 'Jefe',
  archiTag: 'Archi',
  unit: 'almas',
  groupCount: (done: number, total: number) => `${done}/${total}`,
  souls: (n: number) => `${n} ${n === 1 ? 'alma' : 'almas'}`,
  barLabel: (name: string) => `Progreso de ${name}`,
  empty: 'Ningún alma coincide con la búsqueda.',
  listLabel: 'Almas',
}
