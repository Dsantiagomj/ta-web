import { SocialIcon } from './icons'
import { siteShellStrings as s } from './strings'

/**
 * El Ko-fi de la cabecera (DESIGN.md, Layout: Ko-fi): la taza y «Ko-fi» junto a la búsqueda,
 * con el nombre completo para el lector de pantalla. El CSS decide a cada ancho si lleva su
 * texto, solo la taza o no sale; `iconOnly` fija la taza sola, para el catálogo /sistema.
 */
export function KofiHeaderButton({ url, iconOnly = false }: { url: string; iconOnly?: boolean }) {
  return (
    <a
      className={iconOnly ? 'hkofi hkofi--icon' : 'hkofi'}
      href={url}
      target="_blank"
      rel="noopener"
      aria-label={`${s.kofi.name}${s.newTab}`}
    >
      <SocialIcon name="kofi" />
      <span className="hkofi__t">{s.kofi.label}</span>
    </a>
  )
}

/** El botón del Ko-fi flotante: la taza y el título del pie de Torre (solo la taza en el móvil). */
export function KofiFab({ url, label }: { url: string; label: string }) {
  return (
    <a className="kofi-fab" href={url} target="_blank" rel="noopener">
      <SocialIcon name="kofi" />
      <span className="kofi-fab__t">{label}</span>
      <span className="sr-only">{s.newTab}</span>
    </a>
  )
}

/**
 * El Ko-fi flotante, abajo a la derecha de todo el sitio, con el enlace y el título del pie de
 * «Ajustes del sitio». Va justo antes del pie, pegado (sticky) al borde de abajo de la
 * pantalla: baja con ella por toda la página y, cuando llega el pie, donde está el grande, se
 * queda encima de él y se desvanece. Todo en CSS (site.css, que ya trae la cabecera: importarlo
 * aquí partía la hoja en una quinta): ni una línea de JavaScript.
 */
export function KofiFloat({ url, label }: { url: string; label: string }) {
  return (
    <div className="kofi-dock">
      <KofiFab url={url} label={label} />
    </div>
  )
}
