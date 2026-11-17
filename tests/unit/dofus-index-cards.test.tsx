import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { DofusCards } from '@/components/dofus/DofusIndex'
import type { DofusCard } from '@/lib/dofus-guides/index-view'

// Las primeras tarjetas del índice se ven al cargar: su huevo es la imagen más grande de la
// pantalla (el LCP) y no puede esperar a cargar en diferido.

const card = (index: number): DofusCard => ({
  name: `Dofus ${index}`,
  slug: `dofus-${index}`,
  href: `/dofus-${index}`,
  disabled: false,
  egg: { src: `/img/game/dofus/${index}.webp`, width: 128, height: 128 },
  meta: ['Nivel 100'],
  search: `dofus ${index}`,
})

describe('DofusCards', () => {
  it('los huevos de las primeras tarjetas cargan ya y con prioridad; el resto, en diferido', () => {
    const markup = renderToStaticMarkup(
      <DofusCards cards={Array.from({ length: 8 }, (_, i) => card(i))} />,
    )
    const imgs = [...markup.matchAll(/<img [^>]*>/g)].map((m) => m[0])
    expect(imgs).toHaveLength(8)
    for (const img of imgs.slice(0, 4)) {
      expect(img).toContain('fetchPriority="high"')
      expect(img).not.toContain('loading="lazy"')
    }
    for (const img of imgs.slice(4)) expect(img).toContain('loading="lazy"')
  })

  it('solo las publicadas se inclinan: llevan data-tilt y la capa del brillo, oculta al lector', () => {
    const off: DofusCard = { ...card(1), href: undefined, disabled: true }
    const markup = renderToStaticMarkup(<DofusCards cards={[card(0), off]} />)
    const [published, preparing] = markup.split('</li>')
    expect(published).toMatch(/<a class="dcard"[^>]* data-tilt=""/)
    expect(published).toContain('<span class="dcard__foil" aria-hidden="true"></span>')
    expect(preparing).not.toContain('data-tilt')
    expect(preparing).not.toContain('dcard__foil')
  })

  it('el borde va en el color de su Dofus para cada modo, y las cifras en bloques que no se parten', () => {
    const plateado: DofusCard = {
      ...card(0),
      color: '#dce1c9',
      line: { dark: '#dce1c9', light: '#6f735f' },
      meta: ['12 logros', 'Nivel 20'],
    }
    const markup = renderToStaticMarkup(<DofusCards cards={[plateado]} />)
    expect(markup).toContain('--egg:#dce1c9;--egg-line-dark:#dce1c9;--egg-line-light:#6f735f')
    expect(markup).toContain(
      '<span class="dcard__m"><span class="inline-block">12 logros -</span> ' +
        '<span class="inline-block">Nivel 20</span></span>',
    )
  })
})
