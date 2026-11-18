import { readFileSync } from 'node:fs'

import { NextRequest } from 'next/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { NOINDEX_HEADER } from '@/lib/dev-gate/dev-gate'
import { GONE_COLORS, gonePage } from '@/lib/redirects/gone-page'
import { readPalette } from '@/lib/theme/palette'
import { FREE_THEMES, MODES } from '@/lib/theme/theme'
import { proxy } from '@/proxy'

// El proxy aplica la tabla de URL antiguas (src/lib/redirects/table.ts) antes de llegar a la
// página: 301 a la página nueva, 410 con una página corta en español, o sigue.

const request = (path: string) => new NextRequest(`http://localhost:3000${path}`)

describe('proxy y la tabla de URL antiguas', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('una URL movida da un 301 directo a su página, sin la query', () => {
    const response = proxy(request('/home?format=json'))

    expect(response.status).toBe(301)
    expect(response.headers.get('location')).toBe('http://localhost:3000/')
  })

  it('el Location lleva el origen público, no el host interno del proxy de Railway', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://www.torrentearcano.com')
    const response = proxy(new NextRequest('http://10.0.0.5:8080/metalogro-astrub'))

    expect(response.status).toBe(301)
    expect(response.headers.get('location')).toBe(
      'https://www.torrentearcano.com/metalogros#astrub',
    )
  })

  it('un esbozo, sección que aún cambia, redirige con 307', () => {
    const response = proxy(request('/no-hay-cosa-mas-sana-que-una-manzana'))

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe('http://localhost:3000/un-ciudadano-modelo')
  })

  it('un metalogro va al ancla de su panel en /metalogros', () => {
    const response = proxy(request('/metalogro-astrub'))

    expect(response.status).toBe(301)
    expect(response.headers.get('location')).toBe('http://localhost:3000/metalogros#astrub')
  })

  it('tolera mayúsculas y la barra final', () => {
    const response = proxy(request('/Logros/'))

    expect(response.status).toBe(301)
    expect(response.headers.get('location')).toBe('http://localhost:3000/metalogros')
  })

  it('una URL desaparecida da 410 con la página en español', async () => {
    const response = proxy(request('/cart'))

    expect(response.status).toBe(410)
    expect(response.headers.get('content-type')).toBe('text/html; charset=utf-8')
    expect(response.headers.get('x-middleware-next')).toBeNull()
    expect(await response.text()).toBe(gonePage())
  })

  it('lo que no está en la tabla sigue hasta la página', () => {
    const response = proxy(request('/aprendizaje-escudero'))

    expect(response.status).toBe(200)
    expect(response.headers.get('x-middleware-next')).toBe('1')
  })

  it('en dev el 301 y el 410 también llevan noindex', () => {
    vi.stubEnv('APP_ENV', 'dev')

    expect(proxy(request('/home')).headers.get('x-robots-tag')).toBe(NOINDEX_HEADER)
    expect(proxy(request('/cart')).headers.get('x-robots-tag')).toBe(NOINDEX_HEADER)
  })
})

describe('gonePage', () => {
  it('es una página corta en español, sin hojas de estilo ni scripts externos', () => {
    const html = gonePage()

    expect(html).toMatch(/^<!doctype html>/i)
    expect(html).toMatch(/<html lang="es"/)
    expect(html).toMatch(/<meta name="robots" content="noindex"/)
    expect(html).toMatch(/Esta página ya no existe/)
    expect(html).toMatch(/href="\/"/)
    expect(html).not.toMatch(/<link[^>]+stylesheet/)
    expect(html).not.toMatch(/<script/)
  })
})

describe('el aspecto del 410', () => {
  it('va a la izquierda, con los márgenes del sitio, no en una columna centrada', () => {
    const html = gonePage()
    expect(html).not.toMatch(/margin:\s*0 auto/)
    expect(html).toMatch(/max-width:62ch/)
  })

  it('no pide Montserrat por su nombre: la página no carga fuentes, usa las del sistema', () => {
    expect(gonePage()).not.toMatch(/Montserrat/)
    expect(gonePage()).toMatch(/system-ui/)
  })

  it('«Volver a la portada» es el botón principal relleno', () => {
    expect(gonePage()).toMatch(/<a class="btn" href="\/">Volver a la portada<\/a>/)
  })
})

describe('los colores del 410', () => {
  it('son los de cada tema gratis en theme.css, en los dos modos', () => {
    const palette = readPalette(readFileSync('src/styles/theme.css', 'utf8'))
    for (const theme of FREE_THEMES) {
      for (const mode of MODES) {
        const t = palette[`${theme}-${mode}`]
        expect(GONE_COLORS[`${theme}-${mode}`], `${theme} ${mode}`).toEqual({
          bg: t.bg,
          ink: t.ink,
          ink2: t['ink-2'],
          btn: t.btn,
          btnInk: t['btn-ink'],
        })
      }
    }
  })

  it('sin cookie es Amakna oscuro, el tema por defecto', () => {
    expect(gonePage()).toContain(`background:${GONE_COLORS['amakna-dark'].bg}`)
  })

  it('sigue el modo y el tema del visitante', () => {
    const response = proxy(
      new NextRequest('http://localhost:3000/cart', {
        headers: { cookie: 'ta-mode=light; ta-theme=bonta' },
      }),
    )
    return response.text().then((html) => expect(html).toBe(gonePage('light', 'bonta')))
  })

  it('el Ocre, premium, pinta Amakna como el resto del sitio sin el derecho', () => {
    const response = proxy(
      new NextRequest('http://localhost:3000/cart', { headers: { cookie: 'ta-theme=ocre' } }),
    )
    return response.text().then((html) => expect(html).toBe(gonePage('dark', 'amakna')))
  })
})
