// Textos de lo que se ve al compartir un enlace (la tarjeta de /<slug>/og y /og) y de los datos
// estructurados. Un segundo idioma sería traducir este módulo.

export type ShareCardKind = 'quest' | 'achievement' | 'dofus' | 'checklist' | 'page'

export const shareStrings = {
  /** La clase de página, encima del título de la tarjeta. */
  kinds: {
    quest: 'Misión',
    achievement: 'Logro',
    dofus: 'Guía de Dofus',
    checklist: 'Checklist',
    page: 'Página',
  } satisfies Record<ShareCardKind, string>,
  /** El nombre de la marca, en dos líneas como el sello de la cabecera. */
  brand: { first: 'Torrente', second: 'Arcano', name: 'Torrente Arcano' },
  /** La línea de la tarjeta de la marca (la portada y los índices sin imagen de Torre). */
  brandLine: 'Guías de Dofus en español',
  /** El texto alternativo de la tarjeta de una página. */
  alt: (kind: string, title: string) => `${kind}: ${title}. Torrente Arcano`,
  /** El autor de las guías en el JSON-LD. */
  author: 'Torre',
}
