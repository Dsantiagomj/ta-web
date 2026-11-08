/**
 * La web de Torre en Squarespace, que sigue sirviendo lo que la app aún no tiene: los
 * Dofus, los checklists, las clases, las mazmorras y las páginas legales. Las misiones y
 * los logros ya viven aquí y nunca enlazan allí. Cada página tendrá aquí el mismo slug
 * (docs/legacy/plan.md); cuando la app tenga la suya, su enlace pasa a ser relativo.
 */
export const LEGACY_SITE_ORIGIN = 'https://www.torrentearcano.com'

/** El enlace a una página que aún vive en la web de siempre. */
export const legacyHref = (slug: string) => `${LEGACY_SITE_ORIGIN}/${slug}`
