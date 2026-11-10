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
  meta: 'Nivel 100',
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
})
