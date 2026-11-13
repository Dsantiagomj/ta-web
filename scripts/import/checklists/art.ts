// El arte de las checklists que no está en DofusDB: los mapas donde empieza cada paso, las
// imágenes de las zonas y las figuras que no son PNJ (los dioses). Vive en public/img/ de
// silvestre-checklist y se sube a Media una vez, con una clave por archivo (media.gameAsset),
// como el arte del juego: repetir la importación nunca duplica archivos.
import path from 'node:path'

import type { Payload } from 'payload'

import type { ArtRef } from './to-checklist'

const MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
}

/** La clave en Media de un archivo de public/img/ de silvestre-checklist. */
export const checklistArtKey = (file: string) => `silvestre-checklist-img:${file}`

/**
 * El ID en Media de cada imagen: la busca por su clave y, si no está, la sube. null si el
 * archivo no existe. En seco no sube nada: lo que subiría devuelve -1.
 */
export function checklistArt(
  payload: Payload,
  options: {
    /** El archivo, por su ruta en public/img/; null si no existe. */
    readArt: (file: string) => Promise<Buffer | null>
    dryRun: boolean
  },
) {
  const byKey = new Map<string, Promise<number | null>>()
  // Las subidas van de una en una: dos a la vez pueden elegir el mismo nombre de archivo.
  let uploads: Promise<unknown> = Promise.resolve()
  const serially = <T>(task: () => Promise<T>): Promise<T> => {
    const run = uploads.then(task, task)
    uploads = run.catch(() => {})
    return run
  }

  function media(art: ArtRef): Promise<number | null> {
    const key = checklistArtKey(art.path)
    const known = byKey.get(key)
    if (known) return known
    const pending = (async () => {
      const { docs } = await payload.find({
        collection: 'media',
        where: { gameAsset: { equals: key } },
        limit: 1,
        depth: 0,
        overrideAccess: true,
      })
      if (docs[0]) return docs[0].id
      const data = await options.readArt(art.path)
      if (!data) return null
      if (options.dryRun) return -1
      const extension = path.extname(art.path).toLowerCase()
      const created = await serially(() =>
        payload.create({
          collection: 'media',
          data: { alt: art.alt, gameAsset: key },
          file: {
            data,
            mimetype: MIME[extension] ?? 'application/octet-stream',
            name: `checklist-${art.path.replace(/[^a-z0-9.]+/gi, '-')}`,
            size: data.length,
          },
          depth: 0,
          overrideAccess: true,
        }),
      )
      return created.id
    })()
    byKey.set(key, pending)
    return pending
  }

  return { media }
}
