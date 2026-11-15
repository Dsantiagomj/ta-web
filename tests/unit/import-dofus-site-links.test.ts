import { describe, expect, it } from 'vitest'

import { siteHref } from '../../scripts/import/dofus-guides/site-links'

// Los enlaces de Torre a su propia web: llevan a la página de este sitio si ya existe; si no
// (los emotes, que aún no se han portado), a su página de siempre, nunca a un 404.

const live = (slug: string) => ['la-eterna-cosecha', 'lista-ocre'].includes(slug)

describe('siteHref', () => {
  it('una página que este sitio tiene se queda relativa', () => {
    expect(siteHref('/la-eterna-cosecha', live)).toBe('/la-eterna-cosecha')
    expect(siteHref('/lista-ocre#paso-3', live)).toBe('/lista-ocre#paso-3')
  })

  it('una que aún no tiene lleva a la web de siempre (con el slug que escribió Torre)', () => {
    expect(siteHref('/emote-sealar-con-el-dedo', live)).toBe(
      'https://www.torrentearcano.com/emote-sealar-con-el-dedo',
    )
    // Un archivo de Squarespace tampoco está aquí.
    expect(siteHref('/s/guia.pdf', live)).toBe('https://www.torrentearcano.com/s/guia.pdf')
  })

  it('las rutas propias y las URL antiguas de la tabla de redirecciones las responde el sitio', () => {
    expect(siteHref('/metalogros', live)).toBe('/metalogros')
    expect(siteHref('/metalogro-alineamiento', live)).toBe('/metalogro-alineamiento')
  })

  it('lo que no es un enlace a la web de Torre no se toca', () => {
    expect(siteHref('https://www.youtube.com/watch?v=x', live)).toBe(
      'https://www.youtube.com/watch?v=x',
    )
    expect(siteHref('#arriba', live)).toBe('#arriba')
    expect(siteHref('/', live)).toBe('/')
  })
})
