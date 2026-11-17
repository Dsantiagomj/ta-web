import { EMBLEM_ART } from '@/components/brand/emblem-art'
import { FREE_THEMES, type Mode, type Theme } from '@/lib/theme/theme'

import { themeNames, themePickerLabel, themePickerStrings as s } from './strings'

// El selector de tema de la cabecera (DESIGN.md, Theme picker). Se pinta en el servidor con
// el tema y el modo de las cookies; lo que hace (abrir el menú, mover el foco, aplicar el
// tema) está en picker-ui.ts, que HeaderIsland carga con import() al primer uso, para no
// sumar JavaScript a la carga de las páginas de guía (AGENTS.md, Next rules). Los estilos van
// en theme-picker.css, que importa site.css.

export const THEME_MENU_ID = 'tema-menu'
const THEME_TITLE_ID = 'tema-titulo'

function Hat({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 3 64 39" aria-hidden="true" focusable="false">
      <path d={EMBLEM_ART.hat} />
    </svg>
  )
}

export function ThemePicker({
  initialTheme,
  initialMode,
  idPrefix = '',
}: {
  initialTheme: Theme
  initialMode: Mode
  /** Para pintar varios en una página (el catálogo /sistema) sin repetir ids. */
  idPrefix?: string
}) {
  const menuId = `${idPrefix}${THEME_MENU_ID}`
  const titleId = `${idPrefix}${THEME_TITLE_ID}`
  return (
    <div className="tp" data-theme-picker data-current={initialTheme}>
      <button
        type="button"
        className="tp-btn"
        aria-label={themePickerLabel(initialTheme)}
        aria-haspopup="menu"
        aria-expanded="false"
        aria-controls={menuId}
      >
        <Hat className="tp-hat" />
        <svg className="tp-chev" viewBox="0 0 12 12" aria-hidden="true" focusable="false">
          <path d="M3 4.5l3 3 3-3" />
        </svg>
      </button>
      <div className="tp-pop" hidden>
        <p className="tp-pop__h" id={titleId}>
          {s.menu}
        </p>
        <div id={menuId} role="menu" aria-labelledby={titleId}>
          {FREE_THEMES.map((option) => (
            <button
              key={option}
              type="button"
              role="menuitemradio"
              aria-checked={option === initialTheme}
              tabIndex={-1}
              className="tp-opt"
              data-set-theme={option}
            >
              <span
                className="tp-sw"
                data-theme={option}
                data-mode={initialMode}
                aria-hidden="true"
              >
                <Hat />
              </span>
              <span className="tp-name">{themeNames[option]}</span>
              <svg className="tp-check" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                <path d="M3 8.5l3 3 7-7" />
              </svg>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
