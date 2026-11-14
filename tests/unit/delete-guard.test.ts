import type { PayloadRequest } from 'payload'
import { describe, expect, it } from 'vitest'

import { REFERRERS, refuseReferencedDelete } from '@/collections/delete-guard'

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
