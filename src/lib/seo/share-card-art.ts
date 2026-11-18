// El archivo del paisaje o del huevo de una tarjeta al compartir, de donde esté guardado: su
// URL pública (R2 tras MEDIA_BASE_URL), el bucket o el disco (originalReader). Sin él, la
// tarjeta sale plana: un archivo que falta nunca deja una página sin imagen.
import path from 'node:path'

import config from '@payload-config'
import { getPayload } from 'payload'

import type { Media } from '@/payload-types'

import { originalReader } from '../media/regenerate'

/** Lo que espera la tarjeta como mucho: luego sale plana. */
const TIMEOUT_MS = 5_000

export async function readShareArt(src: string): Promise<Buffer | null> {
  try {
    const filename = decodeURIComponent(path.posix.basename(new URL(src, 'http://local').pathname))
    const read = originalReader(await getPayload({ config }))
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`más de ${TIMEOUT_MS} ms`)), TIMEOUT_MS).unref(),
    )
    return await Promise.race([read({ url: src, filename } as Media), timeout])
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    console.warn(`Tarjeta al compartir sin imagen de fondo (${src}): ${reason}`)
    return null
  }
}
