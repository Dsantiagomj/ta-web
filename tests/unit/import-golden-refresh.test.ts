import { describe, expect, it } from 'vitest'

import type { GoldenPage } from '../../scripts/import/golden/catalog'
import { refreshGoldenPages, type RefreshDeps } from '../../scripts/import/golden/refresh'
import { stableJson } from '../../scripts/import/golden/stable-json'

// pnpm import:golden-refresh vuelve a bajar las páginas de oro de la web de Torre, una tras
// otra y con pausa, guarda su fuente recortada y enseña en qué cambia lo que sale del conversor
// respecto a la salida revisada. No toca las salidas: se aceptan con pnpm test:import -u.

const pages: GoldenPage[] = [
  { slug: 'uno', kind: 'quest', why: 'prueba' },
  { slug: 'dos', kind: 'page', why: 'prueba' },
]

const html = (text: string) =>
  `<html><head><title>${text}</title><script>analytics()</script></head>` +
  `<body><header>Menú</header><article><p>${text}</p></article></body></html>`

/** Un conversor de juguete: el texto del primer párrafo. */
const convert = (_page: GoldenPage, source: string) => ({
  text: /<p>(.*?)<\/p>/.exec(source)?.[1] ?? null,
})

function setup(overrides: Partial<RefreshDeps> = {}) {
  const calls: string[] = []
  const written = new Map<string, string>()
  const live: Record<string, { status: number; url: string; html: string }> = {
    uno: { status: 200, url: 'https://www.torrentearcano.com/uno', html: html('nuevo') },
    dos: { status: 200, url: 'https://www.torrentearcano.com/dos', html: html('igual') },
  }
  const expected: Record<string, string> = {
    uno: stableJson({ text: 'viejo' }),
    dos: stableJson({ text: 'igual' }),
  }
  const deps: RefreshDeps = {
    pages,
    fetchPage: async (slug) => {
      calls.push(`fetch ${slug}`)
      return live[slug]!
    },
    readExpected: async (slug) => expected[slug] ?? null,
    writeSource: async (slug, source) => {
      calls.push(`write ${slug}`)
      written.set(slug, source)
    },
    convert,
    sleep: async (ms) => {
      calls.push(`sleep ${ms}`)
    },
    delayMs: 1500,
    ...overrides,
  }
  return { deps, calls, written, live }
}

describe('refreshGoldenPages', () => {
  it('baja las páginas una tras otra, con una pausa entre ellas, y guarda la fuente recortada', async () => {
    const { deps, calls, written } = setup()
    await refreshGoldenPages(deps)
    expect(calls).toEqual(['fetch uno', 'write uno', 'sleep 1500', 'fetch dos', 'write dos'])
    expect(written.get('uno')).toContain('<article><p>nuevo</p></article>')
    expect(written.get('uno')).not.toContain('Menú')
    expect(written.get('uno')).not.toContain('analytics')
  })

  it('enseña el diff de la salida de las páginas que cambiaron y lista las que no', async () => {
    const { deps } = setup()
    const report = await refreshGoldenPages(deps)
    expect(report.changed).toEqual([
      {
        slug: 'uno',
        diff: ['@@ -1,3 +1,3 @@', ' {', '-  "text": "viejo"', '+  "text": "nuevo"', ' }'],
      },
    ])
    expect(report.unchanged).toEqual(['dos'])
    expect(report.failed).toEqual([])
  })

  it('una página sin salida revisada sale entera como añadida', async () => {
    const { deps } = setup({ readExpected: async () => null })
    const report = await refreshGoldenPages(deps)
    expect(report.changed.map((page) => page.diff[0])).toEqual([
      '@@ -0,0 +1,3 @@',
      '@@ -0,0 +1,3 @@',
    ])
  })

  it('una página que ya no responde o que redirige a otra falla y conserva su fuente', async () => {
    const { deps, written, live } = setup()
    live.uno = { status: 404, url: 'https://www.torrentearcano.com/uno', html: '' }
    live.dos = { status: 200, url: 'https://www.torrentearcano.com/otra', html: html('igual') }
    const report = await refreshGoldenPages(deps)
    expect(report.failed).toEqual([
      { slug: 'uno', reason: 'respondió 404' },
      { slug: 'dos', reason: 'redirige a /otra' },
    ])
    expect(written.size).toBe(0)
  })

  it('no guarda una fuente si el recorte cambia lo que lee el conversor', async () => {
    const { deps, written } = setup({
      // Un conversor que lee el <title>, que el recorte guarda, y la cabecera, que no.
      convert: (_page, source) => ({ header: source.includes('Menú') }),
    })
    const report = await refreshGoldenPages(deps)
    expect(report.failed.map((page) => page.slug)).toEqual(['uno', 'dos'])
    expect(report.failed[0]!.reason).toMatch(/recorte/)
    expect(written.size).toBe(0)
  })

  it('un error de red en una página no para las demás', async () => {
    const { deps, live } = setup({
      fetchPage: async (slug) => {
        if (slug === 'uno') throw new Error('ECONNRESET')
        return live[slug]!
      },
    })
    const report = await refreshGoldenPages(deps)
    expect(report.failed).toEqual([{ slug: 'uno', reason: 'ECONNRESET' }])
    expect(report.unchanged).toEqual(['dos'])
  })
})
