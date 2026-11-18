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
    levelRange: (from: number, to: number) => `Nivel ${from} a ${to}`,
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
    /** Las pestañas del formulario (A-22). */
    tabs: { content: 'Contenido', summary: 'Resumen', seo: 'SEO' },
    questDescription:
      'Elige primero la misión de DofusDB de la guía, solo una: al elegirla se rellenan el ' +
      'título, la dirección, el SEO y el resumen que estén vacíos. Lo que vacíes después se ' +
      'queda vacío; «Rellenar desde DofusDB» vuelve a copiar lo vacío cuando quieras. Cuando ' +
      'ya tiene una, solo un administrador puede cambiarla: otra misión mezclaría sus datos ' +
      'con los de esta.',
    titleDescription: 'Si lo dejas vacío, se usa el nombre de la misión.',
    slugDescription:
      'La de la guía, como aprendizaje-escudero. Si la dejas vacía, sale del nombre de la misión.',
    summaryDescription:
      'Al elegir la misión, cada campo vacío se rellena con lo que da DofusDB. Cámbialo con ' +
      'libertad: lo que escribas no se sobrescribe, y lo que vacíes se queda vacío. Para ' +
      'volver a copiar lo vacío, pulsa «Rellenar desde DofusDB» bajo la misión.',
    summaryPlaceholder: 'Se rellena con DofusDB al elegir la misión; si no da nada, escríbelo tú.',
    zoneDescription:
      'La zona del subtítulo de la guía, como «Astrub». Si la dejas vacía, sale la de DofusDB.',
    levelDescription:
      'El nivel del subtítulo, de la búsqueda y de la tarjeta de la misión. Si lo dejas vacío, ' +
      'sale el de DofusDB.',
    rewardsDescription:
      'Lo que sale en Recompensas, en la cabecera de la guía. Lo que escribas aquí gana a ' +
      'DofusDB; lo que dejes vacío lo pone DofusDB, y un 0 quita la cifra. Con XP mínima, la ' +
      'web enseña el rango «mínima a XP». «Por nivel» es solo para misiones que dan otra cosa ' +
      'según el nivel, como las de evento: un tramo por fila, con la XP y los kamas del nivel ' +
      'más alto del tramo. Con dos tramos o más, la web los enseña en vez de la XP, los kamas ' +
      'y los objetos.',
    rewardNotesDescription:
      'Lo que no es XP, kamas ni un objeto del juego, como «Emote: Facepalm». Una por línea. ' +
      'No se rellena solo.',
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
      'Se rellena desde la misión al elegirla, si está vacío. Puedes cambiarlo cuando quieras.',
    slugReserved: (slug: string) =>
      `/${slug} es una página del sitio: elige otra dirección para la guía.`,
    titleRequired: 'Escribe un título o elige una misión de DofusDB para sacarlo de ella.',
    fromDofusDb: 'Viene de DofusDB. Puedes cambiarlo.',
    changed: (value: string) => `Cambiado. DofusDB da: ${value}`,
    // Sin punto doble: las recompensas de DofusDB ya terminan en punto.
    emptyCanFill: (value: string) =>
      `Vacío. DofusDB da: ${value.replace(/\.$/, '')}. «Rellenar desde DofusDB» lo copia aquí.`,
    dofusDbEmpty: 'DofusDB no da nada aquí; escríbelo tú.',
    dofusDbEmptyChanged: 'Escrito por ti: DofusDB no da nada aquí.',
    sameAtEveryLevel: 'DofusDB da lo mismo a todos los niveles: déjalo vacío.',
    sameAtEveryLevelChanged: 'Escrito por ti: DofusDB da lo mismo a todos los niveles.',
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
    /** El bloque Tabla (DESIGN.md, Table block). */
    table: {
      singular: 'Tabla',
      plural: 'Tablas',
      title: 'Título',
      titleDescription:
        'Opcional. Va encima de la tabla y es como la nombra quien usa un lector de pantalla.',
      paste: 'Pegar desde una hoja de cálculo',
      pasteDescription:
        'Copia las celdas en Google Sheets o Excel (o una tabla de otra web) y pégalas aquí. ' +
        'La primera fila son los encabezados. Al pulsar «Rellenar la tabla», las columnas y ' +
        'las filas de abajo se cambian por lo pegado; nada se guarda hasta que guardes.',
      pasteButton: 'Rellenar la tabla',
      pasteEmpty: 'Pega primero las celdas en el recuadro.',
      pasteHeadOnly:
        'Solo hay una fila, y la primera son los encabezados: pega también las filas de datos.',
      pasteDone: (columns: number, rows: number) =>
        `Listo: ${columns} ${columns === 1 ? 'columna' : 'columnas'} y ${rows} ` +
        `${rows === 1 ? 'fila' : 'filas'}. Revísalas y guarda.`,
      rowHeaders: 'La primera columna nombra cada fila',
      rowHeadersDescription:
        'Márcalo si la primera columna dice de qué es cada fila (el nombre del familiar, por ' +
        'ejemplo): va en negrita, se queda a la vista al desplazar la tabla en el móvil y el ' +
        'lector de pantalla la lee con cada celda.',
      columns: 'Columnas',
      column: 'Columna',
      header: 'Encabezado',
      align: 'Alineación',
      alignDescription:
        'Pon «Derecha (cifras)» en las columnas de números: así se leen en columna. Al pegar, ' +
        'las columnas que solo tienen cifras ya van a la derecha.',
      alignOptions: { start: 'Izquierda', center: 'Centro', end: 'Derecha (cifras)' },
      rows: 'Filas',
      row: 'Fila',
      cells: 'Celdas',
      cell: 'Celda',
      cellText: 'Texto',
      cellsDescription: 'Una celda por columna, en el orden de las columnas.',
      /** El encabezado de una columna que llegó vacía al pegar. */
      columnFallback: (number: number) => `Columna ${number}`,
      tooManyCells: (row: number, cells: number, columns: number) =>
        `La fila ${row} tiene ${cells} celdas y la tabla ${columns} ` +
        `${columns === 1 ? 'columna' : 'columnas'}: añade una columna o quita la celda que sobra.`,
    },
  },
  /** La tabla en la página. */
  table: {
    /** El nombre de una tabla sin título: sus columnas. */
    regionLabel: (headers: string[]) => `Tabla: ${headers.join(', ')}`,
  },
} as const
