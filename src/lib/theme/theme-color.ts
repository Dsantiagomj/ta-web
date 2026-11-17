// El color de la barra del navegador en el móvil (<meta name="theme-color">): el de la barra de
// la cabecera (--t-bar de src/styles/theme.css) en el tema y el modo que pinta el servidor, así
// que la barra del navegador y la de la web son una sola. tests/unit/theme-color.test.ts
// comprueba que siguen siendo los de theme.css.

import type { Mode, Theme } from './theme'

export const BAR_COLORS: Record<`${Theme}-${Mode}`, string> = {
  'amakna-dark': '#000000',
  'amakna-light': '#fffdf8',
  'arcano-dark': '#07060d',
  'arcano-light': '#ffffff',
  'bonta-dark': '#060912',
  'bonta-light': '#ffffff',
  'brakmar-dark': '#070302',
  'brakmar-light': '#ffffff',
  'ocre-dark': '#080603',
  'ocre-light': '#fffaf0',
}

/** El color de la barra y el esquema de color del tema y el modo de la página. */
export function themeViewport(theme: Theme, mode: Mode) {
  return { themeColor: BAR_COLORS[`${theme}-${mode}`], colorScheme: mode }
}
