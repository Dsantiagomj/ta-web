import { describe, expect, it } from 'vitest'

import {
  DEFAULT_MODE,
  DEFAULT_THEME,
  FREE_THEMES,
  MODE_COOKIE,
  modeCookie,
  resolveMode,
  resolveTheme,
  THEME_COOKIE,
  themeCookie,
  THEMES,
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
  it('da Amakna a quien no tiene tema guardado', () => {
    expect(DEFAULT_THEME).toBe('amakna')
    expect(resolveTheme(undefined, { premium: false })).toBe('amakna')
    expect(resolveTheme(undefined, { premium: true })).toBe('amakna')
  })

  it('ofrece gratis Amakna, Arcano, Bonta y Brâkmar, en ese orden', () => {
    expect(FREE_THEMES).toEqual(['amakna', 'arcano', 'bonta', 'brakmar'])
    for (const theme of FREE_THEMES) {
      expect(resolveTheme(theme, { premium: false })).toBe(theme)
    }
  })

  it('nunca da el Ocre sin el derecho, aunque esté guardado', () => {
    expect(THEMES).toContain('ocre')
    expect(resolveTheme('ocre', { premium: false })).toBe('amakna')
  })

  it('da el Ocre guardado a quien tiene el derecho', () => {
    expect(resolveTheme('ocre', { premium: true })).toBe('ocre')
    expect(resolveTheme('brakmar', { premium: true })).toBe('brakmar')
  })

  it('ignora temas que no existen', () => {
    expect(resolveTheme('frigost', { premium: true })).toBe('amakna')
    expect(resolveTheme('BONTA', { premium: false })).toBe('amakna')
    expect(resolveTheme('', { premium: false })).toBe('amakna')
  })
})

describe('modeCookie', () => {
  it('guarda el modo un año para todo el sitio', () => {
    expect(MODE_COOKIE).toBe('ta-mode')
    expect(modeCookie('light')).toBe('ta-mode=light; Path=/; Max-Age=31536000; SameSite=Lax')
  })
})

describe('themeCookie', () => {
  it('guarda el tema un año para todo el sitio, como el modo', () => {
    expect(THEME_COOKIE).toBe('ta-theme')
    expect(themeCookie('bonta')).toBe('ta-theme=bonta; Path=/; Max-Age=31536000; SameSite=Lax')
  })
})
