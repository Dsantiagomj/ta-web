// Textos del panel de Payload que no son de una colección: los grupos del menú, las
// palabras de Payload que cambiamos, la marca, la dirección en la web y las etiquetas de
// las filas. Escritos para Torre, de tú y sin jerga. Un segundo idioma sería traducir este
// módulo.

/** El dominio que Torre conoce: la dirección en la web se enseña con él. */
export const SITE_HOST = 'torrentearcano.com'

export const panelStrings = {
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
    achievement: 'Logro',
  },
} as const

/** Una fila numerada: «Paso 3», y con su texto «Paso 3: Habla con Ganymede». */
export function rowLabelText(singular: string, rowIndex: number | undefined, text?: string) {
  const number = (rowIndex ?? 0) + 1
  const head = `${singular} ${number}`
  const clean = text?.replace(/\s+/g, ' ').trim()
  return clean ? `${head}: ${truncateLabel(clean)}` : head
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
