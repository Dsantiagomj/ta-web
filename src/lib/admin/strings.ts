// Textos del panel de Payload que no son de una colección: los grupos del menú, las
// palabras de Payload que cambiamos, la marca, la dirección en la web y las etiquetas de
// las filas. Escritos para Torre, de tú y sin jerga. Un segundo idioma sería traducir este
// módulo.

/** El dominio que Torre conoce: la dirección en la web se enseña con él. */
export const SITE_HOST = 'torrentearcano.com'

/** Las colecciones de DofusDB lo dicen en su línea: no se escriben a mano. */
const readOnly = (text: string) => `${text} De solo lectura: lo pone al día un script.`

export const panelStrings = {
  /** Los selectores de pasos y de objetivos de una checklist (A-19). */
  pickers: {
    missingStep: 'Un paso que ya no existe',
    emptyObjective: 'Objetivo sin texto',
    chooseStep: 'Elige un paso',
    chooseSteps: 'Elige los pasos',
    chooseObjective: 'Elige el objetivo',
    questFirst: 'Elige antes la misión.',
    loading: 'Cargando los objetivos de la misión…',
    noObjectives: 'Esta misión no tiene objetivos guardados todavía.',
    failed: 'No se pudieron cargar los objetivos de la misión.',
    retry: 'Reintentar',
    staleObjective: (n: number) => `Objetivo ${n}, que ya no está en la misión`,
    questCleared: 'Sin misión, este objetivo ya no vale: quítalo.',
  },
  /** Las pestañas de un paso de una checklist (A-18). */
  stepTabs: {
    text: 'Texto',
    quests: 'Misiones y logros',
    needs: 'Necesitarás',
    images: 'Imágenes',
  },
  /** El esquema de los pasos de una checklist, para reordenarlos (A-18). */
  stepOutline: {
    label: 'Orden de los pasos',
    help:
      'Sube o baja cada paso con sus flechas o, con el paso elegido, con Alt y las flechas ' +
      '(Alt con Inicio o Fin lo lleva al principio o al final). Cada paso guarda su progreso ' +
      'al moverlo. Pulsa «Guardar» para quedarte con el orden nuevo.',
    up: (n: number) => `Subir el paso ${n}`,
    down: (n: number) => `Bajar el paso ${n}`,
    moved: (from: number, to: number) => `El paso ${from} es ahora el ${to}.`,
  },
  /**
   * Una línea por colección, arriba de su lista (payload.config.ts, withPanelDescriptions).
   * La guía del panel las repite en «Qué hay en cada parte».
   */
  collections: {
    'quest-guides': 'Tus guías de misiones: una por misión, con sus pasos, combates y vídeo.',
    'achievement-pages':
      'Una página por logro: tu entrada, las misiones en orden y lo que necesitas en total.',
    'achievement-groups':
      'Los metalogros que agrupan logros en /metalogros. No tienen página propia: abren su panel.',
    'dofus-guides':
      'Una guía por Dofus: lo que pide, los logros y misiones que lo dan y su checklist.',
    checklists:
      'Las checklists paso a paso de cada Dofus. El progreso de cada visitante va por paso.',
    media: 'Todas las imágenes: las que subes tú y las del juego que trae DofusDB.',
    quests: readOnly(
      'Las misiones de DofusDB, con sus etapas y recompensas. Las eliges en tus guías.',
    ),
    items: readOnly(
      'Los objetos de DofusDB, con su icono. Los eliges en «Necesitarás» y en los Dofus.',
    ),
    monsters: readOnly(
      'Los monstruos de DofusDB, con su imagen. Los eliges en los bloques de combate.',
    ),
    dungeons: readOnly(
      'Las mazmorras de DofusDB y sus jefes. Las eliges en las notas de las guías.',
    ),
    npcs: readOnly('Los PNJ de DofusDB que dan misiones o salen en ellas, con sus dibujos.'),
    subareas: readOnly(
      'Las zonas de DofusDB, con su área. Dan el nombre de los sitios de cada misión.',
    ),
    'achievement-categories': readOnly(
      'Las categorías de logros de DofusDB, como «Astrub» o «Eventos».',
    ),
    achievements: readOnly('Los logros de DofusDB. Cada página de logro enlaza uno.'),
    users: 'Las cuentas que pueden entrar en este panel.',
  },
  /**
   * La «Guía del panel» (A-14, src/components/admin/PanelGuide.tsx), de tú y con palabras
   * sencillas. BORRADOR: Torre lo revisa antes de darlo por bueno.
   */
  guide: {
    title: 'Guía del panel',
    intro:
      'Lo básico para escribir y publicar sin miedo a romper nada. Si algo sale mal, ' +
      '«Versiones» lo deshace.',
    contents: 'En esta guía',
    /** Los casos de «En preparación» que la guía enumera (preparingOnSite). */
    preparingCases: [
      { label: 'Un logro', key: 'achievement-pages' },
      { label: 'Un metalogro', key: 'achievement-groups' },
      { label: 'Una guía de Dofus', key: 'dofus-guides' },
      { label: 'Una checklist con dirección en la web antigua', key: 'checklistsLegacy' },
      { label: 'Una checklist sin ella', key: 'checklists' },
    ] as const,
    /** Bajo «Qué hay en cada parte»: qué cuenta tiene quien lee. Sin papel cuenta como editor. */
    yourRole: (role: string | null | undefined) =>
      `Tu cuenta es de ${role === 'admin' ? 'administrador' : 'editor'}.`,
    sections: [
      {
        id: 'borradores',
        title: 'Borradores: guardar sin que se vea',
        paragraphs: [
          '«Guardar borrador» guarda lo que escribiste, pero la web sigue enseñando lo de antes. ' +
            'Guarda tantas veces como quieras.',
          'Una página nueva empieza como borrador: nadie la ve hasta que la publicas.',
          'En «Pendiente», la portada del panel, tienes la lista de borradores a medias.',
        ],
      },
      {
        id: 'publicar',
        title: 'Publicar: que salga en la web',
        paragraphs: [
          '«Publicar cambios» manda a la web lo que tienes en pantalla. Tarda unos segundos en ' +
            'verse.',
          'Arriba a la derecha, «En la web» te dice en una línea qué ve un visitante: «En la ' +
            'web: visible», «Tienes cambios sin publicar» o por qué no se ve.',
          'Para ver cómo queda antes de publicar, pulsa el botón del ojo: la vista previa enseña ' +
            'tu borrador como Móvil, Tableta o Escritorio. Solo la ves tú.',
        ],
      },
      {
        id: 'en-preparacion',
        title: '«Visible en la web» y «En preparación»',
        paragraphs: [
          'Los logros, los metalogros, las guías de Dofus y las checklists tienen además ' +
            '«Visible en la web».',
          'Publicada: se abre. En preparación: cómo sale en la web depende de lo que sea, y lo ' +
            'dice la línea «En la web» de cada página:',
          'Para que una página se abra hacen falta las dos cosas: «Visible en la web» en ' +
            'Publicada y «Publicar cambios».',
        ],
      },
      {
        id: 'datos-del-juego',
        title: 'Datos del juego: vienen de DofusDB',
        paragraphs: [
          'Las misiones, los objetos, los monstruos, las mazmorras, los PNJ, las zonas y los ' +
            'logros vienen de DofusDB. No se escriben aquí: los eliges en los campos de tus guías.',
          'Por eso salen como «solo lectura». Se ponen al día con un proceso aparte, no desde el ' +
            'panel. Si ves un dato del juego mal, avisa a quien lleva la parte técnica.',
          'En los logros, lo que dejes vacío se rellena con DofusDB al guardar, y lo que escribas ' +
            'tú no lo pisa nadie. La nota bajo cada campo te dice de dónde viene.',
        ],
      },
      {
        id: 'imagenes',
        title: 'Imágenes',
        paragraphs: [
          'Sube una imagen desde «Imágenes» o directamente en el campo de una guía. Sube el ' +
            'original: la web hace sola las versiones pequeñas y ligeras.',
          'Escribe siempre el texto alternativo: describe lo que se ve, para quien no puede ver ' +
            'la imagen y para Google. Sin «imagen de…».',
          'Los iconos de objetos y los dibujos de monstruos y PNJ ya los trae DofusDB: no hace ' +
            'falta subirlos.',
        ],
      },
      {
        id: 'versiones',
        title: 'Versiones: tu botón de deshacer',
        paragraphs: [
          'Cada vez que guardas o publicas, el panel guarda una copia. Las ves en la pestaña ' +
            '«Versiones» de cada página: las 50 últimas.',
          'Para volver atrás, abre una versión antigua y pulsa «Restaurar esta versión». Después ' +
            'publica si quieres que salga en la web.',
          '«Revertir a la versión publicada», junto al estado de arriba, tira los cambios sin ' +
            'publicar y vuelve a lo que está en la web.',
          'Borrar, en cambio, no se deshace. Por eso el panel no deja borrar una imagen o un logro ' +
            'que sale en otras páginas, y te dice dónde sale.',
        ],
      },
      {
        id: 'direccion',
        title: 'La dirección en la web',
        paragraphs: [
          `«Dirección en la web» es el final del enlace: ${SITE_HOST}/aprendizaje-escudero. ` +
            'Solo minúsculas sin tildes, cifras y guiones.',
          'En una página ya publicada, mejor no cambiarla: los enlaces que la gente guardó dejarían ' +
            'de funcionar.',
        ],
      },
      {
        id: 'partes',
        title: 'Qué hay en cada parte',
        paragraphs: [
          'El menú de la izquierda pone primero tu contenido, luego las imágenes, los datos del ' +
            'juego y los ajustes. Cada lista empieza con una línea que dice qué guarda.',
          'Hay dos tipos de cuenta. Editor: crea, edita y publica, y borra las guías que hizo a ' +
            'mano. Administrador: además borra lo importado y las imágenes, cambia el orden y los ' +
            'enlaces con DofusDB, y gestiona las cuentas.',
        ],
      },
    ] satisfies { id: string; title: string; paragraphs: string[] }[],
  },
  /** Los grupos del menú y del panel de control, en este orden. */
  groups: {
    content: 'Contenido',
    media: 'Imágenes',
    gameData: 'Datos del juego (solo lectura)',
    settings: 'Ajustes',
  },
  /** El título de cada pestaña: «Guías de misiones · Torrente Arcano». */
  titleSuffix: ' · Torrente Arcano',
  brand: {
    top: 'Torrente',
    accent: 'Arcano',
    panel: 'Panel',
  },
  login: {
    welcome: 'Hola. Este es el panel de Torrente Arcano.',
    help: 'Entra con tu correo y tu contraseña para escribir y publicar tus guías.',
  },
  /** El texto del editor vacío. */
  editorPlaceholder: 'Escribe aquí. Pulsa / para añadir títulos, listas o imágenes.',
  /** La fecha de las listas y de la cabecera: 13 de noviembre de 2026, 11:08. */
  dateFormat: "d 'de' MMMM 'de' yyyy, HH:mm",
  slug: {
    label: 'Dirección en la web',
    required: 'Escribe la dirección de la página, como aprendizaje-escudero.',
    format:
      'La dirección solo admite minúsculas sin tildes, cifras y guiones sueltos, como ' +
      'aprendizaje-escudero.',
    preview: 'Se verá en',
    empty: 'Escribe la dirección para ver dónde se verá la página.',
  },
  /** El campo `state` de Torre: si la página se abre o sale «En preparación». */
  state: { label: 'Visible en la web' },
  /** La línea de la barra lateral que dice qué ve un visitante (A-16, PublishStatus). */
  publishStatus: {
    label: 'En la web',
    live: 'En la web: visible',
    changes: 'Tienes cambios sin publicar: la web sigue enseñando la versión publicada.',
    draft: 'No se ve en la web: es un borrador',
    draftDetail: 'Pulsa «Publicar cambios» cuando quieras que salga.',
    unsavedNew: 'No se ve en la web: aún no está guardada',
    unsavedNewDetail: 'Guárdala como borrador o pulsa «Publicar cambios».',
    unsaved: 'Lo que acabas de cambiar aún no está guardado.',
    trashed: 'No se ve en la web: está en la papelera',
    loading: 'Comprobando qué se ve en la web…',
    error: 'No se pudo comprobar qué se ve en la web.',
    /** Cómo sale en la web lo publicado «En preparación», según la colección (DESIGN.md). */
    preparing: {
      'achievement-pages': {
        text: 'En la web: sale apagado, sin página',
        detail:
          'Está En preparación: sale en su metalogro con esa etiqueta y sin enlace. Para que ' +
          'se abra, pon «Visible en la web» en Publicada y publica.',
      },
      'achievement-groups': {
        text: 'En la web: se abre solo si tiene logros publicados',
        detail:
          'Está En preparación: si alguno de sus logros está publicado, su panel se abre; si ' +
          'no, sale apagado. Pon «Visible en la web» en Publicada cuando esté listo.',
      },
      'dofus-guides': {
        text: 'En la web: el huevo sale apagado, sin página',
        detail:
          'Está En preparación: sale en el menú y en las guías de Dofus en gris, sin enlace. ' +
          'Para que se abra, pon «Visible en la web» en Publicada y publica.',
      },
      checklistsLegacy: {
        text: 'En la web: en el menú, lleva a la checklist de Squarespace',
        detail:
          'Está En preparación: su dirección y el menú llevan a la checklist de la web ' +
          'antigua. Cuando esté lista, pon «Visible en la web» en Publicada y publica.',
      },
      checklists: {
        text: 'En la web: en el menú, apagada y sin enlace',
        detail:
          'Está En preparación y sin dirección en la web antigua: sale en el menú sin enlace. ' +
          'Cuando esté lista, pon «Visible en la web» en Publicada y publica.',
      },
    },
  },
  /** El panel de control «Pendiente» (A-13, src/components/admin/Dashboard.tsx). */
  dashboard: {
    title: 'Pendiente',
    guide: '¿Dudas? Lee la guía del panel.',
    greeting: (name?: string | null) =>
      name?.trim()
        ? `Hola, ${name.trim()}. Esto es lo que tienes a medias.`
        : 'Esto es lo que tienes a medias.',
    shortcuts: 'Crear',
    create: {
      questGuide: 'Nueva guía de misión',
      dofusGuide: 'Nueva guía de Dofus',
      achievementPage: 'Nuevo logro',
      checklist: 'Nueva checklist',
      media: 'Subir una imagen',
    },
    drafts: 'Borradores sin publicar',
    draftsHelp: 'Guardados, pero aún no salen en la web. Ábrelos y pulsa «Publicar cambios».',
    draftsEmpty: 'No tienes borradores a medias.',
    neverPublished: 'Nunca publicada',
    changed: 'Cambios sin publicar',
    preparing: 'En preparación',
    preparingHelp:
      'Salen en la web apagadas, sin página. Cuando estén listas, ponlas en Publicada.',
    preparingEmpty: 'No queda nada en preparación.',
    seeAll: (total: number) => `Abrir la lista completa (${total})`,
    dofus: 'Guías de Dofus sin checklist',
    dofusHelp: 'Su página no enseña la tarjeta de la checklist: falta el enlace en «Checklist».',
    dofusEmpty: 'Todas las guías de Dofus enlazan su checklist.',
    dofusHint: (name: string) => `La checklist «${name}» ya apunta a este Dofus: pon su enlace.`,
    more: (shown: number, total: number) => `Y ${total - shown} más.`,
    recent: 'Cambios recientes',
    recentEmpty: 'Nadie ha cambiado nada todavía.',
    count: (total: number) => `(${total})`,
  },
  /** El selector de color junto a un hexadecimal (A-22, ColorField). */
  color: { pick: (label: string) => `Elegir ${label.toLowerCase()} con el selector` },
  /** Los tamaños de la vista previa en vivo (A-20). */
  livePreview: { mobile: 'Móvil', tablet: 'Tableta', desktop: 'Escritorio' },
  originalUrl: {
    label: 'Dirección en Squarespace',
    description: 'Dónde estaba en la web antigua. La pone la importación; no hace falta tocarla.',
  },
  media: {
    altDescription:
      'Describe lo que se ve, para quien no puede ver la imagen y para Google: «Torre frente ' +
      'al PNJ Ganymede en Astrub». Sin «imagen de…» y sin el nombre del archivo.',
    creditsDescription: 'Quién hizo la imagen, si no es tuya ni del juego. Opcional.',
  },
  users: {
    name: 'Nombre',
    nameDescription: 'Cómo te llamamos en el panel.',
    role: 'Permisos',
    roles: { admin: 'Administrador', editor: 'Editor' },
    roleDescription:
      'Un editor crea, edita y publica, y borra las guías que hizo a mano. Un administrador, ' +
      'además, borra lo importado y las imágenes, cambia el orden y los enlaces con DofusDB, ' +
      'y gestiona las cuentas.',
    lastAdmin: 'Tiene que quedar al menos un administrador: dale ese permiso a otra cuenta antes.',
  },
  /** Por qué un campo no se deja cambiar (docs/research/backlog.md, A-23). */
  locks: {
    order:
      'Cuando ya tiene un número, solo un administrador puede cambiarlo: mueve la página en ' +
      'las listas y el menú de la web.',
    dofusDb:
      'Cuando ya tiene uno, solo un administrador puede cambiarlo: de él salen los datos que ' +
      'se rellenan solos, y cambiarlo los mezclaría con los de otro.',
  },
  /** Una imagen que trajo DofusDB para sus datos: no se borra desde el panel (A-17). */
  gameAssetDelete:
    'Esta imagen es arte del juego: la trae DofusDB y la usan sus datos (misiones, objetos, ' +
    'monstruos, PNJ y logros). No se borra desde el panel.',
  /** Lo que se dice al negarse a borrar algo que sale en otras guías (A-17). */
  references: {
    media: { subject: 'Esta imagen', feminine: true },
    'achievement-pages': { subject: 'Esta página de logro', feminine: true },
    'achievement-groups': { subject: 'Este metalogro', feminine: false },
    'quest-guides': { subject: 'Esta guía de misión', feminine: true },
    'dofus-guides': { subject: 'Esta guía de Dofus', feminine: true },
  },
  technical: {
    label: 'Datos técnicos',
    copy: 'Copiar',
    copied: 'Copiado',
    copyLabel: (what: string) => `Copiar ${what}`,
  },
  /**
   * Palabras de Payload que cambiamos (i18n.translations.es). El estado de la cabecera dice
   * si lo guardado ya está en la web; «Visible en la web» es otra cosa, de Torre.
   */
  translations: {
    version: {
      status: 'Estado',
      draft: 'Borrador, sin publicar',
      published: 'Publicado en la web',
      changed: 'Con cambios sin publicar',
      draftHasPublishedVersion: 'Con cambios sin publicar',
      previouslyDraft: 'Era un borrador',
      previouslyPublished: 'Estaba publicado',
      aboutToUnpublish:
        'Vas a quitar esta página de la web. Seguirá aquí como borrador. ¿Seguimos?',
      aboutToRevertToPublished:
        'Vas a descartar los cambios sin publicar y volver a lo que está en la web. ¿Seguimos?',
      aboutToPublishSelection: 'Vas a publicar en la web todo lo que elegiste. ¿Seguimos?',
      aboutToUnpublishSelection:
        'Vas a quitar de la web todo lo que elegiste. Seguirá aquí como borrador. ¿Seguimos?',
      aboutToRestore: 'Vas a dejar este documento como estaba el {{versionDate}}. ¿Seguimos?',
    },
    fields: {
      collapseAll: 'Cerrar todo',
      showAll: 'Abrir todo',
    },
  },
  rowLabels: {
    step: 'Paso',
    segment: 'Tramo',
    quest: 'Misión',
    need: 'Objeto',
    group: 'Grupo',
    row: 'Fila',
    note: 'Aviso',
    achievement: 'Logro',
    dungeon: 'Mazmorra',
    /** Tras el nombre de la primera de varias misiones alternativas. */
    alternatives: (more: number) => ` (o ${more} más)`,
  },
} as const

