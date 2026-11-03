import { s3Storage } from '@payloadcms/storage-s3'
import type { Plugin } from 'payload'

type Env = Record<string, string | undefined>

export type S3Settings = {
  endpoint: string
  bucket: string
  accessKeyId: string
  secretAccessKey: string
  region: string
  publicBaseUrl: string | undefined
}

const REQUIRED = ['S3_ENDPOINT', 'S3_BUCKET', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY'] as const

/**
 * Lee la configuración de Cloudflare R2 (API compatible con S3).
 * Sin ninguna variable devuelve null y Payload guarda los archivos en disco.
 * Con la configuración a medias falla al arrancar, para no escribir en disco
 * por error en producción.
 */
export function readS3Settings(env: Env): S3Settings | null {
  const value = (name: string) => env[name]?.trim() || undefined
  const missing = REQUIRED.filter((name) => !value(name))

  if (missing.length === REQUIRED.length) return null
  if (missing.length > 0) {
    throw new Error(`Configuración de R2 incompleta, faltan: ${missing.join(', ')}`)
  }

  return {
    endpoint: value('S3_ENDPOINT')!,
    bucket: value('S3_BUCKET')!,
    accessKeyId: value('S3_ACCESS_KEY_ID')!,
    secretAccessKey: value('S3_SECRET_ACCESS_KEY')!,
    region: value('S3_REGION') ?? 'auto',
    publicBaseUrl: value('MEDIA_BASE_URL')?.replace(/\/+$/, ''),
  }
}

/** URL pública de un archivo servido desde el dominio CDN de R2. */
export function mediaFileUrl(baseUrl: string, prefix: string | undefined, filename: string) {
  const path = [prefix, filename]
    .filter((part): part is string => Boolean(part))
    .map((part) => part.split('/').map(encodeURIComponent).join('/'))
    .join('/')
  return `${baseUrl}/${path}`
}

/**
 * El adaptador de almacenamiento de la colección `media`. Con R2 configurado
 * sube los archivos al bucket; sin él queda desactivado y Payload usa el disco.
 */
export function mediaStorage(env: Env = process.env): Plugin {
  const settings = readS3Settings(env)
  const publicBaseUrl = settings?.publicBaseUrl

  return s3Storage({
    enabled: settings !== null,
    // Mismo esquema con y sin R2, para que las migraciones no dependan del entorno.
    alwaysInsertFields: true,
    bucket: settings?.bucket ?? '',
    config: {
      endpoint: settings?.endpoint,
      region: settings?.region ?? 'auto',
      credentials: settings
        ? { accessKeyId: settings.accessKeyId, secretAccessKey: settings.secretAccessKey }
        : undefined,
    },
    collections: {
      media: publicBaseUrl
        ? {
            disablePayloadAccessControl: true,
            generateFileURL: ({ filename, prefix }) =>
              mediaFileUrl(publicBaseUrl, prefix, filename),
          }
        : true,
    },
  })
}
