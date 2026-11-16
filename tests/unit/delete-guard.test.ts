import type { PayloadRequest } from 'payload'
import { describe, expect, it } from 'vitest'

import { GLOBAL_REFERRERS, REFERRERS, refuseReferencedDelete } from '@/collections/delete-guard'

// La búsqueda de referencias antes de borrar (backlog A-17): todas las consultas a la vez y
// cada una con diez guías como mucho más el total, nunca la lista entera.
describe('refuseReferencedDelete', () => {
  it('lanza las consultas en paralelo, con diez guías como mucho', async () => {
    const calls: Record<string, unknown>[] = []
    const pending: (() => void)[] = []
    const req = {
      payload: {
        find: (args: Record<string, unknown>) => {
          calls.push(args)
          return new Promise((resolve) => {
            pending.push(() => resolve({ docs: [], totalDocs: 0 }))
          })
        },
        findGlobal: async () => ({}),
      },
    } as unknown as PayloadRequest

    const hook = refuseReferencedDelete('media')
    const done = hook({ id: 1, req } as never)
    await Promise.resolve()

    // Lo publicado y el último borrador de cada colección que puede usar la imagen.
    expect(calls).toHaveLength(REFERRERS.media.length * 2)
    for (const call of calls) {
      expect(call.limit).toBe(10)
      expect(call.pagination).not.toBe(false)
    }
    for (const resolve of pending) resolve()
    await done
  })
})

describe('REFERRERS', () => {
  it('una captura del cuerpo de una página suelta no se borra sin avisar', () => {
    expect(REFERRERS.media).toContainEqual({
      collection: 'pages',
      title: 'title',
      paths: ['body.image'],
    })
  })

  it('una build o una captura de una clase o una mazmorra no se borra sin avisar', () => {
    expect(REFERRERS.media).toContainEqual({
      collection: 'class-pages',
      title: 'title',
      paths: ['pvmBuilds.image', 'pvpBuilds.image', 'body.image'],
    })
    expect(REFERRERS.media).toContainEqual({
      collection: 'dungeon-pages',
      title: 'title',
      paths: ['body.image'],
    })
  })

  it('una imagen de la tarjeta de una checklist (escena o PNJ) no se borra sin avisar', () => {
    const checklists = REFERRERS.media.find((referrer) => referrer.collection === 'checklists')
    expect(checklists?.paths).toEqual(expect.arrayContaining(['card.scene', 'card.npc']))
  })

  it('el huevo propio de una guía de Dofus no se borra sin avisar', () => {
    const dofus = REFERRERS.media.find((referrer) => referrer.collection === 'dofus-guides')
    expect(dofus?.paths).toContain('egg')
  })

  it('una imagen de una «Corrección de Torre» no se borra sin avisar', () => {
    for (const collection of ['npcs', 'monsters', 'items', 'achievements', 'dungeons']) {
      expect(REFERRERS.media).toContainEqual({
        collection,
        title: 'name',
        paths: ['correction.image'],
      })
    }
  })

  it('una guía que enlaza un Prerrequisito de una página de logro no se borra sin avisar', () => {
    expect(REFERRERS['quest-guides']).toContainEqual({
      collection: 'achievement-pages',
      title: 'name',
      paths: ['prerequisites.guide'],
    })
  })

  it('una guía de Dofus que da un paso de una checklist no se borra sin avisar', () => {
    expect(REFERRERS['dofus-guides']).toEqual([
      {
        collection: 'checklists',
        title: 'name',
        paths: ['dofusGuide', 'steps.dofus', 'card.crown'],
      },
    ])
  })
})

describe('las imágenes de un global', () => {
  const req = (teaser: Record<string, unknown>) =>
    ({
      payload: {
        find: async () => ({ docs: [], totalDocs: 0 }),
        findGlobal: async ({ slug }: { slug: string }) =>
          slug === 'checklists-index' ? { teaser } : {},
      },
    }) as unknown as PayloadRequest

  it('la escena y el huevo de la tarjeta «???» y la imagen al compartir cuentan', () => {
    expect(GLOBAL_REFERRERS.media).toEqual([
      expect.objectContaining({
        global: 'checklists-index',
        paths: ['teaser.scene', 'teaser.egg'],
      }),
      expect.objectContaining({
        global: 'site-settings',
        title: 'Ajustes del sitio',
        paths: ['ogImage'],
      }),
    ])
  })

  it('no borra la imagen que usa la tarjeta «???», y dice dónde sale', async () => {
    const hook = refuseReferencedDelete('media')
    await expect(hook({ id: 7, req: req({ scene: 3, egg: 7 }) } as never)).rejects.toThrow(
      /sale en 1 guía: «Índice de checklists»/,
    )
  })

  it('otra imagen se borra', async () => {
    const hook = refuseReferencedDelete('media')
    await expect(hook({ id: 8, req: req({ scene: 3, egg: 7 }) } as never)).resolves.toBeUndefined()
  })
})

describe('los Dofus destacados de «Navegación»', () => {
  const req = (featuredDofus: unknown[]) =>
    ({
      payload: {
        find: async () => ({ docs: [], totalDocs: 0 }),
        findGlobal: async ({ slug }: { slug: string }) =>
          slug === 'navigation' ? { featuredDofus } : {},
      },
    }) as unknown as PayloadRequest

  it('cuentan como referencia de su guía de Dofus', () => {
    expect(GLOBAL_REFERRERS['dofus-guides']).toEqual([
      { global: 'navigation', title: 'Navegación', paths: ['featuredDofus'] },
    ])
  })

  it('no borra una guía destacada, y dice dónde sale', async () => {
    const hook = refuseReferencedDelete('dofus-guides')
    await expect(hook({ id: 5, req: req([4, 5, 6]) } as never)).rejects.toThrow(/«Navegación»/)
    await expect(
      hook({ id: 5, req: req([{ id: 5 }, { id: 6 }, { id: 7 }]) } as never),
    ).rejects.toThrow(/«Navegación»/)
  })

  it('otra guía se borra', async () => {
    const hook = refuseReferencedDelete('dofus-guides')
    await expect(hook({ id: 9, req: req([4, 5, 6]) } as never)).resolves.toBeUndefined()
  })
})
