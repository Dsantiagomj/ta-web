import path from 'node:path'

type Env = Record<string, string | undefined>

// Donde guardan sus archivos las bases de pruebas: una carpeta por base.
const TEST_ROOT = 'media/test'

const S3_VARIABLES = ['S3_ENDPOINT', 'S3_BUCKET', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY']

/**
 * La carpeta donde Payload guarda los archivos de `media` sin R2: ./media, o la que diga
 * MEDIA_STATIC_DIR. Los servidores de las E2E y de Lighthouse la fijan para que cada base de
 * pruebas escriba en la suya (testMediaDir).
 */
export function mediaStaticDir(env: Env = process.env): string {
  return env.MEDIA_STATIC_DIR?.trim() || 'media'
}

/**
 * La carpeta de archivos de una base de pruebas, `media/test/<base>`. Con una ./media común,
 * una base vaciada y sembrada otra vez encontraba los archivos de la ejecución anterior y
 * Payload renombraba cada subida nueva («-1», «-2»…).
 */
export function testMediaDir(databaseUrl: string): string {
  const name = decodeURIComponent(new URL(databaseUrl).pathname.slice(1))
  return `${TEST_ROOT}/${name.replace(/[^A-Za-z0-9_-]/g, '_') || 'postgres'}`
}

/**
 * La carpeta que la siembra de pruebas vacía antes de subir nada: la de una base de pruebas
 * sin ningún registro en `media`, así que todo lo que tiene es de una ejecución anterior.
 * Null si no hay nada que vaciar: archivos en R2, registros en la base, o una carpeta fuera de
 * `media/test/` (nunca ./media, donde pueden estar los archivos de la base de desarrollo).
 */
export function staleTestMediaDir(env: Env, mediaDocs: number): string | null {
  if (mediaDocs > 0 || !env.MEDIA_STATIC_DIR?.trim()) return null
  if (S3_VARIABLES.some((name) => env[name]?.trim())) return null
  const dir = path.resolve(mediaStaticDir(env))
  return path.dirname(dir) === path.resolve(TEST_ROOT) ? dir : null
}
