import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { EMBLEM_ART } from '@/components/brand/emblem-art'
import { themeNames, themePickerLabel } from '@/components/theme-picker/strings'
import { ThemePicker } from '@/components/theme-picker/ThemePicker'
import type { Mode, Theme } from '@/lib/theme/theme'

// El selector de tema de la cabecera (DESIGN.md, Theme picker), tal como lo pinta el servidor.

const markup = (theme: Theme, mode: Mode = 'dark') =>
  renderToStaticMarkup(<ThemePicker initialTheme={theme} initialMode={mode} />)

describe('ThemePicker', () => {
  it('es un botón de menú con el nombre del tema actual', () => {
    const html = markup('arcano')
    expect(html).toContain('aria-label="Tema: Torrente Arcano"')
    expect(html).toContain('aria-haspopup="menu"')
    expect(html).toContain('aria-expanded="false"')
    const controls = /aria-controls="([^"]+)"/.exec(html)?.[1]
    expect(controls).toBeTruthy()
    expect(html).toContain(`id="${controls}" role="menu"`)
  })

  it('ofrece los cuatro temas gratis en orden, con el actual marcado, y nunca el Ocre', () => {
    const html = markup('bonta')
    const items = [...html.matchAll(/role="menuitemradio"[^>]*aria-checked="(true|false)"/g)]
    expect(items.map(([, checked]) => checked)).toEqual(['false', 'false', 'true', 'false'])
    const names = [...html.matchAll(/<span class="tp-name">([^<]+)<\/span>/g)].map(([, n]) => n)
    expect(names).toEqual(['Amakna', 'Torrente Arcano', 'Bonta', 'Brâkmar'])
    expect(html).not.toContain('Ocre')
    expect(html).not.toContain('data-theme="ocre"')
  })

  it('cada muestra lleva su tema y el modo actual, para que sus tokens se resuelvan', () => {
    const html = markup('amakna', 'light')
    for (const theme of ['amakna', 'arcano', 'bonta', 'brakmar']) {
      expect(html).toContain(`data-theme="${theme}" data-mode="light"`)
    }
  })

  it('dibuja el sombrero del emblema', () => {
    expect(markup('amakna').split(EMBLEM_ART.hat).length - 1).toBe(5)
  })

  it('el menú empieza cerrado', () => {
    expect(markup('amakna')).toMatch(/class="tp-pop"[^>]*hidden=""/)
  })
})

describe('strings del selector', () => {
  it('nombra cada tema, el Ocre incluido para quien lo tenga', () => {
    expect(themeNames).toEqual({
      amakna: 'Amakna',
      arcano: 'Torrente Arcano',
      bonta: 'Bonta',
      brakmar: 'Brâkmar',
      ocre: 'Ocre',
    })
    expect(themePickerLabel('brakmar')).toBe('Tema: Brâkmar')
  })
})
