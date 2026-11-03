import type { Mode } from '@/lib/theme/theme'

export const modeToggleStrings = {
  label: 'Modo claro',
  current: { dark: 'Modo oscuro', light: 'Modo claro' } satisfies Record<Mode, string>,
  action: 'Pulsa para cambiar',
}

// Los huevos del medallón: iconos de objeto del juego (Marfil 23011, Ébano 23007). En
// public/img/mode están el PNG original y sus variantes AVIF y WebP a 1x y 2x
// (scripts/build-mode-eggs.ts).
export type ModeEgg = { name: string; file: string }

export const EGG_SIZE = 28

export const modeEggs: Record<Mode, ModeEgg> = {
  light: { name: 'Dofus Marfil', file: '/img/mode/dofus-marfil' },
  dark: { name: 'Dofus Ébano', file: '/img/mode/dofus-ebano' },
}

export function eggSrcSet(egg: ModeEgg, format: 'avif' | 'webp') {
  return [1, 2].map((scale) => `${egg.file}-${EGG_SIZE * scale}.${format} ${scale}x`).join(', ')
}

export function modeSwitchTitle(mode: Mode) {
  return `${modeToggleStrings.current[mode]} · ${modeEggs[mode].name}. ${modeToggleStrings.action}`
}
