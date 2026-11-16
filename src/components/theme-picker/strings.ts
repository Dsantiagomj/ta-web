import type { Theme } from '@/lib/theme/theme'

// Los textos del selector de tema de la cabecera.

export const themePickerStrings = {
  menu: 'Tema',
}

// El nombre de cada tema. El Ocre no sale en el selector, pero un miembro con el derecho lo
// verá en el nombre del botón.
export const themeNames: Record<Theme, string> = {
  amakna: 'Amakna',
  arcano: 'Torrente Arcano',
  bonta: 'Bonta',
  brakmar: 'Brâkmar',
  ocre: 'Ocre',
}

export function themePickerLabel(theme: Theme) {
  return `${themePickerStrings.menu}: ${themeNames[theme]}`
}
