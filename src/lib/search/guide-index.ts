// El índice de la búsqueda de la cabecera y de la portada (DESIGN.md, Layout: Search): las
// guías de misiones, las páginas de logro, los metalogros y, para la portada, las guías de
// Dofus, las checklists y las páginas sueltas. Hasta que exista la búsqueda de
// texto completo en Postgres, se busca por nombre en este índice: la isla lo pide la primera
// vez que se usa la búsqueda. Solo tipos y la URL: lo carga también el motor del navegador
// (search.ts); lo lee del servidor read-index.ts.

/** Donde lo sirve el endpoint de src/endpoints/search-index.ts. */
export const GUIDE_SEARCH_INDEX_URL = '/api/search/guides'

/** Una guía: título, slug, logro de su misión y nivel mínimo. Tuplas: el JSON pesa menos. */
export type GuideIndexRow = [
  title: string,
  slug: string,
  achievement: string | null,
  level: number | null,
]

/** Una página de logro publicada: nombre, slug, su metalogro y cuántas misiones tiene. */
export type AchievementIndexRow = [name: string, slug: string, group: string, quests: number]

/** Un metalogro que se abre: nombre, su ancla en /metalogros y la línea de sus cifras. */
export type MetalogroIndexRow = [name: string, anchor: string, counts: string]

/** Lo que también enlaza el menú y la portada busca: los tipos de ContentIndexRow. */
export const CONTENT_TYPES = ['dofus', 'checklist', 'pagina'] as const
export type ContentType = (typeof CONTENT_TYPES)[number]

/**
 * Una guía de Dofus, una checklist o una página suelta que se abre: tipo, nombre, enlace (su
 * página, o la de Squarespace de una checklist En preparación, como en el menú) y su huevo.
 */
export type ContentIndexRow = [type: ContentType, name: string, href: string, image: string | null]

/**
 * El índice de la búsqueda: las guías y, desde que se buscan logros, las páginas de logro y
 * los metalogros; desde que la portada lo busca todo, el resto del contenido. Todo menos las
 * guías es opcional: una respuesta vieja en la caché del navegador sigue valiendo.
 */
export interface SearchIndex {
  guides: GuideIndexRow[]
  achievements?: AchievementIndexRow[]
  metalogros?: MetalogroIndexRow[]
  content?: ContentIndexRow[]
}
