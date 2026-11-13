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
  /** La página pública de la guía, /<slug>. */
  page: {
    videoTitle: (title: string) => `Vídeo de la guía: ${title}`,
    preview: {
      label: 'Vista previa',
      note: 'Vista previa del borrador. Los visitantes ven la versión publicada.',
      exit: 'Salir de la vista previa',
      badSlug: 'Esa dirección no es la de una guía ni la de un logro.',
      signIn: 'Inicia sesión en el panel para ver la vista previa.',
      notFound: 'No hay ninguna guía ni ningún logro con ese slug.',
    },
  },
  /** Slug de reserva cuando el nombre de la misión no deja ni una letra. */
  fallbackSlug: 'guia',
  admin: {
    questDescription:
      'Elige primero la misión de DofusDB de la guía, solo una: rellena el título, la dirección, ' +
      'el SEO y el resumen. Luego solo te queda escribir la guía.',
    titleDescription: 'Si lo dejas vacío, se usa el nombre de la misión.',
    slugDescription:
      'La de la guía, como aprendizaje-escudero. Si la dejas vacía, sale del nombre de la misión.',
    summaryDescription:
      'Al elegir la misión, cada campo vacío se rellena con lo que da DofusDB. ' +
      'Cámbialo con libertad: lo que escribas no se sobrescribe.',
    summaryPlaceholder: 'Se rellena con DofusDB al elegir la misión; si no da nada, escríbelo tú.',
    needsNotesDescription:
      'Lo que la lista de objetos no recoge, como «1 x Combate (solo)» o «Literalmente nada». ' +
      'No se rellena solo.',
    dungeonPicksLabel: 'Mazmorras de las notas',
    dungeonPicksDescription:
      'Para una nota de mazmorra que sale con el icono genérico en «Necesitarás en total» ' +
      '(«1 x Mazmorra Ben Ripata.»): copia la nota tal como está en Notas y elige su ' +
      'mazmorra, y la página pintará su jefe. Lo que elijas gana a lo que se adivina por el ' +
      'nombre. Si cambias el texto de la nota, cámbialo también aquí.',
    dungeonPickUnknownNote:
      'Copia aquí una nota de mazmorra de Notas, tal como está escrita (la cantidad da igual).',
    seoDescription:
      'Se rellena solo desde la misión si lo dejas vacío. Puedes cambiarlo cuando quieras.',
    slugReserved: (slug: string) =>
      `/${slug} es una página del sitio: elige otra dirección para la guía.`,
    titleRequired: 'Escribe un título o elige una misión de DofusDB para sacarlo de ella.',
    fromDofusDb: 'Viene de DofusDB. Puedes cambiarlo.',
    changed: (value: string) => `Cambiado. DofusDB da: ${value}`,
    emptyWillFill: (value: string) =>
      `Vacío: al guardar se rellena con lo que da DofusDB: ${value}`,
    dofusDbEmpty: 'DofusDB no da nada aquí; escríbelo tú.',
    dofusDbEmptyChanged: 'Escrito por ti: DofusDB no da nada aquí.',
    dofusDbLoading: 'Cargando los datos de DofusDB…',
    dofusDbUnavailable: 'No se pudieron cargar los datos de DofusDB.',
    noQuest: 'Sin misión de DofusDB: escribe tú este dato.',
    /** El bloque Combate del contenido (DESIGN.md, Monster chip and fight block). */
    fight: {
      singular: 'Combate',
      plural: 'Combates',
      monsters: 'Monstruos',
      monster: 'Monstruo',
      quantity: 'Cantidad',
    },
    /** El bloque Paso del contenido (DESIGN.md, Steps). */
    step: {
      singular: 'Paso',
      plural: 'Pasos',
      x: 'X',
      y: 'Y',
      coordinatesDescription:
        'La posición principal del paso, si la tiene: si el texto no la nombra, sale como ' +
        'chip al principio del paso.',
      coordinatesPair: 'Pon X e Y, o deja las dos vacías.',
      coordinatesInteger: 'Las coordenadas del juego son números enteros.',
      body: 'Contenido del paso',
    },
  },
} as const
