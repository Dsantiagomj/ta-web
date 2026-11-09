import { siteShellStrings } from './strings'

/**
 * La etiqueta de lo que aún no tiene página (Clases y Mazmorras), en el menú, el pie y la
 * portada. Sus estilos van en site.css, que cargan la cabecera y el pie de todas las páginas.
 */
export function Soon() {
  return <span className="soon">{siteShellStrings.soon}</span>
}
