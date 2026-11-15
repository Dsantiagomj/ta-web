/**
 * La web de Torre en Squarespace, que sigue sirviendo lo que la app aún no tiene: las
 * clases, las mazmorras y lo que esté En preparación (checklists y páginas sueltas). Las
 * misiones y los logros ya viven aquí y nunca enlazan allí. Cada página tendrá aquí el mismo
 * slug (docs/legacy/plan.md); cuando la app tenga la suya, su enlace pasa a ser relativo.
 */
export const LEGACY_SITE_ORIGIN = 'https://www.torrentearcano.com'

/** El enlace a una página que aún vive en la web de siempre. */
export const legacyHref = (slug: string) => `${LEGACY_SITE_ORIGIN}/${slug}`

/** Lo que hace /<slug> con algo que puede seguir en Squarespace. */
export type LegacyRoute = { kind: 'page' } | { kind: 'legacy'; href: string } | { kind: 'none' }

/**
 * La regla de lo que tiene `state` y `legacyHref` (checklists y páginas sueltas): lo
 * Publicado tiene página; lo En preparación no y lleva a su página de Squarespace, salvo que
 * ese enlace sea esta misma web, que daría vueltas sin fin. La vista previa del panel siempre
 * pinta la página.
 */
export function legacyRoute(
  doc: { state?: string | null; legacyHref?: string | null },
  preview: boolean,
  siteUrl: string,
): LegacyRoute {
  if (preview || doc.state === 'published') return { kind: 'page' }
  const href = doc.legacyHref
  if (!href) return { kind: 'none' }
  try {
    if (new URL(href).origin === new URL(siteUrl).origin) return { kind: 'none' }
  } catch {
    return { kind: 'none' }
  }
  return { kind: 'legacy', href }
}
