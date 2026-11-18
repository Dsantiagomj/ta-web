// Los enlaces de Torre a su propia web («/emote-soltar-los-gases»), al importarlos: se quedan
// relativos si este sitio ya responde esa ruta y, si no, llevan a su página en Squarespace,
// para no enlazar a un 404. Al repetir la importación cuando la página ya existe, el enlace
// vuelve a ser relativo (si Torre no tocó ese campo). La regla es la de las páginas
// (src/lib/site/site-links.ts); aquí solo se guardan los relativos. Código puro.
import { siteLinkHref } from '@/lib/site/site-links'

/**
 * El enlace que se guarda. live dice si /<slug> es una página que el sitio enseña; las rutas
 * propias (/metalogros) y las URL de la tabla de redirecciones también las responde.
 */
export function siteHref(href: string, live: (slug: string) => boolean): string {
  if (!href.startsWith('/') || href.startsWith('//') || href === '/') return href
  return siteLinkHref(href, live)
}
