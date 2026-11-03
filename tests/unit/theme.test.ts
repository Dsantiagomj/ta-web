import { describe, expect, it } from 'vitest'

import {
  DEFAULT_MODE,
  DEFAULT_THEME,
  MODE_COOKIE,
  modeCookie,
  resolveMode,
  resolveTheme,
} from '@/lib/theme/theme'

describe('resolveMode', () => {
  it('acepta dark y light', () => {
    expect(resolveMode('dark')).toBe('dark')
    expect(resolveMode('light')).toBe('light')
  })

  it('vuelve a oscuro con un valor ausente o desconocido', () => {
    expect(DEFAULT_MODE).toBe('dark')
    expect(resolveMode(undefined)).toBe('dark')
    expect(resolveMode('')).toBe('dark')
    expect(resolveMode('sepia')).toBe('dark')
    expect(resolveMode('LIGHT')).toBe('dark')
  })
})

describe('resolveTheme', () => {
  it('da Arcano a quien no tiene tema guardado', () => {
    expect(DEFAULT_THEME).toBe('arcano')
    expect(resolveTheme(undefined, { premium: false })).toBe('arcano')
    expect(resolveTheme(undefined, { premium: true })).toBe('arcano')
  })

  it('nunca da un tema premium sin el derecho, aunque esté guardado', () => {
    for (const theme of ['amakna', 'bonta', 'brakmar', 'ocre']) {
      expect(resolveTheme(theme, { premium: false })).toBe('arcano')
    }
  })

  it('da el tema premium guardado a quien tiene el derecho', () => {
    expect(resolveTheme('brakmar', { premium: true })).toBe('brakmar')
    expect(resolveTheme('ocre', { premium: true })).toBe('ocre')
  })

  it('ignora temas que no existen', () => {
    expect(resolveTheme('frigost', { premium: true })).toBe('arcano')
  })
})

describe('modeCookie', () => {
  it('guarda el modo un año para todo el sitio', () => {
    expect(MODE_COOKIE).toBe('ta-mode')
    expect(modeCookie('light')).toBe('ta-mode=light; Path=/; Max-Age=31536000; SameSite=Lax')
  })
})
