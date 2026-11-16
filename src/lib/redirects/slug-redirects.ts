// Las redirecciones de dirección cambiada (AGENTS.md, Redirects): cuando Torre cambia el slug
// de una página publicada, /<viejo> lleva a /<nuevo> con un 308. Viven en la colección
// redirects, que Torre ve y edita en el panel; las crea el hook de cada colección de la raíz
// (src/collections/slug-redirects.ts). Esto es la lógica pura: seguir una cadena, validar una
// fila y saber cuándo un guardado mueve una dirección. La página /[slug] solo mira la tabla
// cuando no encuentra nada con ese slug, así que una fila vieja nunca tapa una página.

import { slugProblem } from '../admin/slug'
import type { RootSlugCollection } from '../../collections/root-slug'

/**
 * Las colecciones cuya dirección vieja redirige: las de la raíz con página propia. Los
 * metalogros no: su slug es el ancla de su panel en /metalogros, y un ancla no llega al
 * servidor.
 */
export const SLUG_REDIRECT_COLLECTIONS = [
  'quest-guides',
  'achievement-pages',
  'dofus-guides',
  'checklists',
  'pages',
  'class-pages',
  'dungeon-pages',
] as const satisfies readonly RootSlugCollection[]

export type SlugRedirectCollection = (typeof SLUG_REDIRECT_COLLECTIONS)[number]

/** Más saltos que estos es una tabla rota: mejor un 404 que dar vueltas. */
const MAX_HOPS = 8

/**
 * Adónde lleva /<slug>, siguiendo la cadena hasta el final (A → B → C da C), o null si no
 * redirige o si la cadena da la vuelta. Las filas se guardan ya acortadas; seguirlas aquí
 * cubre una tabla a medio arreglar.
 */
export function redirectTarget(rows: ReadonlyMap<string, string>, slug: string): string | null {
  const start = slug.toLowerCase()
  const seen = new Set([start])
  let current = start
  for (let hop = 0; hop < MAX_HOPS; hop++) {
    const next = rows.get(current)
    if (next === undefined) return current === start ? null : current
    if (seen.has(next)) return null
    seen.add(next)
    current = next
  }
  return null
}

/**
 * El destino final de una fila from → to, acortando la cadena de las otras filas (si B ya
 * lleva a C, A → B se guarda A → C), o un bucle si acaba volviendo a from. La fila vieja de
 * from no cuenta: es la que se está editando.
 */
export function chainEnd(
  rows: ReadonlyMap<string, string>,
  from: string,
  to: string,
): { to: string } | { loop: true } {
  const seen = new Set([from])
  let current = to
  for (let hop = 0; hop <= rows.size; hop++) {
    if (seen.has(current)) return { loop: true }
    seen.add(current)
    const next = current === from ? undefined : rows.get(current)
    if (next === undefined) return { to: current }
    current = next
  }
  return { loop: true }
}

/** Qué campo de una fila no vale y por qué (el mensaje para Torre), o null si vale. */
export function redirectProblem(
  from: string,
  to: string,
): { path: 'from' | 'to'; message: string } | null {
  const fromProblem = slugProblem(from)
  if (fromProblem) return { path: 'from', message: fromProblem }
  const toProblem = slugProblem(to)
  return toProblem ? { path: 'to', message: toProblem } : null
}

/** Lo publicado de un documento antes de guardarlo: su estado y su slug. */
export interface PublishedSlug {
  status: string | null | undefined
  slug: string | null | undefined
}

/**
 * Si un guardado mueve la dirección pública: solo al publicar con un slug distinto del que
 * estaba publicado. Un borrador no la mueve (la web sigue con la publicada), y lo que nunca
 * se publicó no tenía dirección que conservar.
 */
export function slugMove(
  published: PublishedSlug | null,
  slug: string | null | undefined,
  status: string | null | undefined,
): { from: string; to: string } | null {
  if (status !== 'published' || published?.status !== 'published') return null
  if (!published.slug || !slug || published.slug === slug) return null
  return { from: published.slug, to: slug }
}
