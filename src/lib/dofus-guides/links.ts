// Los enlaces que Torre escribe a mano en una guía de Dofus. Código puro: lo usan la página y
// el panel.

/**
 * Un enlace escrito a mano en el panel, solo si es una dirección del sitio («/cazadores-
 * cazados») o una web (http, https): cualquier otra cosa no se pinta como enlace.
 */
export function siteOrWebHref(link: string | null | undefined): string | undefined {
  const href = link?.trim()
  if (!href) return undefined
  if (href.startsWith('/')) return href.startsWith('//') ? undefined : href
  try {
    return ['http:', 'https:'].includes(new URL(href).protocol) ? href : undefined
  } catch {
    return undefined
  }
}
