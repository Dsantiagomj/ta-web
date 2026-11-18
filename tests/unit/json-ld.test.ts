import { describe, expect, it } from 'vitest'

import { articleJsonLd, jsonForScript } from '@/lib/seo/json-ld'

// Los datos estructurados de las guías, los logros, las guías de Dofus y las páginas sueltas
// (backlog S-19, AGENTS.md, SEO): un Article por página. No HowTo: Google dejó de enseñar sus
// resultados enriquecidos. La prueba de resultados enriquecidos de Google no llega a localhost,
// así que aquí se comprueban la forma y los campos que pide Google.

const input = {
  siteUrl: 'https://torrentearcano.com',
  siteName: 'Torrente Arcano',
  path: '/la-ocasion',
  headline: 'La ocasión hace al ladrón',
  description: 'Guía de la misión La ocasión hace al ladrón.',
  image: '/la-ocasion/og?v=abc123',
  published: '2026-11-01T10:00:00.000Z',
  modified: '2026-11-18T10:00:00.000Z',
  sameAs: ['https://www.twitch.tv/torrentearcano', 'https://www.youtube.com/@TorrenteArcano'],
}

describe('articleJsonLd', () => {
  const data = articleJsonLd(input)

  it('es un Article de schema.org en español', () => {
    expect(data).toMatchObject({
      '@context': 'https://schema.org',
      '@type': 'Article',
      inLanguage: 'es',
      headline: 'La ocasión hace al ladrón',
      description: 'Guía de la misión La ocasión hace al ladrón.',
    })
  })

  it('con URL absolutas: la página, la imagen al compartir y el logo', () => {
    expect(data.mainEntityOfPage).toEqual({
      '@type': 'WebPage',
      '@id': 'https://torrentearcano.com/la-ocasion',
    })
    expect(data.url).toBe('https://torrentearcano.com/la-ocasion')
    expect(data.image).toEqual(['https://torrentearcano.com/la-ocasion/og?v=abc123'])
    expect(data.publisher.logo.url).toMatch(/^https:\/\/torrentearcano\.com\//)
  })

  it('el autor es Torre, con su web y sus redes; el editor, la web', () => {
    expect(data.author).toEqual({
      '@type': 'Person',
      name: 'Torre',
      url: 'https://torrentearcano.com/',
      sameAs: input.sameAs,
    })
    expect(data.publisher).toMatchObject({
      '@type': 'Organization',
      name: 'Torrente Arcano',
      url: 'https://torrentearcano.com/',
      logo: {
        '@type': 'ImageObject',
        url: 'https://torrentearcano.com/img/marca/logo.png',
        width: 512,
        height: 512,
      },
    })
  })

  it('con las fechas de publicación y del último cambio de Torre', () => {
    expect(data.datePublished).toBe('2026-11-01T10:00:00.000Z')
    expect(data.dateModified).toBe('2026-11-18T10:00:00.000Z')
  })

  it('sin fechas, no las inventa', () => {
    const undated = articleJsonLd({ ...input, published: null, modified: null })
    expect(undated).not.toHaveProperty('datePublished')
    expect(undated).not.toHaveProperty('dateModified')
  })

  it('un titular de más de 110 letras se corta, como pide Google', () => {
    const long = articleJsonLd({ ...input, headline: 'a'.repeat(140) })
    expect(long.headline.length).toBeLessThanOrEqual(110)
  })

  it('tiene todos los campos que Google recomienda para un Article', () => {
    for (const key of ['headline', 'image', 'datePublished', 'dateModified', 'author']) {
      expect(data, key).toHaveProperty(key)
    }
  })
})

describe('jsonForScript', () => {
  it('es JSON válido y ningún texto puede cerrar la etiqueta <script>', () => {
    const text = jsonForScript({ headline: '</script><script>alert(1)</script>' })
    expect(text).not.toContain('<')
    expect(JSON.parse(text)).toEqual({ headline: '</script><script>alert(1)</script>' })
  })
})
