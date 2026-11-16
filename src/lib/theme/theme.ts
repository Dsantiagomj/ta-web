// Tema y modo (ver DESIGN.md, Themes). Son dos ajustes distintos:
// - el tema (data-theme): Amakna, Arcano, Bonta y Brâkmar son gratis y se guardan como el
//   modo; el Ocre es premium y solo sale con el derecho del miembro;
// - el modo (data-mode, oscuro o claro) es gratis y vive en una cookie.

export const THEMES = ['arcano', 'amakna', 'bonta', 'brakmar', 'ocre'] as const
export type Theme = (typeof THEMES)[number]

export const DEFAULT_THEME: Theme = 'amakna'
// Los temas de todos, en el orden del selector de la cabecera.
export const FREE_THEMES = [
  'amakna',
  'arcano',
  'bonta',
  'brakmar',
] as const satisfies readonly Theme[]
export type FreeTheme = (typeof FREE_THEMES)[number]

export const MODES = ['dark', 'light'] as const
export type Mode = (typeof MODES)[number]

export const DEFAULT_MODE: Mode = 'dark'
export const MODE_COOKIE = 'ta-mode'
export const THEME_COOKIE = 'ta-theme'
// Un año, para todo el sitio. Las dos cookies llevan los mismos atributos.
export const MODE_COOKIE_ATTRIBUTES = `Path=/; Max-Age=${60 * 60 * 24 * 365}; SameSite=Lax`

function isTheme(value: unknown): value is Theme {
  return THEMES.includes(value as Theme)
}

export function isFreeTheme(value: unknown): value is FreeTheme {
  return FREE_THEMES.includes(value as FreeTheme)
}

export function resolveMode(value: unknown): Mode {
  return MODES.includes(value as Mode) ? (value as Mode) : DEFAULT_MODE
}

/**
 * El tema que pinta el servidor. Los temas gratis salen tal cual; uno premium solo con
 * el derecho: un valor guardado, de una cookie o del cliente nunca basta por sí solo.
 */
export function resolveTheme(saved: unknown, { premium }: { premium: boolean }): Theme {
  if (!isTheme(saved)) return DEFAULT_THEME
  if (isFreeTheme(saved) || premium) return saved
  return DEFAULT_THEME
}

export function modeCookie(mode: Mode) {
  return `${MODE_COOKIE}=${mode}; ${MODE_COOKIE_ATTRIBUTES}`
}

export function themeCookie(theme: FreeTheme) {
  return `${THEME_COOKIE}=${theme}; ${MODE_COOKIE_ATTRIBUTES}`
}
