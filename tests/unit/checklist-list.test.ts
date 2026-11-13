import type { Payload } from 'payload'
import { describe, expect, it, vi } from 'vitest'

import { checklistEntries, checklistNavItems, type ChecklistDoc } from '@/lib/checklists/list'
import { CHECKLISTS_INDEX_PATH } from '@/lib/checklists/path'
import { readChecklists } from '@/lib/checklists/queries'
import type { Media } from '@/payload-types'

// El índice /checklists, el menú, el pie y la portada listan las checklists de la colección:
// lo que Torre añade o publica en el panel aparece sin tocar el código.

const egg = {
  id: 5,
  url: '/media/silvestre.png',
  filename: 'silvestre.png',
  width: 128,
  height: 128,
  sizes: {},
} as unknown as Media

const doc = (overrides: Partial<ChecklistDoc>): ChecklistDoc => ({
  name: 'Dofus Nebuloso',
  slug: 'checklist-nebuloso',
  state: 'published',
  order: 1,
  ...overrides,
})

describe('checklistEntries', () => {
  it('respeta el orden en que llegan: el de la base (order, name), sin reordenar', () => {
    const entries = checklistEntries([
      doc({ name: 'Almas del Ocre', slug: 'lista-ocre', order: 3 }),
      doc({ name: 'Dofus Silvestre', slug: 'checklist-silvestre', order: 1 }),
    ])
    expect(entries.map((entry) => entry.slug)).toEqual(['lista-ocre', 'checklist-silvestre'])
  })

  it('una Publicada enlaza a su página del sitio', () => {
    const [entry] = checklistEntries([doc({ description: 'Del Nebuloso, paso a paso.' })])
    expect(entry).toEqual({
      name: 'Dofus Nebuloso',
      slug: 'checklist-nebuloso',
      state: 'published',
      href: '/checklist-nebuloso',
      description: 'Del Nebuloso, paso a paso.',
    })
  })

  it('una En preparación con legacyHref enlaza a Squarespace y lo marca', () => {
    const href = 'https://www.torrentearcano.com/checklist-silvestre'
    const [entry] = checklistEntries([
      doc({ slug: 'checklist-silvestre', state: 'preparing', legacyHref: href }),
    ])
    expect(entry).toMatchObject({ state: 'preparing', href, legacy: true })
  })

  it('una En preparación sin legacyHref no enlaza a ninguna parte', () => {
    const [entry] = checklistEntries([doc({ state: 'preparing', legacyHref: '  ' })])
    expect(entry!.href).toBeUndefined()
    expect(entry!.legacy).toBeUndefined()
  })

  it('una Publicada ignora su legacyHref: ya tiene página aquí', () => {
    const [entry] = checklistEntries([
      doc({ legacyHref: 'https://www.torrentearcano.com/checklist-nebuloso' }),
    ])
    expect(entry).toMatchObject({ href: '/checklist-nebuloso' })
    expect(entry!.legacy).toBeUndefined()
  })

  it('el huevo y el color salen de la guía de su Dofus', () => {
    const [entry] = checklistEntries([
      doc({ dofusGuide: { color: '#7fd6c2', dofus: { image: egg } }, description: ' ' }),
    ])
    expect(entry!.color).toBe('#7fd6c2')
    expect(entry!.egg?.src).toContain('silvestre')
    expect(entry!.description).toBeUndefined()
  })

  it('sin la guía de su Dofus leída (sin publicar o sin enlazar), sin huevo ni color', () => {
    const [byId, none] = checklistEntries([doc({ dofusGuide: 7 }), doc({ dofusGuide: null })])
    for (const entry of [byId, none]) {
      expect(entry!.egg).toBeUndefined()
      expect(entry!.color).toBeUndefined()
    }
  })
})

describe('checklistNavItems', () => {
  it('lo que pinta el menú: nombre, enlace, frase y el huevo a 128px', () => {
    const items = checklistNavItems(
      checklistEntries([
        doc({ dofusGuide: { dofus: { image: egg } }, description: 'Paso a paso.' }),
        doc({
          name: 'Almas del Ocre',
          slug: 'lista-ocre',
          order: 2,
          state: 'preparing',
          legacyHref: 'https://www.torrentearcano.com/lista-ocre',
        }),
      ]),
    )
    expect(items).toEqual([
      {
        name: 'Dofus Nebuloso',
        slug: 'checklist-nebuloso',
        href: '/checklist-nebuloso',
        description: 'Paso a paso.',
        image: { src: expect.stringContaining('silvestre'), size: 128 },
      },
      {
        name: 'Almas del Ocre',
        slug: 'lista-ocre',
        href: 'https://www.torrentearcano.com/lista-ocre',
        legacy: true,
      },
    ])
  })

  it('el índice vive en /checklists', () => {
    expect(CHECKLISTS_INDEX_PATH).toBe('/checklists')
  })
})

describe('readChecklists', () => {
  const guide = {
    id: 7,
    color: '#7fd6c2',
    dofus: { image: egg },
    // Lo que no debe salir de una guía en borrador: solo se piden el color y el huevo.
    name: 'Guía en borrador',
    intro: 'Texto sin publicar',
  }

  function fakePayload() {
    return vi.fn(async ({ collection }: { collection: string; select?: object }) =>
      collection === 'checklists'
        ? { docs: [doc({ dofusGuide: 7 }), doc({ slug: 'otra', dofusGuide: null })] }
        : { docs: [guide] },
    )
  }

  it('lee las checklists como un visitante, en el orden de la base y sin los pasos', async () => {
    const find = fakePayload()
    await readChecklists({ find } as unknown as Payload)
    const [args] = find.mock.calls[0]!
    expect(args).toMatchObject({
      collection: 'checklists',
      sort: ['order', 'name'],
      pagination: false,
      draft: false,
      overrideAccess: false,
      depth: 0,
    })
    expect(args.select).not.toHaveProperty('steps')
    expect(args.select).toMatchObject({ name: true, slug: true, state: true, dofusGuide: true })
  })

  it('el huevo y el color de su Dofus salen aunque la guía siga en borrador, y nada más de ella', async () => {
    const find = fakePayload()
    const [withGuide, withoutGuide] = await readChecklists({ find } as unknown as Payload)
    const [args] = find.mock.calls[1]!
    // Datos del juego: se leen sin depender de si la guía está publicada...
    expect(args).toMatchObject({
      collection: 'dofus-guides',
      where: { id: { in: [7] } },
      overrideAccess: true,
    })
    // ...pero solo el color y el objeto del Dofus, con su imagen.
    expect(args.select).toEqual({ color: true, dofus: true })
    expect(withGuide!.dofusGuide).toEqual({ color: '#7fd6c2', dofus: { image: egg } })
    expect(withoutGuide!.dofusGuide).toBeNull()
  })

  it('sin guías enlazadas no hace la segunda lectura', async () => {
    const find = vi.fn().mockResolvedValue({ docs: [doc({})] })
    await readChecklists({ find } as unknown as Payload)
    expect(find).toHaveBeenCalledTimes(1)
  })
})
