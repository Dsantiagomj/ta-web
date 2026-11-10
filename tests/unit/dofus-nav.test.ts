import { describe, expect, it } from 'vitest'

import { dofusNavItems } from '@/lib/dofus-guides/nav'
import type { DofusListDoc } from '@/lib/dofus-guides/page'
import type { Media } from '@/payload-types'

// El menú y la búsqueda de la cabecera listan los Dofus de la colección de guías de Dofus:
// lo que Torre añade en el panel aparece sin tocar el código.

const egg = {
  id: 5,
  url: '/media/abisal.png',
  filename: 'abisal.png',
  width: 128,
  height: 128,
  sizes: {},
}

const doc = (overrides: Partial<DofusListDoc>): DofusListDoc => ({
  id: 1,
  name: 'Dofus Abisal',
  slug: 'dofus-abisal',
  state: 'published',
  achievements: 7,
  quests: 40,
  ...overrides,
})

describe('dofusNavItems', () => {
  it('cada Dofus en el orden de la colección; con enlace solo si su guía se puede abrir', () => {
    const items = dofusNavItems([
      doc({ egg: egg as unknown as Media }),
      doc({ id: 2, name: 'Jyfus', slug: 'jyfus', state: 'preparing' }),
    ])
    expect(items).toEqual([
      {
        name: 'Dofus Abisal',
        href: '/dofus-abisal',
        image: { src: expect.stringContaining('abisal'), size: 128 },
      },
      { name: 'Jyfus' },
    ])
  })
})
