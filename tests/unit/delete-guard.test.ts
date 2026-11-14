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
  it('una imagen de la tarjeta de una checklist (escena o PNJ) no se borra sin avisar', () => {
    const checklists = REFERRERS.media.find((referrer) => referrer.collection === 'checklists')
    expect(checklists?.paths).toEqual(expect.arrayContaining(['card.scene', 'card.npc']))
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

  it('la escena y el huevo de la tarjeta «???» del índice de checklists cuentan', () => {
    expect(GLOBAL_REFERRERS.media).toEqual([
      expect.objectContaining({
        global: 'checklists-index',
        paths: ['teaser.scene', 'teaser.egg'],
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
