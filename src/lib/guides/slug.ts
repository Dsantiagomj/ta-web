// La URL de una guía es /<slug>, en la raíz del sitio (AGENTS.md, Language). Sin
// dependencias: lo usan la colección, el hook de autorrelleno y la página.

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/**
 * Rutas de primer nivel del sitio: ganan a /[slug], así que una guía con ese slug no se
 * vería nunca. Cada ruta nueva de primer nivel se añade aquí.
 */
export const RESERVED_SLUGS: readonly string[] = ['admin', 'api', 'sistema', 'vista-previa']

/** Slug plano en ASCII: minúsculas, cifras y guiones sueltos, sin guiones en los extremos. */
export function isSlugFormat(value: string | null | undefined): value is string {
  return Boolean(value && SLUG.test(value))
}

export function isReservedSlug(value: string): boolean {
  return RESERVED_SLUGS.includes(value)
}

/** Si el valor puede ser la URL de una guía: buen formato y sin chocar con otra ruta. */
export function isGuideSlug(value: string | null | undefined): value is string {
  return isSlugFormat(value) && !isReservedSlug(value)
}
