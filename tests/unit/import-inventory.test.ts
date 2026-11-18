import { describe, expect, it } from 'vitest'

import { fetchPage } from '../../scripts/import/inventory/crawl'
import {
  comparePage,
  inventoryReport,
  pageFeatures,
  pageFileSlug,
  sitemapPaths,
  wordChanges,
} from '../../scripts/import/inventory/pages'

// El inventario nuevo de la web de Torre y lo que cambió respecto al anterior. Sin red: el
// fetch y la espera se inyectan.

const page = (main: string, title = 'Se busca: Boorro | Descubre ahora') =>
  `<html><head><title>${title} &mdash; Torrente Arcano</title></head>` +
  `<body><header><a href="/menu">Menú</a></header><main>${main}</main></body></html>`

describe('sitemapPaths y pageFileSlug', () => {
  it('las rutas del sitemap del sitio, sin repetir, y el archivo de cada una', () => {
    const xml =
      '<urlset><url><loc>https://www.torrentearcano.com/a</loc></url>' +
      '<url><loc>https://www.torrentearcano.com/</loc></url>' +
      '<url><loc>https://www.torrentearcano.com/a</loc></url>' +
      '<url><loc>https://otra.com/b</loc></url></urlset>'
    expect(sitemapPaths(xml)).toEqual(['/a', '/'])
    expect(pageFileSlug('/se-busca-boorro')).toBe('se-busca-boorro')
    expect(pageFileSlug('/blog/una')).toBe('blog__una')
    expect(pageFileSlug('/')).toBe('index')
  })
})

describe('pageFeatures', () => {
  it('lee solo el <main>: texto, nombres de imagen, vídeos, código y enlaces', () => {
    const features = pageFeatures(
      page(
        '<p>Bosque de&nbsp;koalaks.</p>' +
          '<img data-src="https://images.squarespace-cdn.com/content/v1/x/y/Captura+1.png?format=1500w">' +
          '<iframe src="https://www.youtube.com/embed/abcdefghijk"></iframe>' +
          '<a href="/se-busca-atcham">Atcham</a><script>var x = 1</script>',
      ),
    )
    expect(features).toEqual({
      title: 'Se busca: Boorro | Descubre ahora',
      text: 'Bosque de koalaks. Atcham',
      words: 4,
      images: ['Captura+1.png'],
      videos: ['abcdefghijk'],
      code: '',
      links: ['/se-busca-atcham'],
    })
  })
})

describe('comparePage', () => {
  const before = pageFeatures(page('<p>Bosque de koalaks.</p>'))

  it('igual, cambiada (con los trozos de texto), nueva y fuera del sitemap', () => {
    expect(comparePage('/x', before, before).status).toBe('same')
    const changed = comparePage('/x', before, pageFeatures(page('<p>Bosque de kaliptos.</p>')))
    expect(changed.status).toBe('changed')
    expect(changed.text).toEqual([{ before: 'koalaks.', after: 'kaliptos.' }])
    expect(comparePage('/x', null, before).status).toBe('new')
    expect(comparePage('/x', before, null).status).toBe('removed')
  })

  it('un esbozo vacío que ahora tiene texto está lleno; una imagen nueva también es un cambio', () => {
    const stub = pageFeatures(page(''))
    const full = pageFeatures(page(`<p>${'palabra '.repeat(50)}</p>`))
    expect(comparePage('/x', stub, full).status).toBe('filled')
    expect(comparePage('/x', full, stub).status).toBe('emptied')
    const image = pageFeatures(
      page('<p>Bosque de koalaks.</p><img data-src="https://images.squarespace-cdn.com/a/b.png">'),
    )
    expect(comparePage('/x', before, image)).toMatchObject({
      status: 'changed',
      imagesAdded: ['b.png'],
    })
  })
})

describe('wordChanges', () => {
  it('da cada trozo distinto con lo de antes y lo de después', () => {
    expect(wordChanges('a b c d e'.split(' '), 'a x c e f'.split(' '))).toEqual([
      { before: 'b', after: 'x' },
      { before: 'd', after: '' },
      { before: '', after: 'f' },
    ])
  })
})

describe('inventoryReport', () => {
  it('los totales por estado y cada página que no sigue igual', () => {
    const same = pageFeatures(page('<p>Igual</p>'))
    const lines = inventoryReport([
      comparePage('/igual', same, same),
      comparePage('/nueva', null, same),
    ])
    expect(lines[0]).toBe(
      'Sin cambios: 1 · Cambiadas: 0 · Esbozos que ahora tienen contenido: 0 · Páginas que se ' +
        'quedaron sin texto: 0 · Nuevas en el sitemap: 1 · Fuera del sitemap: 0',
    )
    expect(lines).toContain('- /nueva «Se busca: Boorro | Descubre ahora»: 0 → 1 palabras')
  })
})

describe('fetchPage', () => {
  const noWait = async () => {}

  it('reintenta lo que Squarespace corta y sigue una redirección dentro del sitio', async () => {
    const calls: string[] = []
    const responses = [
      () => Promise.reject(new Error('ECONNRESET')),
      () => Promise.resolve(new Response('', { status: 503 })),
      () => Promise.resolve(new Response(null, { status: 301, headers: { location: '/destino' } })),
      () => Promise.resolve(new Response('<main>Hola</main>', { status: 200 })),
    ]
    const fetchFn = ((url: string) => {
      calls.push(url)
      return responses.shift()!()
    }) as typeof fetch

    const page = await fetchPage('/origen', { fetchFn, sleep: noWait })

    expect(page).toEqual({
      status: 301,
      finalStatus: 200,
      redirects: ['/destino'],
      html: '<main>Hola</main>',
    })
    expect(calls).toEqual([
      'https://www.torrentearcano.com/origen',
      'https://www.torrentearcano.com/origen',
      'https://www.torrentearcano.com/origen',
      'https://www.torrentearcano.com/destino',
    ])
  })

  it('no sigue una redirección que sale del sitio, y se rinde tras los reintentos', async () => {
    const away = (async () =>
      new Response(null, {
        status: 302,
        headers: { location: 'https://otra.com/x' },
      })) as typeof fetch
    expect(await fetchPage('/a', { fetchFn: away, sleep: noWait })).toEqual({
      status: 302,
      finalStatus: 302,
      redirects: ['https://otra.com/x'],
      html: '',
    })
    const down = (async () => {
      throw new Error('ETIMEDOUT')
    }) as typeof fetch
    await expect(fetchPage('/a', { fetchFn: down, sleep: noWait, retries: 1 })).rejects.toThrow(
      /ETIMEDOUT/,
    )
  })
})
