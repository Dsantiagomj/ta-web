// El archivo de Media de una URL de origen (una captura de Squarespace, la miniatura de un
// vídeo): lo busca por su originalUrl y, si no está y se pide, lo sube una vez. Así las
// importaciones se pueden repetir sin duplicar archivos. Lo usan import-dofus-guides.ts e
// import-achievement-prose.ts.
import type { Payload } from 'payload'

import type { ImageFile } from './load-quest-guides'

/**
 * Una descarga que falló (el CDN, YouTube): quien importa la anota y sigue. Cualquier otro
 * error, como uno de la base de datos, no es esto y debe parar la importación.
 */
export class ImageDownloadError extends Error {}

/**
 * El ID de Media de cada URL. Con upload, sube lo que falta; sin él solo busca, y lo que no
 * está da null. Un fallo al descargar llega como ImageDownloadError.
 */
export function mediaByUrl(payload: Payload, fetchFile: (url: string) => Promise<ImageFile>) {
  const known = new Map<string, Promise<number | null>>()

  async function resolve(url: string, alt: string, upload: boolean): Promise<number | null> {
    const { docs } = await payload.find({
      collection: 'media',
      where: { originalUrl: { equals: url } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
    if (docs[0]) return docs[0].id
    if (!upload) return null
    const file = await fetchFile(url).catch((cause: unknown) => {
      throw new ImageDownloadError(cause instanceof Error ? cause.message : String(cause), {
        cause,
      })
    })
    const created = await payload.create({
      collection: 'media',
      data: { alt, originalUrl: url },
      file,
      depth: 0,
      overrideAccess: true,
    })
    return created.id
  }

  return async (url: string, alt: string, { upload }: { upload: boolean }) => {
    const cached = known.get(url)
    // Lo que solo se buscó y no estaba se vuelve a mirar si ahora se puede subir.
    if (cached && (!upload || (await cached.catch(() => 0)) !== null)) return cached
    const pending = resolve(url, alt, upload)
    known.set(url, pending)
    return pending
  }
}
