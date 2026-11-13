// Los textos de las checklists: de momento, el panel. Un segundo idioma sería traducir
// este módulo.

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
    slugDescription: 'La URL de la checklist, la misma que en la web de Torre: checklist-nebuloso.',
    stateDescription:
      'Publicada: se ve y se puede abrir. En preparación: sale en el menú sin página propia y ' +
      'enlaza a la checklist de Squarespace. Lo decides tú; la importación no lo cambia.',
    orderDescription: 'Su lugar en la lista de checklists: la 1 sale primero.',
    descriptionDescription:
      'Una frase para el índice y el menú. Sin cifras de pasos ni de misiones: cambian.',
    dofusGuideDescription: 'La guía de su Dofus: de ella salen el huevo y el color de la página.',
    legacyHrefDescription:
      'La checklist en Squarespace mientras esta no esté lista. Deja de usarse al publicarla.',
    prerequisitesDescription: 'Lo que hay que tener antes de empezar, por grupos.',
    prerequisitesIntroDescription: 'El texto sobre las listas de prerrequisitos.',
    prerequisiteKeyDescription:
      'Guarda lo que cada persona marcó: no la cambies, o perderá esa marca.',
    stepsDescription: 'Los pasos de la guía, en tu orden.',
    stepIdDescription:
      'Guarda el progreso de cada persona en este paso. Se crea al guardar y no cambia.',
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
      'Los identificadores de los pasos cuyas misiones termina este tramo. Copia el ' +
      'identificador del paso, arriba en cada paso.',
    closesRequired: 'Indica qué pasos termina este tramo',
    stepRefUnknown: (stepId: string) =>
      `Ningún paso de esta checklist tiene el identificador ${stepId}`,
    noteDescription: 'Una nota del paso, aparte de su texto.',
    achievementOnDescription: 'Las misiones del logro que se hacen en este paso: 1, 2…',
    questNoteDescription: 'Una nota corta junto a la misión.',
    optionalDoneByDescription:
      'El identificador del paso que termina esta misión opcional, si otro paso la termina.',
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
  },
} as const
