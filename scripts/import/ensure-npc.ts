import type { Payload } from 'payload'

import { createDofusDbClient } from '@/lib/dofusdb/client'
import { refreshNpcs } from '@/lib/dofusdb/refresh-npcs'
import type { RawNpc } from '@/lib/dofusdb/types'

/**
 * El ID de Payload de un PNJ de DofusDB. El representante elegido a mano puede no dar
 * misiones, así que si falta se trae de DofusDB con sus renders. null si DofusDB no lo tiene.
 */
export function npcEnsurer(payload: Payload, log: (message: string) => void) {
  const client = createDofusDbClient({ log })
  return async (dofusId: number): Promise<number | null> => {
    const find = () =>
      payload.find({
        collection: 'npcs',
        where: { dofusId: { equals: dofusId } },
        depth: 0,
        limit: 1,
        overrideAccess: true,
      })
    const found = (await find()).docs[0]
    if (found) return found.id
    await refreshNpcs(payload, await client.fetchByIds<RawNpc>('npcs', [dofusId]))
    return (await find()).docs[0]?.id ?? null
  }
}
