// Tema y modo (ver DESIGN.md, Themes). Son dos ajustes distintos:
// - el tema (data-theme) lo decide el servidor según el derecho del miembro;
// - el modo (data-mode, oscuro o claro) es gratis y vive en una cookie.

export const THEMES = ['arcano', 'amakna', 'bonta', 'brakmar', 'ocre'] as const
export type Theme = (typeof THEMES)[number]

export const DEFAULT_THEME: Theme = 'arcano'
const FREE_THEMES: readonly Theme[] = ['arcano']

export const MODES = ['dark', 'light'] as const
export type Mode = (typeof MODES)[number]

export const DEFAULT_MODE: Mode = 'dark'
export const MODE_COOKIE = 'ta-mode'
// Un año, para todo el sitio.
export const MODE_COOKIE_ATTRIBUTES = `Path=/; Max-Age=${60 * 60 * 24 * 365}; SameSite=Lax`

function isTheme(value: unknown): value is Theme {
  return THEMES.includes(value as Theme)
}

export function resolveMode(value: unknown): Mode {
  return MODES.includes(value as Mode) ? (value as Mode) : DEFAULT_MODE
}

/**
 * El tema que pinta el servidor. Un tema premium solo sale con el derecho;
 * un valor guardado, de una cookie o del cliente nunca basta por sí solo.
 */
export function resolveTheme(saved: unknown, { premium }: { premium: boolean }): Theme {
  if (!isTheme(saved)) return DEFAULT_THEME
  if (FREE_THEMES.includes(saved) || premium) return saved
  return DEFAULT_THEME
}

export function modeCookie(mode: Mode) {
  return `${MODE_COOKIE}=${mode}; ${MODE_COOKIE_ATTRIBUTES}`
}
