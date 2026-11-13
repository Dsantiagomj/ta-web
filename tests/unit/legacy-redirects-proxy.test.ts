import { readFileSync } from 'node:fs'

import { NextRequest } from 'next/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { NOINDEX_HEADER } from '@/lib/dev-gate/dev-gate'
import { GONE_COLORS, gonePage } from '@/lib/redirects/gone-page'
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
    const response = proxy(request('/corazon-de-piedra'))

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe('http://localhost:3000/la-larga-marcha')
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

describe('los colores del 410', () => {
  it('son los de Arcano en theme.css, en los dos modos', () => {
    const css = readFileSync('src/styles/theme.css', 'utf8')
    const block = (selector: string) => css.slice(css.indexOf(selector)).split('}')[0]
    const dark = block(":root,\n[data-theme='arcano'][data-mode='dark']")
    const light = block("[data-theme='arcano'][data-mode='light']")
    for (const [mode, tokens] of [
      ['dark', dark],
      ['light', light],
    ] as const) {
      const c = GONE_COLORS[mode]
      expect(tokens).toContain(`--t-bg: ${c.bg};`)
      expect(tokens).toContain(`--t-ink: ${c.ink};`)
      expect(tokens).toContain(`--t-ink-2: ${c.ink2};`)
      expect(tokens).toContain(`--t-accent: ${c.accent};`)
    }
  })

  it('sigue el modo del visitante', () => {
    const response = proxy(
      new NextRequest('http://localhost:3000/cart', { headers: { cookie: 'ta-mode=light' } }),
    )
    return response.text().then((html) => expect(html).toBe(gonePage('light')))
  })
})
