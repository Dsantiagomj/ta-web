// Textos del panel de Payload que no son de una colección: los grupos del menú, las
// palabras de Payload que cambiamos, la marca, la dirección en la web y las etiquetas de
// las filas. Escritos para Torre, de tú y sin jerga. Un segundo idioma sería traducir este
// módulo.

/** El dominio que Torre conoce: la dirección en la web se enseña con él. */
export const SITE_HOST = 'torrentearcano.com'

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
