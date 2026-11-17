// El fondo de zona de una página, en el servidor y sin DofusDB: la imagen propia de la
// página o la de la subzona de su misión (src/lib/zones/background.ts). Lo leen las guías de
// misión y las páginas de logro dentro de su caché, así que no cuesta una consulta por visita.
import type { Payload } from 'payload'

import type { ImageAsset } from '../../components/ui/types'
import type { Media } from '../../payload-types'
import { mediaImageAsset } from '../media/image-asset'
import { questSubAreaId, type ZoneQuest } from './background'

export async function readZoneBackground(
  payload: Payload,
  {
    override,
    quest,
  }: {
    /** La imagen propia de la página (su campo background), poblada o su ID. */
    override?: Media | number | null
    /** La misión de la página, poblada: su subzona da el fondo. */
    quest: ZoneQuest | number | null | undefined
  },
): Promise<ImageAsset | null> {
  if (override) {
    const media =
      typeof override === 'number'
        ? await payload
            .findByID({ collection: 'media', id: override, depth: 0, overrideAccess: false })
            .catch(() => null)
        : override
    const own = mediaImageAsset(media)
    if (own) return own
  }
  const subAreaId = questSubAreaId(quest)
  if (subAreaId === null) return null
  const { docs } = await payload.find({
    collection: 'subareas',
    where: { dofusId: { equals: subAreaId }, background: { exists: true } },
    select: { background: true },
    limit: 1,
    depth: 1,
    overrideAccess: false,
  })
  return mediaImageAsset(docs[0]?.background as Media | number | null | undefined)
}
