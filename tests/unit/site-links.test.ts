import { describe, expect, it } from 'vitest'

import {
  isPlaceholderHref,
  ownSitePath,
  servedPath,
  siteLinkHref,
  withSiteLinks,
} from '@/lib/site/site-links'

// Los enlaces de Torre a su propia web (torrentearcano.com/<ruta>), en cualquier texto que se
// pinte: relativos si este sitio sirve esa ruta (una página publicada, una ruta propia o una
// URL de la tabla de redirecciones), y a su página de Squarespace solo si no.

const live = (slug: string) => ['la-eterna-cosecha', 'aviso-legal'].includes(slug)

describe('ownSitePath', () => {
  it('reconoce la web de Torre con y sin www, en http y https, y las rutas relativas', () => {
    expect(ownSitePath('https://www.torrentearcano.com/emotes')).toBe('/emotes')
    expect(ownSitePath('https://torrentearcano.com/emotes?x=1#paso')).toBe('/emotes?x=1#paso')
    expect(ownSitePath('http://www.torrentearcano.com')).toBe('/')
    expect(ownSitePath('/emotes')).toBe('/emotes')
  })

  it('lo demás no es la web de Torre', () => {
    expect(ownSitePath('https://www.youtube.com/watch?v=x')).toBeNull()
    expect(ownSitePath('https://tienda.torrentearcano.com/x')).toBeNull()
    expect(ownSitePath('//www.torrentearcano.com/x')).toBeNull()
    expect(ownSitePath('#arriba')).toBeNull()
    expect(ownSitePath('mailto:torre@torrentearcano.com')).toBeNull()
    expect(ownSitePath('no es una url')).toBeNull()
  })
})

describe('servedPath', () => {
  it('lo publicado, la portada y las rutas propias', () => {
    expect(servedPath('/la-eterna-cosecha', live)).toBe('page')
    expect(servedPath('/La-Eterna-Cosecha/', live)).toBe('page')
    expect(servedPath('/', live)).toBe('route')
    expect(servedPath('/metalogros#zona', live)).toBe('route')
    expect(servedPath('/buscar?q=ocre', live)).toBe('route')
  })

  it('las URL de la tabla de redirecciones: las que llevan a otra página y las 410', () => {
    expect(servedPath('/metalogro-alineamiento', live)).toBe('redirect')
    expect(servedPath('/cart', live)).toBe('gone')
  })

  it('lo que el sitio no tiene, ni las subrutas de Squarespace', () => {
    expect(servedPath('/emote-sealar-con-el-dedo', live)).toBeNull()
    expect(servedPath('/s/guia.pdf', live)).toBeNull()
  })
})

describe('siteLinkHref', () => {
  it('un enlace absoluto a una página que este sitio sirve pasa a relativo', () => {
    expect(siteLinkHref('https://www.torrentearcano.com/la-eterna-cosecha', live)).toBe(
      '/la-eterna-cosecha',
    )
    expect(siteLinkHref('https://torrentearcano.com/aviso-legal#cookies', live)).toBe(
      '/aviso-legal#cookies',
    )
    expect(siteLinkHref('https://www.torrentearcano.com/metalogro-alineamiento', live)).toBe(
      '/metalogro-alineamiento',
    )
    expect(siteLinkHref('https://www.torrentearcano.com/', live)).toBe('/')
  })

  it('uno que no sirve se queda en Squarespace, también si Torre lo escribió relativo', () => {
    expect(siteLinkHref('https://www.torrentearcano.com/emote-sealar-con-el-dedo', live)).toBe(
      'https://www.torrentearcano.com/emote-sealar-con-el-dedo',
    )
    expect(siteLinkHref('https://torrentearcano.com/emote-bailar', live)).toBe(
      'https://torrentearcano.com/emote-bailar',
    )
    expect(siteLinkHref('/emote-bailar?a=1', live)).toBe(
      'https://www.torrentearcano.com/emote-bailar?a=1',
    )
    expect(siteLinkHref('/s/guia.pdf', live)).toBe('https://www.torrentearcano.com/s/guia.pdf')
  })

  it('una URL que aquí responde 410 sigue en Squarespace mientras exista allí', () => {
    expect(siteLinkHref('https://www.torrentearcano.com/cart', live)).toBe(
      'https://www.torrentearcano.com/cart',
    )
    expect(siteLinkHref('/cart', live)).toBe('https://www.torrentearcano.com/cart')
  })

  it('lo que no lleva a la web de Torre no se toca', () => {
    for (const href of ['https://www.youtube.com/watch?v=x', '#arriba', 'mailto:a@b.es']) {
      expect(siteLinkHref(href, live)).toBe(href)
    }
  })
})

describe('isPlaceholderHref', () => {
  it('las coordenadas que Squarespace enlazó a «#» en la web de Torre, absolutas o ya relativas', () => {
    expect(isPlaceholderHref('https://www.torrentearcano.com/seis-pies-bajo-tierra#')).toBe(true)
    expect(isPlaceholderHref('/seis-pies-bajo-tierra#')).toBe(true)
    expect(isPlaceholderHref('https://www.torrentearcano.com/seis-pies-bajo-tierra#paso')).toBe(
      false,
    )
    expect(isPlaceholderHref('https://www.youtube.com/#')).toBe(false)
  })
})

/** Un párrafo de Lexical con un enlace. */
const link = (url: string, linkType: 'custom' | 'internal' = 'custom', type = 'link') => ({
  type,
  fields: { url, linkType, newTab: false },
  children: [{ type: 'text', text: 'aquí' }],
})
const richText = (...children: unknown[]) => ({
  root: { type: 'root', children: [{ type: 'paragraph', children }] },
})

describe('withSiteLinks', () => {
  it('cambia los enlaces de Torre del texto rico allí donde estén, sin tocar el original', () => {
    const doc = {
      title: 'https://www.torrentearcano.com/la-eterna-cosecha',
      intro: richText(link('https://www.torrentearcano.com/la-eterna-cosecha')),
      blocks: [
        { blockType: 'step', content: richText(link('/emote-bailar', 'custom', 'autolink')) },
        { blockType: 'text', content: richText(link('https://www.youtube.com/watch?v=x')) },
      ],
    }
    const before = structuredClone(doc)
    const out = withSiteLinks(doc, live)
    expect(out.intro.root.children[0]!.children[0]).toMatchObject({
      fields: { url: '/la-eterna-cosecha' },
    })
    expect(out.blocks[0]!.content.root.children[0]!.children[0]).toMatchObject({
      fields: { url: 'https://www.torrentearcano.com/emote-bailar' },
    })
    expect(out.blocks[1]).toBe(doc.blocks[1])
    // Solo los nodos de enlace: un texto suelto con una URL no es un enlace.
    expect(out.title).toBe(doc.title)
    expect(doc).toEqual(before)
  })

  it('un enlace interno a otra guía no es una URL: se queda como está', () => {
    const internal = { ...link(''), fields: { linkType: 'internal', doc: { value: 3 } } }
    const doc = richText(internal)
    expect(withSiteLinks(doc, live)).toBe(doc)
  })

  it('sin enlaces que cambiar devuelve el mismo objeto', () => {
    const doc = { intro: richText(link('https://www.youtube.com/watch?v=x')), n: 3, at: null }
    expect(withSiteLinks(doc, live)).toBe(doc)
  })
})
