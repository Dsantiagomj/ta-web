// El archivo de Media de una URL de origen (una captura de Squarespace, la miniatura de un
// vídeo): lo busca por su originalUrl y, si no está, lo sube una vez. Así las importaciones
// se pueden repetir sin duplicar archivos. Lo usan import-dofus-guides.ts e
// import-achievement-prose.ts.
import type { Payload } from 'payload'

import type { ImageFile } from './load-quest-guides'

/**
 * Devuelve el ID de Media de cada URL, subiéndola si falta. En seco (apply falso) no sube
 * nada: lo que falta da 0, un ID que nunca se escribe.
 */
export function mediaByUrl(
  payload: Payload,
  fetchFile: (url: string) => Promise<ImageFile>,
  { apply }: { apply: boolean },
) {
  const known = new Map<string, Promise<number>>()
  return (url: string, alt: string): Promise<number> => {
    const cached = known.get(url)
    if (cached) return cached
    const pending = (async () => {
      const { docs } = await payload.find({
        collection: 'media',
        where: { originalUrl: { equals: url } },
        limit: 1,
        depth: 0,
        overrideAccess: true,
      })
      if (docs[0]) return docs[0].id
      if (!apply) return 0
      const created = await payload.create({
        collection: 'media',
        data: { alt, originalUrl: url },
        file: await fetchFile(url),
        depth: 0,
        overrideAccess: true,
      })
      return created.id
    })()
    known.set(url, pending)
    return pending
  }
}
