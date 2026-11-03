import type { Mode } from '@/lib/theme/theme'

export const modeToggleStrings = {
  label: 'Modo claro',
  current: { dark: 'Modo oscuro', light: 'Modo claro' } satisfies Record<Mode, string>,
  action: 'Pulsa para cambiar',
}

// Los huevos del medallón: iconos de objeto del juego (Marfil 23011, Ébano 23007).
export const modeEggs: Record<Mode, { name: string; src: string }> = {
  light: { name: 'Dofus Marfil', src: '/img/mode/dofus-marfil.png' },
  dark: { name: 'Dofus Ébano', src: '/img/mode/dofus-ebano.png' },
}

export function modeSwitchTitle(mode: Mode) {
  return `${modeToggleStrings.current[mode]} · ${modeEggs[mode].name}. ${modeToggleStrings.action}`
}