/**
 * Una fila numerada: «Paso 3», y con su texto «Paso 3: Habla con Ganymede». `qualifier` va
 * tras el número («Tramo 2 (Detente aquí)») y `suffix` tras el texto ya cortado, así que
 * nunca se pierde («… (o 17 más)»).
 */
export function rowLabelText(
  singular: string,
  rowIndex: number | undefined,
  text?: string,
  { qualifier, suffix = '' }: { qualifier?: string; suffix?: string } = {},
) {
  const number = (rowIndex ?? 0) + 1
  const head = qualifier ? `${singular} ${number} (${qualifier})` : `${singular} ${number}`
  const clean = text?.replace(/\s+/g, ' ').trim()
  return clean ? `${head}: ${truncateLabel(clean)}${suffix}` : head
}

/** Corta un texto largo en una palabra y añade «…»: la fila cabe en una línea. */
export function truncateLabel(text: string, max = 60): string {
  if (text.length <= max) return text
  const cut = text.slice(0, max - 1)
  const space = cut.lastIndexOf(' ')
  return `${(space > max / 2 ? cut.slice(0, space) : cut).trimEnd()}…`
}

/** Dónde se abre lo que tiene dirección: una página propia, o el panel de un metalogro. */
export type AddressKind = 'page' | 'metalogro'

