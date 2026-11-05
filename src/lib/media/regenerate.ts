import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3'
import type { Payload } from 'payload'

import type { Media } from '../../payload-types'
import { missingImageSizes } from './sizes'
import { mediaObjectKey, readS3Settings, s3ClientConfig } from './storage'

type Env = Record<string, string | undefined>

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]'])

/**
 * Por qué no debe correr la regeneración en este entorno, o null si puede. Producción
 * (APP_ENV, Railway o NODE_ENV) pide --production; una base que no está en esta máquina
 * pide --remote, porque desde fuera no se distingue la de dev de la de producción.
 */
export function regenerationRefusal(env: Env, args: readonly string[]): string | null {
  const production = [env.APP_ENV, env.RAILWAY_ENVIRONMENT_NAME, env.NODE_ENV].some(
    (value) => value?.trim().toLowerCase() === 'production',
  )
  if (production) {
    return args.includes('--production')
      ? null
      : 'Esto es producción: repite con --production si de verdad quieres regenerar sus variantes.'
  }

  const url = env.DATABASE_URL?.trim()
  if (!url || args.includes('--remote') || args.includes('--production')) return null
  let host: string | null = null
  try {
    host = new URL(url).hostname
  } catch {
    // Sin host legible no se puede saber dónde está: cuenta como remota.
  }
  if (host && LOCAL_HOSTS.has(host)) return null
  return `DATABASE_URL apunta a una base remota (${host ?? 'sin host legible'}): repite con --remote si es la que quieres.`
}

export interface RegenerationResult {
  /** Archivos a los que se les generaron variantes. */
  regenerated: Media['id'][]
  /** Archivos que ya tenían todas sus variantes (o no son imágenes): no se tocaron. */
  complete: number
  failed: { id: Media['id']; error: string }[]
}

type ReadOriginal = (media: Media) => Promise<Buffer>

/** Lo que el lector usa del cliente de S3: solo pedir un objeto. */
export interface ObjectGetter {
  send(
    command: GetObjectCommand,
  ): Promise<{ Body?: { transformToByteArray(): Promise<Uint8Array> } }>
}

/**
 * El archivo original, de donde esté: de su URL pública si la tiene (R2 tras el dominio
 * CDN de MEDIA_BASE_URL), del bucket de R2 con su API si solo hay credenciales (la URL es
 * entonces la ruta relativa de Payload), o del disco, en el staticDir de la colección.
 */
export function originalReader(
  payload: Payload,
  { env = process.env, s3 }: { env?: Env; s3?: ObjectGetter } = {},
): ReadOriginal {
  const staticDir = payload.collections.media.config.upload.staticDir ?? 'media'
  const settings = readS3Settings(env)
  const bucket = settings && (s3 ?? new S3Client(s3ClientConfig(settings)))

  return async (media) => {
    if (media.url && /^https?:\/\//.test(media.url)) {
      const response = await fetch(media.url)
      if (!response.ok) throw new Error(`${media.url} respondió ${response.status}`)
      return Buffer.from(await response.arrayBuffer())
    }
    const filename = media.filename ?? ''
    // El nombre viene de la base: nunca sale del directorio de los archivos.
    if (!filename || path.basename(filename) !== filename) {
      throw new Error(`Nombre de archivo no válido: «${filename}»`)
    }
    if (settings && bucket) {
      const key = mediaObjectKey({ ...media, filename })
      // Los errores del SDK no llevan las credenciales; el mensaje solo nombra bucket y clave.
      try {
        const object = await bucket.send(new GetObjectCommand({ Bucket: settings.bucket, Key: key }))
        if (!object.Body) throw new Error('respuesta sin contenido')
        return Buffer.from(await object.Body.transformToByteArray())
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error)
        throw new Error(`No se pudo leer ${settings.bucket}/${key} de R2: ${reason}`)
      }
    }
    try {
      return await readFile(path.resolve(staticDir, filename))
    } catch {
      throw new Error(`No está en ${staticDir}/${filename}.`)
    }
  }
}

const PAGE_SIZE = 50

/**
 * Genera las variantes que les faltan a los archivos de media volviendo a subir su
 * original a través de Payload, con el mismo nombre: Payload crea las variantes con sharp y
 * el almacenamiento (R2 o disco) guarda todo como en una subida del panel. Lo que ya tiene
 * sus variantes no se toca, así que se puede repetir sin coste.
 */
export async function regenerateImageSizes(
  payload: Payload,
  {
    log,
    readOriginal = originalReader(payload),
  }: { log: (message: string) => void; readOriginal?: ReadOriginal },
): Promise<RegenerationResult> {
  const result: RegenerationResult = { regenerated: [], complete: 0, failed: [] }
  for (let page = 1; ; page++) {
    const { docs, hasNextPage } = await payload.find({
      collection: 'media',
      depth: 0,
      limit: PAGE_SIZE,
      page,
      sort: 'id',
    })
    for (const media of docs) {
      const missing = missingImageSizes(media)
      if (missing.length === 0) {
        result.complete++
        continue
      }
      try {
        const data = await readOriginal(media)
        await payload.update({
          collection: 'media',
          id: media.id,
          data: {},
          file: { data, mimetype: media.mimeType!, name: media.filename!, size: data.length },
          // Mismo nombre que el original: las guías que lo enlazan no cambian.
          overwriteExistingFiles: true,
          depth: 0,
        })
        result.regenerated.push(media.id)
        log(`${media.filename}: ${missing.length} variantes generadas`)
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        result.failed.push({ id: media.id, error: message })
        log(`${media.filename}: falló, ${message}`)
      }
    }
    if (!hasNextPage) break
  }
  return result
}