/**
 * La dirección completa: torrentearcano.com/aprendizaje-escudero. Un metalogro no tiene
 * página: se abre en su panel del índice, /metalogros#astrub (como metalogroHref).
 */
export function pageAddress(
  slug: string | null | undefined,
  kind: AddressKind = 'page',
): string | null {
  const clean = slug?.trim()
  if (!clean) return null
  const path = kind === 'metalogro' ? `metalogros#${clean.replace(/^metalogro-/, '')}` : clean
  return `${SITE_HOST}/${path}`
}

/** La zona horaria de Torre: las fechas del panel se escriben en su hora. */
export const TORRE_TIME_ZONE = 'Europe/Madrid'

/**
 * Cuándo cambió algo, sin depender de la zona horaria del servidor: «hace 5 minutos»,
 * «hace 3 horas», «hace 2 días»; más de un mes, la fecha en la hora de Torre.
 */
export function relativeTime(iso: string, now: Date = new Date()): string {
  const then = new Date(iso)
  const minutes = Math.floor((now.getTime() - then.getTime()) / 60_000)
  if (!Number.isFinite(minutes)) return ''
  if (minutes < 1) return 'ahora mismo'
  if (minutes < 60) return minutes === 1 ? 'hace 1 minuto' : `hace ${minutes} minutos`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return hours === 1 ? 'hace 1 hora' : `hace ${hours} horas`
  const days = Math.floor(hours / 24)
  if (days < 31) return days === 1 ? 'hace 1 día' : `hace ${days} días`
  return then.toLocaleDateString('es', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: TORRE_TIME_ZONE,
  })
}
